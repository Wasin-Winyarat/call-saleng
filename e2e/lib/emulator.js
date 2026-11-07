// คุยกับ Firebase Auth/Firestore emulator ผ่าน REST โดยตรง (ไม่ต้องลง firebase-admin เพิ่ม)
// - Bearer "owner" = สิทธิ์ admin ของ emulator ข้าม Security Rules (ใช้ seed/อ่านผลลัพธ์)
// - Bearer <idToken ของ user> = ถูกตรวจด้วย firestore.rules จริง (ใช้ในเทสต์ security rules)
// ทั้งหมดนี้ยิงเฉพาะ 127.0.0.1 และ project "demo-callsaleng" — ไม่มีทางแตะ production

const PROJECT_ID = 'demo-callsaleng';
const AUTH_HOST = 'http://127.0.0.1:9099';
const FIRESTORE_HOST = 'http://127.0.0.1:8085';
const DOCS_URL = `${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const OWNER = 'owner';

// ---------- แปลงค่า JS <-> Firestore REST Value ----------
function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'object') return { mapValue: { fields: toFields(v) } };
  return { stringValue: String(v) };
}

function toFields(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]));
}

function fromValue(v) {
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('stringValue' in v) return v.stringValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  return v;
}

function fromFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([k, v]) => [k, fromValue(v)]));
}

// ---------- low-level ----------
async function call(method, url, token, body) {
  const res = await fetch(url, {
    method,
    // token null = ไม่ login (ไม่ส่ง Authorization เลย)
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, ok: res.ok, json };
}

function docUrl(path) {
  return `${DOCS_URL}/${path}`;
}

// ---------- reset ----------
async function clearAll() {
  const r1 = await fetch(`${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' });
  const r2 = await fetch(`${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
  if (!r1.ok || !r2.ok) throw new Error(`ล้างข้อมูล emulator ไม่สำเร็จ (firestore ${r1.status}, auth ${r2.status}) — emulator รันอยู่ไหม?`);
}

// ---------- auth ----------
async function signUp(email, password) {
  const res = await fetch(`${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`signUp ${email} ไม่สำเร็จ: ${JSON.stringify(json)}`);
  return { uid: json.localId, idToken: json.idToken };
}

async function signIn(email, password) {
  const res = await fetch(`${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`signIn ${email} ไม่สำเร็จ: ${JSON.stringify(json)}`);
  return { uid: json.localId, idToken: json.idToken };
}

// ---------- firestore (owner = ข้าม rules) ----------
async function setDoc(path, data) {
  const r = await call('PATCH', docUrl(path), OWNER, { fields: toFields(data) });
  if (!r.ok) throw new Error(`setDoc ${path} ไม่สำเร็จ: ${JSON.stringify(r.json)}`);
}

async function getDoc(path) {
  const r = await call('GET', docUrl(path), OWNER);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`getDoc ${path} ไม่สำเร็จ: ${JSON.stringify(r.json)}`);
  return fromFields(r.json.fields);
}

async function listDocs(collection) {
  const r = await call('GET', `${docUrl(collection)}?pageSize=300`, OWNER);
  if (!r.ok) throw new Error(`listDocs ${collection} ไม่สำเร็จ: ${JSON.stringify(r.json)}`);
  return (r.json.documents || []).map((d) => ({ id: d.name.split('/').pop(), ...fromFields(d.fields) }));
}

// ---------- firestore ในนามผู้ใช้ (ถูกตรวจด้วย firestore.rules) — คืน HTTP status ----------
const asUser = {
  get: (token, path) => call('GET', docUrl(path), token),
  // create = เขียน doc id ใหม่ (ต้องยังไม่มีอยู่)
  create: (token, path, data) => call('PATCH', `${docUrl(path)}?currentDocument.exists=false`, token, { fields: toFields(data) }),
  // update เฉพาะ field ที่ให้มา (updateMask) — rules เห็นเป็น allow update
  update: (token, path, data) => {
    const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
    return call('PATCH', `${docUrl(path)}?currentDocument.exists=true&${mask}`, token, { fields: toFields(data) });
  },
  delete: (token, path) => call('DELETE', docUrl(path), token),
  // query แบบ where field == value (ใช้ทดสอบ list rule)
  queryEq: (token, collection, field, value) => call('POST', `${DOCS_URL}:runQuery`, token, {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: toValue(value) } },
    },
  }),
};

module.exports = { PROJECT_ID, clearAll, signUp, signIn, setDoc, getDoc, listDocs, asUser };
