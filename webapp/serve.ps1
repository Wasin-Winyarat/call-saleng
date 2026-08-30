# Local static file server สำหรับรัน webapp/ โดยไม่ต้องมี Node.js / Python
# ไม่บังคับต้องใช้แล้ว — ไฟล์ .html ในโฟลเดอร์นี้เปิดตรงๆ แบบ double-click (file://) ได้เลย
# (ใช้ Firebase compat SDK ผ่าน <script> ธรรมดา ไม่ใช่ ES module ที่โดน CORS บล็อกตอนเปิดผ่าน file://)
# สคริปต์นี้เก็บไว้เผื่ออยากรันผ่าน http:// จริงๆ (เช่น เทส path แบบเดียวกับตอน deploy)
#
# วิธีใช้:
#   powershell -File webapp/serve.ps1
#   แล้วเปิด http://localhost:8080/ (landing page)

param(
  [int]$Port = 8080
)

$dir = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $dir at http://localhost:$Port/  (Ctrl+C to stop)"

$mime = @{
  ".html" = "text/html"
  ".css"  = "text/css"
  ".js"   = "application/javascript"
  ".json" = "application/json"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".svg"  = "image/svg+xml"
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $path = $ctx.Request.Url.LocalPath
    if ($path.EndsWith("/")) { $path = $path + "index.html" }
    $file = Join-Path $dir $path.TrimStart("/")

    if (Test-Path $file -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($file)
      $ctx.Response.ContentType = if ($mime[$ext]) { $mime[$ext] } else { "application/octet-stream" }
      $ctx.Response.Headers.Add("Cache-Control", "no-store")
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
      $ctx.Response.OutputStream.Write($notFound, 0, $notFound.Length)
    }
    $ctx.Response.OutputStream.Close()
  }
} finally {
  $listener.Stop()
}
