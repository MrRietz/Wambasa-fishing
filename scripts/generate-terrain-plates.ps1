Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $repoRoot 'public/assets/processed/g9-terrain'
$runtimePropDir = Join-Path $repoRoot 'public/assets/runtime/g8-production/terrain-props'

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
New-Item -ItemType Directory -Force -Path $runtimePropDir | Out-Null

function New-QualityGraphics([System.Drawing.Graphics] $graphics) {
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
}

function New-Canvas([int] $Width, [int] $Height) {
  $bitmap = [System.Drawing.Bitmap]::new($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  New-QualityGraphics $graphics
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Save-Canvas($Canvas, [string] $Name) {
  $outputPath = Join-Path $outputDir $Name
  $Canvas.Bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $Canvas.Graphics.Dispose()
  $Canvas.Bitmap.Dispose()
}

function Save-CanvasToPath($Canvas, [string] $OutputPath) {
  $Canvas.Bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $Canvas.Graphics.Dispose()
  $Canvas.Bitmap.Dispose()
}

function Add-NoiseEllipses {
  param(
    $Canvas,
    [int] $Count,
    [System.Drawing.Color[]] $Palette,
    [int] $MinRadius,
    [int] $MaxRadius,
    [int] $Seed
  )

  $random = [System.Random]::new($Seed)
  for ($index = 0; $index -lt $Count; $index += 1) {
    $radiusX = $random.Next($MinRadius, $MaxRadius)
    $radiusY = $random.Next([Math]::Max(8, [int]($MinRadius * 0.55)), [Math]::Max($MinRadius + 1, [int]($MaxRadius * 0.9)))
    $x = $random.Next(-$radiusX, $Canvas.Bitmap.Width)
    $y = $random.Next(-$radiusY, $Canvas.Bitmap.Height)
    $color = $Palette[$random.Next(0, $Palette.Length)]
    $brush = [System.Drawing.SolidBrush]::new($color)
    $Canvas.Graphics.FillEllipse($brush, $x, $y, $radiusX * 2, $radiusY * 2)
    $brush.Dispose()
  }
}

function Add-Reeds {
  param($Canvas, [int] $Seed)
  $random = [System.Random]::new($Seed)
  for ($index = 0; $index -lt 70; $index += 1) {
    $x = $random.Next(0, $Canvas.Bitmap.Width)
    $height = $random.Next(20, 68)
    $y = $random.Next([int]($Canvas.Bitmap.Height * 0.26), [int]($Canvas.Bitmap.Height * 0.84))
    $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb($random.Next(70, 120), 164, 171, 110), $random.Next(2, 4))
    $Canvas.Graphics.DrawLine($pen, $x, $y, $x + $random.Next(-8, 9), $y + $height)
    $pen.Dispose()
  }
}

function Write-WaterPlate {
  $canvas = New-Canvas 2048 768
  $rect = [System.Drawing.Rectangle]::new(0, 0, $canvas.Bitmap.Width, $canvas.Bitmap.Height)
  $gradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $rect,
    [System.Drawing.Color]::FromArgb(255, 36, 91, 109),
    [System.Drawing.Color]::FromArgb(255, 15, 53, 71),
    90.0
  )
  $canvas.Graphics.FillRectangle($gradient, $rect)
  $gradient.Dispose()

  Add-NoiseEllipses -Canvas $canvas -Count 90 -Palette @(
    [System.Drawing.Color]::FromArgb(28, 165, 214, 221),
    [System.Drawing.Color]::FromArgb(22, 208, 238, 239),
    [System.Drawing.Color]::FromArgb(18, 102, 160, 175)
  ) -MinRadius 60 -MaxRadius 240 -Seed 1103

  for ($index = 0; $index -lt 18; $index += 1) {
    $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(30, 228, 245, 242), 3)
    $y = 38 + $index * 40
    $canvas.Graphics.DrawArc($pen, -120 + ($index % 3) * 80, $y, 2300, 90, 0, 180)
    $pen.Dispose()
  }

  Save-Canvas $canvas 'terrain-water-plate-v1.png'
}

function Write-ShorelinePlate {
  $canvas = New-Canvas 2048 384
  $rect = [System.Drawing.Rectangle]::new(0, 0, $canvas.Bitmap.Width, $canvas.Bitmap.Height)
  $gradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $rect,
    [System.Drawing.Color]::FromArgb(255, 214, 197, 156),
    [System.Drawing.Color]::FromArgb(255, 121, 98, 68),
    90.0
  )
  $canvas.Graphics.FillRectangle($gradient, $rect)
  $gradient.Dispose()

  Add-NoiseEllipses -Canvas $canvas -Count 120 -Palette @(
    [System.Drawing.Color]::FromArgb(34, 235, 228, 210),
    [System.Drawing.Color]::FromArgb(24, 179, 158, 121),
    [System.Drawing.Color]::FromArgb(20, 95, 76, 54)
  ) -MinRadius 24 -MaxRadius 110 -Seed 2207

  for ($index = 0; $index -lt 9; $index += 1) {
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(50, 243, 238, 223))
    $y = 26 + $index * 34
    $points = [System.Drawing.Point[]] @(
      [System.Drawing.Point]::new(-30, $y + 12),
      [System.Drawing.Point]::new(260, $y - 2),
      [System.Drawing.Point]::new(540, $y + 18),
      [System.Drawing.Point]::new(860, $y),
      [System.Drawing.Point]::new(1180, $y + 20),
      [System.Drawing.Point]::new(1490, $y + 6),
      [System.Drawing.Point]::new(1810, $y + 22),
      [System.Drawing.Point]::new(2080, $y + 10),
      [System.Drawing.Point]::new(2080, $y + 34),
      [System.Drawing.Point]::new(-30, $y + 36)
    )
    $canvas.Graphics.FillPolygon($brush, $points)
    $brush.Dispose()
  }

  Save-Canvas $canvas 'terrain-shoreline-plate-v1.png'
}

function Write-LandPlate {
  $canvas = New-Canvas 2048 1280
  $rect = [System.Drawing.Rectangle]::new(0, 0, $canvas.Bitmap.Width, $canvas.Bitmap.Height)
  $gradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $rect,
    [System.Drawing.Color]::FromArgb(255, 82, 103, 76),
    [System.Drawing.Color]::FromArgb(255, 34, 53, 39),
    90.0
  )
  $canvas.Graphics.FillRectangle($gradient, $rect)
  $gradient.Dispose()

  Add-NoiseEllipses -Canvas $canvas -Count 220 -Palette @(
    [System.Drawing.Color]::FromArgb(24, 122, 148, 104),
    [System.Drawing.Color]::FromArgb(18, 164, 153, 117),
    [System.Drawing.Color]::FromArgb(24, 63, 82, 58),
    [System.Drawing.Color]::FromArgb(14, 101, 90, 63)
  ) -MinRadius 32 -MaxRadius 180 -Seed 3301

  for ($index = 0; $index -lt 14; $index += 1) {
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(26, 188, 177, 138))
    $y = 120 + $index * 74
    $points = [System.Drawing.Point[]] @(
      [System.Drawing.Point]::new(-40, $y + 44),
      [System.Drawing.Point]::new(180, $y + 4),
      [System.Drawing.Point]::new(360, $y + 40),
      [System.Drawing.Point]::new(620, $y - 6),
      [System.Drawing.Point]::new(900, $y + 50),
      [System.Drawing.Point]::new(1240, $y + 8),
      [System.Drawing.Point]::new(1480, $y + 54),
      [System.Drawing.Point]::new(1760, $y + 22),
      [System.Drawing.Point]::new(2080, $y + 66),
      [System.Drawing.Point]::new(2080, $y + 120),
      [System.Drawing.Point]::new(-40, $y + 116)
    )
    $canvas.Graphics.FillPolygon($brush, $points)
    $brush.Dispose()
  }

  Add-Reeds -Canvas $canvas -Seed 4409
  Save-Canvas $canvas 'terrain-land-plate-v1.png'
}

function Write-ForestProp {
  $canvas = New-Canvas 384 320
  $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(36, 8, 18, 14))
  $canvas.Graphics.FillEllipse($shadowBrush, 26, 228, 320, 56)
  $shadowBrush.Dispose()
  foreach ($spec in @(
    @{ X = 92; Y = 126; R = 74; C = [System.Drawing.Color]::FromArgb(230, 54, 84, 66) },
    @{ X = 184; Y = 98; R = 92; C = [System.Drawing.Color]::FromArgb(236, 62, 98, 75) },
    @{ X = 268; Y = 138; R = 68; C = [System.Drawing.Color]::FromArgb(228, 49, 75, 58) }
  )) {
    $brush = [System.Drawing.SolidBrush]::new($spec.C)
    $canvas.Graphics.FillEllipse($brush, $spec.X - $spec.R, $spec.Y - $spec.R, $spec.R * 2, $spec.R * 2)
    $brush.Dispose()
  }
  foreach ($trunkX in @(118, 184, 248)) {
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(212, 86, 62, 43))
    $canvas.Graphics.FillRectangle($brush, $trunkX, 160, 16, 88)
    $brush.Dispose()
  }
  Save-CanvasToPath $canvas (Join-Path $runtimePropDir 'forest-v1.png')
}

function Write-RocksProp {
  $canvas = New-Canvas 352 260
  $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(28, 10, 14, 12))
  $canvas.Graphics.FillEllipse($shadowBrush, 34, 190, 286, 42)
  $shadowBrush.Dispose()
  foreach ($spec in @(
    @{ X = 80; Y = 142; W = 94; H = 70; C = [System.Drawing.Color]::FromArgb(236, 102, 111, 106) },
    @{ X = 164; Y = 120; W = 120; H = 92; C = [System.Drawing.Color]::FromArgb(240, 118, 128, 122) },
    @{ X = 236; Y = 150; W = 88; H = 62; C = [System.Drawing.Color]::FromArgb(234, 88, 97, 93) }
  )) {
    $brush = [System.Drawing.SolidBrush]::new($spec.C)
    $canvas.Graphics.FillEllipse($brush, $spec.X, $spec.Y, $spec.W, $spec.H)
    $brush.Dispose()
  }
  Save-CanvasToPath $canvas (Join-Path $runtimePropDir 'rocks-v1.png')
}

function Write-RidgeProp {
  $canvas = New-Canvas 448 288
  $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(236, 92, 107, 88))
  $points = [System.Drawing.Point[]] @(
    [System.Drawing.Point]::new(14, 244), [System.Drawing.Point]::new(68, 170), [System.Drawing.Point]::new(132, 196),
    [System.Drawing.Point]::new(208, 122), [System.Drawing.Point]::new(270, 186), [System.Drawing.Point]::new(338, 94),
    [System.Drawing.Point]::new(414, 156), [System.Drawing.Point]::new(434, 244)
  )
  $canvas.Graphics.FillPolygon($brush, $points)
  $brush.Dispose()
  Save-CanvasToPath $canvas (Join-Path $runtimePropDir 'ridge-v1.png')
}

function Write-CliffProp {
  $canvas = New-Canvas 416 320
  $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(242, 109, 93, 71))
  $points = [System.Drawing.Point[]] @(
    [System.Drawing.Point]::new(18, 272), [System.Drawing.Point]::new(20, 92), [System.Drawing.Point]::new(82, 58),
    [System.Drawing.Point]::new(144, 110), [System.Drawing.Point]::new(222, 44), [System.Drawing.Point]::new(296, 124),
    [System.Drawing.Point]::new(392, 76), [System.Drawing.Point]::new(396, 272)
  )
  $canvas.Graphics.FillPolygon($brush, $points)
  $brush.Dispose()
  Save-CanvasToPath $canvas (Join-Path $runtimePropDir 'cliff-v1.png')
}

function Write-MarshProp {
  $canvas = New-Canvas 420 260
  $poolBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(186, 58, 92, 86))
  $canvas.Graphics.FillEllipse($poolBrush, 74, 132, 122, 54)
  $canvas.Graphics.FillEllipse($poolBrush, 182, 108, 150, 64)
  $poolBrush.Dispose()
  for ($index = 0; $index -lt 18; $index += 1) {
    $x = 34 + $index * 18
    $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(180, 154, 164, 108), 3)
    $canvas.Graphics.DrawLine($pen, $x, 78 + ($index % 4) * 8, $x + (($index % 3) - 1) * 5, 182 + ($index % 2) * 16)
    $pen.Dispose()
  }
  Save-CanvasToPath $canvas (Join-Path $runtimePropDir 'marsh-v1.png')
}

Write-WaterPlate
Write-ShorelinePlate
Write-LandPlate
Write-ForestProp
Write-RocksProp
Write-RidgeProp
Write-CliffProp
Write-MarshProp
