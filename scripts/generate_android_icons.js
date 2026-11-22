import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const srcTransparent = path.join(rootDir, 'public/brand/logo-mark-transparent.png')
const srcFullLogo = path.join(rootDir, 'public/brand/logo-full.png')
const assetsDir = path.join(rootDir, 'assets')
const resDir = path.join(rootDir, 'android/app/src/main/res')

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true })
}

async function generate() {
  console.log('Generating high-res Android source assets & mipmaps...')

  if (!fs.existsSync(srcTransparent)) {
    console.error('Source logo not found at:', srcTransparent)
    process.exit(1)
  }

  // 1. Trim transparency around the logo graphic
  const trimmed = await sharp(srcTransparent).trim().toBuffer()

  // 2. Generate assets/icon-background.png (1024x1024 solid #0040FF)
  const bgBuffer = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: '#0040FF',
    },
  })
    .png()
    .toBuffer()
  fs.writeFileSync(path.join(assetsDir, 'icon-background.png'), bgBuffer)

  // 3. Generate assets/icon-foreground.png (1024x1024 transparent, logo scaled to 66% safe zone = 676px)
  const safeSize = 676
  const resizedLogo = await sharp(trimmed)
    .resize(safeSize, safeSize, { fit: 'inside' })
    .toBuffer()

  const fgBuffer = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png()
    .toBuffer()
  fs.writeFileSync(path.join(assetsDir, 'icon-foreground.png'), fgBuffer)

  // 4. Generate assets/icon.png (Composite for Play Store 512 & legacy)
  const iconBuffer = await sharp(bgBuffer)
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png()
    .toBuffer()
  fs.writeFileSync(path.join(assetsDir, 'icon.png'), iconBuffer)

  // 5. Generate assets/splash.png (2732x2732 white with logo centered)
  const splashLogo = await sharp(trimmed)
    .resize(512, 512, { fit: 'inside' })
    .toBuffer()

  const splashBuffer = await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: '#FFFFFF',
    },
  })
    .composite([{ input: splashLogo, gravity: 'center' }])
    .png()
    .toBuffer()
  fs.writeFileSync(path.join(assetsDir, 'splash.png'), splashBuffer)

  // 6. Generate Notification Small Icon (ic_stat_nammooru: 96x96 white silhouette on transparent)
  // Create an SVG bus silhouette
  const busSvg = `<svg width="96" height="96" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="15" rx="3" fill="#FFFFFF"/>
    <rect x="5" y="5" width="14" height="6" rx="1.5" fill="none" stroke="#0040FF" stroke-width="1.5"/>
    <circle cx="7" cy="14" r="1.5" fill="#0040FF"/>
    <circle cx="17" cy="14" r="1.5" fill="#0040FF"/>
    <rect x="5.5" y="18" width="3" height="3" rx="1" fill="#FFFFFF"/>
    <rect x="15.5" y="18" width="3" height="3" rx="1" fill="#FFFFFF"/>
  </svg>`
  const notifIconBuffer = await sharp(Buffer.from(busSvg))
    .resize(96, 96)
    .png()
    .toBuffer()

  const drawableDir = path.join(resDir, 'drawable')
  if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true })
  fs.writeFileSync(path.join(drawableDir, 'ic_stat_nammooru.png'), notifIconBuffer)

  // 7. Write Android Launcher Mipmaps
  const densities = [
    { name: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
    { name: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
    { name: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
    { name: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
    { name: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
  ]

  for (const { name, iconSize, fgSize } of densities) {
    const dir = path.join(resDir, name)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    // Legacy standard square icon
    await sharp(iconBuffer)
      .resize(iconSize, iconSize)
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'))

    // Legacy round icon (circular mask)
    const circleMask = Buffer.from(
      `<svg width="${iconSize}" height="${iconSize}"><circle cx="${iconSize/2}" cy="${iconSize/2}" r="${iconSize/2}" fill="#fff"/></svg>`
    )
    await sharp(iconBuffer)
      .resize(iconSize, iconSize)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'))

    // Adaptive foreground (logo scaled within safe zone of fgSize)
    const innerFgSize = Math.round(fgSize * 0.66)
    const scaledLogo = await sharp(trimmed)
      .resize(innerFgSize, innerFgSize, { fit: 'inside' })
      .toBuffer()

    await sharp({
      create: {
        width: fgSize,
        height: fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: scaledLogo, gravity: 'center' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'))
  }

  // 8. Generate Android Splash screens in drawable and drawable-port-*
  const splashDrawables = [
    { dir: 'drawable', width: 480, height: 800 },
    { dir: 'drawable-port-mdpi', width: 320, height: 480 },
    { dir: 'drawable-port-hdpi', width: 480, height: 800 },
    { dir: 'drawable-port-xhdpi', width: 720, height: 1280 },
    { dir: 'drawable-port-xxhdpi', width: 960, height: 1600 },
    { dir: 'drawable-port-xxxhdpi', width: 1280, height: 1920 },
  ]

  for (const item of splashDrawables) {
    const dir = path.join(resDir, item.dir)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const logoTargetH = Math.min(Math.round(item.height * 0.18), 300)
    const logoLayer = await sharp(trimmed)
      .resize(null, logoTargetH, { fit: 'inside' })
      .toBuffer()

    await sharp({
      create: {
        width: item.width,
        height: item.height,
        channels: 4,
        background: '#FFFFFF',
      },
    })
      .composite([{ input: logoLayer, gravity: 'center' }])
      .png()
      .toFile(path.join(dir, 'splash.png'))
  }

  console.log('✅ Android icons and splash generated successfully!')
}

generate().catch(err => {
  console.error('Failed to generate android icons:', err)
  process.exit(1)
})
