import { DEFAULT_BACKEND_URL } from '@/constants'

export const buildWebSocketUrl = (backendUrl?: string): string => {
  const base =
    backendUrl || process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL

  const normalized = base
    .replace('http://', 'ws://')
    .replace('https://', 'wss://')
    .replace(/\/+$/, '')

  if (normalized.endsWith('/voice')) {
    return normalized
  }

  return `${normalized}/voice`
}

export const isWebSocketOpen = (ws: WebSocket | null): boolean => {
  return ws?.readyState === WebSocket.OPEN
}

export const isWebSocketConnecting = (ws: WebSocket | null): boolean => {
  return ws?.readyState === WebSocket.CONNECTING
}
