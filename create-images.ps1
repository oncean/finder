$imgDir = "c:\Users\27203\Downloads\finder-main\miniprogram\static\images"

$shopPng = [byte[]]@(137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,100,0,0,0,100,8,2,0,0,0,151,136,189,79,0,0,0,29,73,68,65,84,8,215,99,100,248,255,255,63,0,5,254,2,254,161,49,170,65,132,0,0,0,0,73,69,78,68,174,66,96,130)
[System.IO.File]::WriteAllBytes("$imgDir\default-shop.png", $shopPng)

Add-Type -AssemblyName System.Drawing
$avatarPath = "$imgDir\default-avatar.png"
$avatarBmp = New-Object System.Drawing.Bitmap 100, 100
$avatarGraphics = [System.Drawing.Graphics]::FromImage($avatarBmp)
$avatarGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$avatarGraphics.Clear([System.Drawing.Color]::Transparent)
$avatarBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(101, 163, 13))
$avatarFg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$avatarGraphics.FillEllipse($avatarBg, 0, 0, 100, 100)
$avatarGraphics.FillEllipse($avatarFg, 35, 22, 30, 30)
$avatarGraphics.FillEllipse($avatarFg, 22, 58, 56, 42)
$avatarBmp.Save($avatarPath, [System.Drawing.Imaging.ImageFormat]::Png)
$avatarGraphics.Dispose()
$avatarBmp.Dispose()
$avatarBg.Dispose()
$avatarFg.Dispose()

$feedPng = [byte[]]@(137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,100,0,0,0,100,8,2,0,0,0,151,136,189,79,0,0,0,29,73,68,65,84,8,215,99,100,248,255,255,63,0,5,254,2,254,161,49,170,65,132,0,0,0,0,73,69,78,68,174,66,96,130)
[System.IO.File]::WriteAllBytes("$imgDir\default-feed.png", $feedPng)

Get-ChildItem $imgDir
