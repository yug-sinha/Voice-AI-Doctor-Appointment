import { useState, useRef, useCallback, useEffect } from 'react'
import { ConnectionStatus } from '@/types'
import { buildWebSocketUrl, isWebSocketOpen } from '@/utils/websocket'

interface UseWebSocketReturn {
  ws: WebSocket | null
  isConnected: boolean
  connectionStatus: ConnectionStatus
  connect: () => void
  disconnect: () => void
  send: (data: string | Blob | ArrayBuffer) => void
}

export const useWebSocket = (backendUrl?: string): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    if (isWebSocketOpen(wsRef.current)) {
      return
    }

    setConnectionStatus('connecting')

    try {
      const wsUrl = buildWebSocketUrl(backendUrl)
      const ws = new WebSocket(wsUrl)
      // Set binary type to arraybuffer for PCM16 audio chunks
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected successfully!')
        setIsConnected(true)
        setConnectionStatus('connected')
      }

      ws.onclose = (event) => {
        setIsConnected(false)
        setConnectionStatus('disconnected')
        console.log('WebSocket closed:', event.code, event.reason)
        if (event.code !== 1000) {
          console.error('WebSocket closed unexpectedly. Code:', event.code)
        }
      }

      ws.onerror = (error) => {
        setConnectionStatus('error')
        console.error('WebSocket error:', error)
        console.error('Failed to connect to:', wsUrl)
      }
    } catch (error) {
      setConnectionStatus('error')
      console.error('WebSocket connection error:', error)
    }
  }, [backendUrl])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setConnectionStatus('disconnected')
  }, [])

  const send = useCallback((data: string | Blob | ArrayBuffer) => {
    if (isWebSocketOpen(wsRef.current)) {
      wsRef.current!.send(data)
    }
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  // Use state to track ws so components can react to changes
  const [wsState, setWsState] = useState<WebSocket | null>(null)

  useEffect(() => {
    setWsState(wsRef.current)
  }, [isConnected])

  return {
    ws: wsState,
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    send,
  }
}
