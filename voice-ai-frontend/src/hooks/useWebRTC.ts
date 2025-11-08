/**
 * Optional WebRTC hook for peer-to-peer audio communication
 * This is an alternative to WebSocket streaming
 * 
 * Note: This uses native WebRTC APIs - no npm package required!
 * For simpler usage, consider: npm install simple-peer
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { ConnectionStatus } from '@/types'

interface UseWebRTCReturn {
  isConnected: boolean
  connectionStatus: ConnectionStatus
  connect: (signalingServer: string) => void
  disconnect: () => void
  startAudio: () => Promise<void>
  stopAudio: () => void
  localStream: MediaStream | null
  remoteStream: MediaStream | null
}

export const useWebRTC = (): UseWebRTCReturn => {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const signalingWsRef = useRef<WebSocket | null>(null)

  const connect = useCallback((signalingServer: string) => {
    if (signalingWsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setConnectionStatus('connecting')

    try {
      // WebSocket for signaling (offer/answer exchange)
      const ws = new WebSocket(signalingServer)
      signalingWsRef.current = ws

      // Create RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      })

      peerConnectionRef.current = pc

      // Handle ICE candidates (NAT traversal)
      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
          }))
        }
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0])
      }

      // Handle connection state
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState
        if (state === 'connected') {
          setIsConnected(true)
          setConnectionStatus('connected')
        } else if (state === 'disconnected' || state === 'failed') {
          setIsConnected(false)
          setConnectionStatus('disconnected')
        }
      }

      // Signaling WebSocket handlers
      ws.onopen = async () => {
        // Create and send offer
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        ws.send(JSON.stringify({ type: 'offer', offer }))
      }

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
        } else if (data.type === 'ice-candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
        }
      }

      ws.onerror = () => {
        setConnectionStatus('error')
      }

      ws.onclose = () => {
        setIsConnected(false)
        setConnectionStatus('disconnected')
      }
    } catch (error) {
      setConnectionStatus('error')
      console.error('WebRTC connection error:', error)
    }
  }, [])

  const startAudio = useCallback(async () => {
    if (!peerConnectionRef.current) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      setLocalStream(stream)

      // Add audio tracks to peer connection
      stream.getTracks().forEach((track) => {
        peerConnectionRef.current!.addTrack(track, stream)
      })
    } catch (error) {
      console.error('Error starting audio:', error)
      throw error
    }
  }, [])

  const stopAudio = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
      setLocalStream(null)
    }
  }, [localStream])

  const disconnect = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (signalingWsRef.current) {
      signalingWsRef.current.close()
      signalingWsRef.current = null
    }

    stopAudio()
    setIsConnected(false)
    setConnectionStatus('disconnected')
  }, [stopAudio])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    startAudio,
    stopAudio,
    localStream,
    remoteStream,
  }
}

