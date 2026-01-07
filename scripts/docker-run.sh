#!/bin/bash
# docker-run.sh - Start VS Agent Docker container
# Usage: ./scripts/docker-run.sh <ngrok-subdomain>

NGROK_SUBDOMAIN=$1

if [ -z "$NGROK_SUBDOMAIN" ]; then
  echo "❌ Error: Please provide the ngrok subdomain"
  echo "Usage: ./scripts/docker-run.sh xxxxx"
  echo "       (where xxxxx.ngrok-free.app is your ngrok URL)"
  exit 1
fi

PUBLIC_URL="https://${NGROK_SUBDOMAIN}.ngrok-free.app"
BOT_SERVER_URL="${PUBLIC_URL}"

echo "🐳 Starting VS Agent container..."
echo "📡 Public URL: ${PUBLIC_URL}"
echo "🤖 Bot Server: ${BOT_SERVER_URL}"

docker run -it --rm \
  --name vs-agent \
  -p 3000:3000 \
  -e PUBLIC_BASE_URL="${PUBLIC_URL}" \
  -e MESSAGE_RECEIVED_URL="${BOT_SERVER_URL}/message-received" \
  -e CONNECTION_ESTABLISHED_URL="${BOT_SERVER_URL}/connection-established" \
  -e CALL_ESTABLISHED_URL="${BOT_SERVER_URL}/call-established" \
  -e VERIFIABLE_INFO_RECEIVED_URL="${BOT_SERVER_URL}/verifiable-info-received" \
  -e PROFILE_URL="${BOT_SERVER_URL}/logo.png" \
  -e SERVICE_NAME="LiveAvatar Agent" \
  -e SERVICE_DESCRIPTION="Live AI Avatar powered by HeyGen" \
  ghcr.io/2060-io/vs-agent:latest

echo "🛑 VS Agent stopped"
