# Local static file server สำหรับรัน webapp/ โดยไม่ต้องมี Node.js / Python
# จำเป็นเพราะ ES module (type="module") ที่ import Firebase SDK จะโดนเบราว์เซอร์บล็อกด้วย CORS ถ้าเปิดผ่าน file:// ตรงๆ
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
