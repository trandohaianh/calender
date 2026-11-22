# Placeholder screenshots cho CH Play listing (thay bằng ảnh thật trước khi publish)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function New-Screenshot($w, $h, $label, $path) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(255, 248, 249, 250))
  $g.FillRectangle(
    (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 26, 115, 232))),
    0, 0, $w, 80
  )
  $fontTitle = New-Object System.Drawing.Font('Segoe UI', 28, [System.Drawing.FontStyle]::Bold)
  $fontSub = New-Object System.Drawing.Font('Segoe UI', 18)
  $g.DrawString('MyCalendar', $fontTitle, [System.Drawing.Brushes]::White, 24, 20)
  $g.DrawString($label, $fontSub, [System.Drawing.Brushes]::DarkSlateGray, 24, 120)
  $g.DrawString('Screenshot placeholder', $fontSub,
    (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Gray)), 24, 160)
  $dir = Split-Path $path -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

$root = Split-Path $PSScriptRoot -Parent
$dir = Join-Path $root 'public\screenshots'
New-Screenshot 1080 1920 'Month view' (Join-Path $dir 'month-view.png')
New-Screenshot 1080 1920 'Week view' (Join-Path $dir 'week-view.png')
New-Screenshot 1920 1080 'Desktop' (Join-Path $dir 'desktop.png')
Write-Host 'Screenshots generated in public/screenshots/'
