Add-Type -AssemblyName System.Drawing

$src = "public/brand/logo-mark.png"
if (-not (Test-Path $src)) {
    Write-Error "Source image not found at $src"
    exit 1
}

$srcImg = [System.Drawing.Image]::FromFile((Resolve-Path $src).Path)
$iconsDir = "public/icons"
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null
}

function Create-RoundedPlate([int]$size, [string]$bgColor, [double]$radiusPct, [double]$padPct, [bool]$drawImg = $true) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $radius = [Math]::Max(2, [int]($size * $radiusPct))
    $dia = $radius * 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)

    $path.AddArc($rect.X, $rect.Y, $dia, $dia, 180, 90)
    $path.AddArc($rect.Right - $dia, $rect.Y, $dia, $dia, 270, 90)
    $path.AddArc($rect.Right - $dia, $rect.Bottom - $dia, $dia, $dia, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $dia, $dia, $dia, 90, 90)
    $path.CloseFigure()

    $brushColor = [System.Drawing.ColorTranslator]::FromHtml($bgColor)
    $brush = New-Object System.Drawing.SolidBrush($brushColor)
    $g.FillPath($brush, $path)

    if ($drawImg) {
        $pad = [int]($size * $padPct)
        $destRect = New-Object System.Drawing.Rectangle($pad, $pad, ($size - 2 * $pad), ($size - 2 * $pad))
        $g.DrawImage($srcImg, $destRect)
    }

    $brush.Dispose()
    $path.Dispose()
    $g.Dispose()
    return $bmp
}

# Standard white rounded plate icons: 16, 32, 48, 180, 192, 512
$sizes = @(16, 32, 48, 180, 192, 512)
foreach ($s in $sizes) {
    $bmp = Create-RoundedPlate -size $s -bgColor "#FFFFFF" -radiusPct 0.22 -padPct 0.12
    $outPath = Join-Path $iconsDir "icon-$s.png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Generated $outPath"
    if ($s -eq 32) {
        # Copy to public/favicon.png
        $bmp.Save("public/favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
    }
    $bmp.Dispose()
}

# Maskable 512x512 on #0040FF background with mark centered in safe zone (20% padding)
$maskBmp = Create-RoundedPlate -size 512 -bgColor "#0040FF" -radiusPct 0.0 -padPct 0.20
$maskBmp.Save((Join-Path $iconsDir "icon-maskable-512.png"), [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Generated public/icons/icon-maskable-512.png"
$maskBmp.Dispose()

# Create favicon.ico using 32x32 bitmap
$icoBmp = Create-RoundedPlate -size 32 -bgColor "#FFFFFF" -radiusPct 0.22 -padPct 0.12
$hIcon = $icoBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.File]::OpenWrite("public/favicon.ico")
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$icoBmp.Dispose()
Write-Host "Generated public/favicon.ico"

# Create SVG fallback favicon.svg
$logoBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $src).Path)
$logoB64 = [Convert]::ToBase64String($logoBytes)
$svgContent = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <rect width="100" height="100" rx="22" fill="#FFFFFF"/>
  <image href="data:image/png;base64,$logoB64" x="12" y="12" width="76" height="76" preserveAspectRatio="xMidYMid meet"/>
</svg>
"@
Set-Content -Path "public/favicon.svg" -Value $svgContent -Encoding utf8
Write-Host "Generated public/favicon.svg"

$srcImg.Dispose()
Write-Host "All icons generated successfully!"
