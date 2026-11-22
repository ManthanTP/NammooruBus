import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const srcTransparent = path.join(rootDir, 'public/brand/logo-mark-transparent.png')
const iconsDir = path.join(rootDir, 'public/icons')

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

/**
 * Builds a multi-resolution Windows ICO buffer embedding PNG data.
 */
function createIco(pngBuffers) {
  const count = pngBuffers.length
  const headerLen = 6
  const dirEntryLen = 16
  let offset = headerLen + dirEntryLen * count

  const header = Buffer.alloc(headerLen)
  header.writeUInt16LE(0, 0) // Reserved
  header.writeUInt16LE(1, 2) // Type: 1 for ICO
  header.writeUInt16LE(count, 4) // Number of images

  const dirEntries = []
  for (const { buffer, size } of pngBuffers) {
    const entry = Buffer.alloc(dirEntryLen)
    entry.writeUInt8(size >= 256 ? 0 : size, 0) // Width
    entry.writeUInt8(size >= 256 ? 0 : size, 1) // Height
    entry.writeUInt8(0, 2) // Color count (0 for 256+ colors)
    entry.writeUInt8(0, 3) // Reserved
    entry.writeUInt16LE(1, 4) // Color planes
    entry.writeUInt16LE(32, 6) // Bits per pixel
    entry.writeUInt32LE(buffer.length, 8) // Image size in bytes
    entry.writeUInt32LE(offset, 12) // Image offset
    dirEntries.push(entry)
    offset += buffer.length
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map(p => p.buffer)])
}

async function run() {
  console.log('Generating icons from transparent logo mark...')
  if (!fs.existsSync(srcTransparent)) {
    console.error('Source transparent logo not found:', srcTransparent)
    process.exit(1)
  }

  // 1. Trim transparent padding tight to the logo graphic
  const trimmed = sharp(srcTransparent).trim()
  const trimmedBuffer = await trimmed.toBuffer()

  // Standard sizes to generate
  const sizes = [16, 32, 48, 180, 192, 512]
  const pngBuffersForIco = []

  for (const size of sizes) {
    // Crop tight with 2% margin to avoid anti-aliasing edge clipping
    const innerSize = Math.max(12, Math.round(size * 0.96))
    const resizedInner = await sharp(trimmedBuffer)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer()

    const finalBuf = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resizedInner, gravity: 'center' }])
      .png()
      .toBuffer()

    const outPath = path.join(iconsDir, `icon-${size}.png`)
    fs.writeFileSync(outPath, finalBuf)
    console.log(`Generated: public/icons/icon-${size}.png`)

    if ([16, 32, 48].includes(size)) {
      pngBuffersForIco.push({ buffer: finalBuf, size })
    }
    if (size === 32) {
      fs.writeFileSync(path.join(rootDir, 'public/favicon.png'), finalBuf)
    }
    if (size === 180) {
      fs.writeFileSync(path.join(rootDir, 'public/apple-touch-icon.png'), finalBuf)
    }
  }

  // 2. Generate maskable 512 with cobalt (#0040FF) background and 80% safe zone logo
  const maskableInnerSize = Math.round(512 * 0.8) // 80% safe zone for PWA maskable
  const resizedMaskableInner = await sharp(trimmedBuffer)
    .resize(maskableInnerSize, maskableInnerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  const maskable512 = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 64, b: 255, alpha: 1 }, // #0040FF
    },
  })
    .composite([{ input: resizedInner => resizedMaskableInner, input: resizedMaskableInner, gravity: 'center' }])
    .png()
    .toBuffer()

  fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), maskable512)
  console.log('Generated: public/icons/icon-maskable-512.png')

  // 3. Generate favicon.ico with 16, 32, 48
  const icoBuf = createIco(pngBuffersForIco)
  fs.writeFileSync(path.join(rootDir, 'public/favicon.ico'), icoBuf)
  console.log('Generated: public/favicon.ico')

  // 4. Generate scalable favicon.svg
  const base64_192 = fs.readFileSync(path.join(iconsDir, 'icon-192.png')).toString('base64')
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <image width="512" height="512" href="data:image/png;base64,${base64_192}"/>
</svg>
`
  fs.writeFileSync(path.join(rootDir, 'public/favicon.svg'), svgContent)
  console.log('Generated: public/favicon.svg')

  console.log('All icons generated successfully!')
}

run().catch((err) => {
  console.error('Error generating icons:', err)
  process.exit(1)
})
