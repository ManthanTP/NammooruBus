import https from 'https'

function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n
  )
  return { x, y, z: zoom }
}

const centerLat = 15.3647
const centerLng = 75.124

// 10 tile coordinates across z14, z15, z16 around Hubballi
const testTiles = [
  latLngToTile(centerLat, centerLng, 14),
  latLngToTile(centerLat + 0.01, centerLng, 14),
  latLngToTile(centerLat, centerLng + 0.01, 14),
  latLngToTile(centerLat, centerLng, 15),
  latLngToTile(centerLat + 0.005, centerLng, 15),
  latLngToTile(centerLat, centerLng + 0.005, 15),
  latLngToTile(centerLat - 0.005, centerLng, 15),
  latLngToTile(centerLat, centerLng, 16),
  latLngToTile(centerLat + 0.003, centerLng, 16),
  latLngToTile(centerLat, centerLng + 0.003, 16),
]

function fetchTile(url) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'NammooruBus-Benchmark/1.0 (contact@nammoorubus.in)',
        },
        timeout: 10000,
      },
      (res) => {
        let bytes = 0
        res.on('data', (chunk) => {
          bytes += chunk.length
        })
        res.on('end', () => {
          const duration = Date.now() - start
          resolve({ duration, statusCode: res.statusCode, bytes })
        })
      }
    )
    req.on('error', (err) => reject(err))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Timeout'))
    })
  })
}

async function benchmarkProvider(name, urlTemplate) {
  console.log(`\nBenchmarking ${name} (${testTiles.length} tiles around Hubballi)...`)
  const latencies = []
  let successCount = 0

  for (let i = 0; i < testTiles.length; i++) {
    const t = testTiles[i]
    const url = urlTemplate
      .replace('{z}', t.z)
      .replace('{x}', t.x)
      .replace('{y}', t.y)

    try {
      const res = await fetchTile(url)
      latencies.push(res.duration)
      successCount++
      console.log(`  [${i + 1}/${testTiles.length}] ${res.duration}ms (status: ${res.statusCode}, ${res.bytes} bytes)`)
    } catch (err) {
      console.error(`  [${i + 1}/${testTiles.length}] FAILED: ${err.message}`)
    }
  }

  latencies.sort((a, b) => a - b)
  const median =
    latencies.length % 2 === 0
      ? (latencies[latencies.length / 2 - 1] + latencies[latencies.length / 2]) / 2
      : latencies[Math.floor(latencies.length / 2)]
  const min = latencies[0] || 0
  const max = latencies[latencies.length - 1] || 0
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1))

  return { name, successCount, total: testTiles.length, median, min, max, avg, latencies }
}

async function main() {
  const osmUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  const hotUrl = 'https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'

  const osmResult = await benchmarkProvider('OSM Standard (tile.openstreetmap.org)', osmUrl)
  const hotResult = await benchmarkProvider('Humanitarian HOT (tile.openstreetmap.fr/hot)', hotUrl)

  console.log('\n======================================================')
  console.log('BENCHMARK SUMMARY (10 Hubballi tiles at z14-z16):')
  console.log('======================================================')
  console.log(`1. OSM Standard:`)
  console.log(`   - Success: ${osmResult.successCount}/${osmResult.total}`)
  console.log(`   - Median: ${osmResult.median} ms`)
  console.log(`   - Range:  ${osmResult.min} ms - ${osmResult.max} ms (Avg: ${osmResult.avg} ms)`)
  console.log(`2. OSM Humanitarian HOT:`)
  console.log(`   - Success: ${hotResult.successCount}/${hotResult.total}`)
  console.log(`   - Median: ${hotResult.median} ms`)
  console.log(`   - Range:  ${hotResult.min} ms - ${hotResult.max} ms (Avg: ${hotResult.avg} ms)`)
  console.log('------------------------------------------------------')
  if (osmResult.median < hotResult.median) {
    const factor = (hotResult.median / (osmResult.median || 1)).toFixed(1)
    console.log(`🏆 WINNER: OSM Standard is ${factor}x FASTER (${osmResult.median} ms vs ${hotResult.median} ms).`)
  } else {
    const factor = (osmResult.median / (hotResult.median || 1)).toFixed(1)
    console.log(`🏆 WINNER: OSM HOT is ${factor}x FASTER (${hotResult.median} ms vs ${osmResult.median} ms).`)
  }
}

main().catch(console.error)
