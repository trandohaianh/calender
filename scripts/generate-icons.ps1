# Tạo icon PNG cho PWA (chạy trên Windows)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function New-CalendarIcon($size, $path) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::FromArgb(255, 26, 115, 232))
  $font = New-Object System.Drawing.Font('Segoe UI', [int]($size * 0.22), [System.Drawing.FontStyle]::Bold)
  $brush = [System.Drawing.Brushes]::White
  $text = '31'
  $sizeF = $g.MeasureString($text, $font)
  $g.DrawString($text, $font, $brush, ($size - $sizeF.Width) / 2, ($size - $sizeF.Height) / 2)
  $dir = Split-Path $path -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

$root = Split-Path $PSScriptRoot -Parent
$icons = Join-Path $root 'public\icons'
New-CalendarIcon 192 (Join-Path $icons 'icon-192.png')
New-CalendarIcon 512 (Join-Path $icons 'icon-512.png')
New-CalendarIcon 512 (Join-Path $icons 'icon-512-maskable.png')
Write-Host 'Icons generated in public/icons/'
