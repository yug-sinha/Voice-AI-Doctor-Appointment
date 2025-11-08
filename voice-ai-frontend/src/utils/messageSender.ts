/**
 * Utility functions for sending messages to the backend WebSocket
 * According to the backend contract, text messages should be sent as:
 * {"type":"text","message":"..."}
 */

/**
 * Send a text message to the backend
 * @param ws - WebSocket connection
 * @param message - Text message to send
 */
export const sendTextMessage = (ws: WebSocket, message: string): void => {
  if (ws.readyState === WebSocket.OPEN) {
    const payload = JSON.stringify({
      type: 'text',
      message: message,
    })
    ws.send(payload)
    console.log('Sent text message:', message)
  } else {
    console.warn('WebSocket not open, cannot send text message. State:', ws.readyState)
  }
}

/**
 * Send an audio chunk to the backend
 * @param ws - WebSocket connection
 * @param audioChunk - Audio chunk as ArrayBuffer or Blob
 */
export const sendAudioChunk = (ws: WebSocket, audioChunk: ArrayBuffer | Blob): void => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(audioChunk)
    const size = audioChunk instanceof Blob ? audioChunk.size : audioChunk.byteLength
    console.log('Sent audio chunk, size:', size, 'bytes')
  } else {
    console.warn('WebSocket not open, cannot send audio chunk. State:', ws.readyState)
  }
}
