import express from 'express'
import path from 'path'
import { HealthController, MessageController, ConnectionController } from './controllers'
import { liveAvatarService } from './services'
import { getAppConfig } from './config'

const app = express()
const config = getAppConfig()
const port = config.port

// Initialize controllers
const messageController = new MessageController()
const connectionController = new ConnectionController()

// Middleware
app.use(express.json())
app.use(express.static(path.join(__dirname, '../public')))

// API Routes
app.get('/health', HealthController.getHealth)
app.post('/message-received', (req, res) => messageController.handleMessageReceived(req, res))
app.post('/connection-established', (req, res) =>
  connectionController.handleConnectionEstablished(req, res)
)

// API endpoint for session token (used by avatar frontend)
app.post('/api/session', async (req, res) => {
  try {
    if (!liveAvatarService.isConfigured()) {
      res.status(500).json({ error: 'LiveAvatar not configured. Please set API credentials.' })
      return
    }
    const session = await liveAvatarService.createSessionToken()
    res.json(session)
  } catch (error) {
    console.error('❌ Error creating session:', error)
    res.status(500).json({ error: (error as Error).message })
  }
})

// API endpoint to start session (get LiveKit credentials)
app.post('/api/session/start', async (req, res) => {
  try {
    const { sessionToken } = req.body
    if (!sessionToken) {
      res.status(400).json({ error: 'sessionToken is required' })
      return
    }
    const sessionInfo = await liveAvatarService.startSession(sessionToken)
    res.json(sessionInfo)
  } catch (error) {
    console.error('❌ Error starting session:', error)
    res.status(500).json({ error: (error as Error).message })
  }
})

// Serve avatar page
app.get('/avatar', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/avatar.html'))
})

// Invitation page (for QR code)
app.get('/invitation', async (req, res) => {
  try {
    // Fetch the invitation URL from VS Agent
    const response = await fetch(`${config.vsAgentUrl}/v1/invitation`)
    const data = (await response.json()) as { url?: string }

    if (data.url) {
      // Create a nice HTML page with QR code
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connect with LiveAvatar Agent</title>
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 24px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            max-width: 400px;
        }
        h1 { font-size: 1.8rem; margin-bottom: 8px; }
        p { color: rgba(255, 255, 255, 0.7); margin-bottom: 24px; }
        #qrcode {
            background: white;
            padding: 20px;
            border-radius: 16px;
            display: inline-block;
            margin-bottom: 24px;
        }
        .instructions {
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.6);
        }
        .instructions li { margin: 8px 0; text-align: left; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎭 LiveAvatar Agent</h1>
        <p>Scan this QR code with Hologram app</p>
        <div id="qrcode"></div>
        <ol class="instructions">
            <li>Open Hologram app on your phone</li>
            <li>Tap the scan button</li>
            <li>Point your camera at this QR code</li>
            <li>Start chatting!</li>
        </ol>
    </div>
    <script>
        QRCode.toCanvas(document.createElement('canvas'), ${JSON.stringify(data.url)}, { width: 256, margin: 0 }, function(error, canvas) {
            if (error) console.error(error);
            document.getElementById('qrcode').appendChild(canvas);
        });
    </script>
</body>
</html>`
      res.send(html)
    } else {
      res.status(500).send('Failed to get invitation URL')
    }
  } catch (error) {
    console.error('❌ Error fetching invitation:', error)
    res.status(500).send(`Error fetching invitation: ${(error as Error).message}`)
  }
})

// API endpoint to get invitation URL as JSON
app.get('/api/invitation', async (req, res) => {
  try {
    const response = await fetch(`${config.vsAgentUrl}/v1/invitation`)
    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error('❌ Error fetching invitation:', error)
    res.status(500).json({ error: (error as Error).message })
  }
})

// Start server
app.listen(port, () => {
  console.log(`
🎭 ═══════════════════════════════════════════════════════════
   LiveAvatar Agent for Hologram
═══════════════════════════════════════════════════════════

📡 Server:     http://localhost:${port}
🔗 VS Agent:   ${config.vsAgentUrl}
🌐 Public:     ${config.publicUrl}

🔧 Configuration:
   • LiveAvatar API: ${liveAvatarService.isConfigured() ? '✅ Configured' : '❌ Not configured'}
   
📋 Endpoints:
   • GET  /health       - Health check
   • GET  /avatar       - Avatar UI page
   • GET  /invitation   - Connection QR code
   • POST /api/session  - Create avatar session

💡 To connect: Open ${config.publicUrl}/invitation in browser
═══════════════════════════════════════════════════════════
  `)
})

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...')
  process.exit(0)
})
