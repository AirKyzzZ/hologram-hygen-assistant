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
app.post('/connection-established', (req, res) => connectionController.handleConnectionEstablished(req, res))

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
app.get('/invitation', (req, res) => {
    const connectionUrl = `${config.vsAgentUrl}/v1/invitation`
    res.redirect(connectionUrl)
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
