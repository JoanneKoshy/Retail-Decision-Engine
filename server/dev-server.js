// Local chat server. Run from the dashboard folder with: npm run server
import http from 'node:http'
import { chat } from './chat-core.js'

const PORT = 8787

http
  .createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/api/chat') {
      res.writeHead(404).end()
      return
    }
    let body = ''
    req.on('data', (c) => { body += c; if (body.length > 100_000) req.destroy() })
    req.on('end', async () => {
      try {
        const { messages } = JSON.parse(body || '{}')
        const out = await chat(messages)
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(out))
      } catch (e) {
        console.error(e.message)
        res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: e.message }))
      }
    })
  })
  .listen(PORT, () => console.log(`Chat server running on http://localhost:${PORT}`))
