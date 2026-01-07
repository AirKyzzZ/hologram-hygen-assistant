import { Request, Response } from 'express'
import { ConnectionEstablishedDto } from '../dto'
import { getAppConfig } from '../config'
import { liveAvatarService } from '../services'

/**
 * Connection controller - handles new user connections
 */
export class ConnectionController {
    /**
     * POST /connection-established - Handle new connections from VS Agent
     * Sends welcome message with avatar link
     */
    async handleConnectionEstablished(req: Request, res: Response): Promise<void> {
        try {
            const body = req.body as ConnectionEstablishedDto
            const connectionId = body.connectionId

            console.log(`🤝 New connection established: ${connectionId}`)

            const config = getAppConfig()
            const avatarLink = `${config.publicUrl}/avatar`

            // Check if LiveAvatar is properly configured
            const isConfigured = liveAvatarService.isConfigured()

            // Build welcome message
            const welcomeMessage = isConfigured
                ? `👋 Welcome! I'm your Live Avatar assistant.\n\nTap the link below to start a video conversation with me!`
                : `👋 Welcome! The Live Avatar demo is not fully configured yet. Please set up your HeyGen API credentials.`

            // Send welcome text message
            await this.sendMessage(connectionId, {
                type: 'text',
                connectionId,
                content: welcomeMessage,
            })

            // If configured, send the avatar link as a media message
            if (isConfigured) {
                await this.sendMessage(connectionId, {
                    type: 'media',
                    connectionId,
                    items: [
                        {
                            mimeType: 'text/html',
                            uri: avatarLink,
                            title: '🎭 Start Live Avatar',
                            description: 'Tap to start a video conversation',
                            openingMode: 'fullScreen',
                        },
                    ],
                })
                console.log(`✅ Sent avatar link to connection ${connectionId}`)
            }

            res.status(200).json({ success: true })
        } catch (error) {
            console.error('❌ Error handling connection:', error)
            res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * Send a message via VS Agent
     */
    private async sendMessage(connectionId: string, message: object): Promise<void> {
        const vsAgentUrl = getAppConfig().vsAgentUrl
        const response = await fetch(`${vsAgentUrl}/v1/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message),
        })

        if (!response.ok) {
            console.error(`❌ Failed to send message: ${response.statusText}`)
        }
    }
}
