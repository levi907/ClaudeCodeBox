import express from 'express'
import fetch from 'node-fetch'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const app = express()
const PORT = process.env.PORT || 3001
const __dirname = dirname(fileURLToPath(import.meta.url))

app.use(express.json())

// Proxy CubeCobra cube JSON download
app.get('/api/cube/:cubeId', async (req, res) => {
  const { cubeId } = req.params
  const url = `https://cubecobra.com/cube/download/json/${encodeURIComponent(cubeId)}`
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CubeArchetypeVisualizer/1.0',
        Accept: 'application/json, text/plain, */*',
      },
    })
    if (!response.ok) {
      const text = await response.text()
      return res.status(response.status).json({
        error: `CubeCobra returned ${response.status} for cube "${cubeId}": ${text.slice(0, 200)}`,
      })
    }
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data = await response.json()
      return res.json(data)
    }
    // CubeCobra sometimes returns newline-delimited JSON or plain text card names
    const text = await response.text()
    return res.json({ raw: text })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Proxy Scryfall collection endpoint (batch card lookup, up to 75 per request)
app.post('/api/scryfall/collection', async (req, res) => {
  const { identifiers } = req.body
  if (!Array.isArray(identifiers) || identifiers.length === 0) {
    return res.status(400).json({ error: 'identifiers array required' })
  }

  // Chunk into batches of 75 (Scryfall limit)
  const chunks = []
  for (let i = 0; i < identifiers.length; i += 75) {
    chunks.push(identifiers.slice(i, i + 75))
  }

  try {
    const results = await Promise.all(
      chunks.map((chunk) =>
        fetch('https://api.scryfall.com/cards/collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifiers: chunk }),
        }).then((r) => r.json())
      )
    )
    const cards = results.flatMap((r) => r.data || [])
    const notFound = results.flatMap((r) => r.not_found || [])
    res.json({ data: cards, not_found: notFound })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Always serve the built frontend (run `npm run build` first)
app.use(express.static(join(__dirname, 'dist')))
app.get('*', (_, res) => {
  const indexPath = join(__dirname, 'dist', 'index.html')
  if (existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(503).send('Frontend not built. Run: npm run build')
  }
})

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
