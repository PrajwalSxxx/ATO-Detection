import { useState, useEffect, useRef, useCallback } from 'react'
import { getLiveSecurityEvents } from '@/services/api'

/**
 * useSecurityEventStream
 * Real-time WebSocket connection to the backend security event stream
 * with automatic heartbeat, reconnect, and graceful HTTP polling fallback.
 */
export function useSecurityEventStream(options = {}) {
  const {
    maxEvents = 40,
    pollInterval = 6000,
    enabled = true,
  } = options

  const [events, setEvents] = useState([])
  const [status, setStatus] = useState('disconnected') // 'connecting' | 'connected' | 'reconnecting' | 'polling' | 'disconnected'
  const [lastEvent, setLastEvent] = useState(null)

  const wsRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const pollTimerRef = useRef(null)
  const pingTimerRef = useRef(null)
  const isMountedRef = useRef(true)

  // Fetch initial history via REST endpoint
  const fetchHistory = useCallback(async () => {
    try {
      const response = await getLiveSecurityEvents(maxEvents)
      if (isMountedRef.current && Array.isArray(response.data)) {
        setEvents((prev) => {
          // Merge deduplicated
          const existingIds = new Set(prev.map(e => e.event_id || e.id))
          const newEvents = response.data.filter(e => !existingIds.has(e.event_id || e.id))
          return [...prev, ...newEvents].slice(0, maxEvents)
        })
      }
    } catch (err) {
      // Fallback silently if offline or token expired
    }
  }, [maxEvents])

  // Setup periodic polling fallback
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return
    setStatus('polling')
    pollTimerRef.current = setInterval(async () => {
      await fetchHistory()
    }, pollInterval)
  }, [fetchHistory, pollInterval])

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('ato_token')
    if (!token || !enabled) {
      setStatus('disconnected')
      return
    }

    try {
      setStatus('connecting')
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      let wsHost = window.location.host
      // If dev on 5173 without proxy handling WS, fallback direct
      const wsUrl = `${protocol}//${wsHost}/api/ws/security-events?token=${encodeURIComponent(token)}`

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (!isMountedRef.current) return
        setStatus('connected')
        stopPolling()

        // Keepalive heartbeat ping every 25 seconds
        if (pingTimerRef.current) clearInterval(pingTimerRef.current)
        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 25000)
      }

      ws.onmessage = (messageEvent) => {
        if (!isMountedRef.current) return
        try {
          const payload = JSON.parse(messageEvent.data)
          if (payload.type === 'security_event' && payload.event) {
            const newEvt = payload.event
            setLastEvent(newEvt)
            setEvents((prev) => {
              // Deduplicate by event_id
              const existingIdx = prev.findIndex(e => (e.event_id || e.id) === (newEvt.event_id || newEvt.id))
              if (existingIdx !== -1) {
                const updated = [...prev]
                updated[existingIdx] = newEvt
                return updated
              }
              return [newEvt, ...prev].slice(0, maxEvents)
            })
          }
        } catch (e) {
          console.warn('[useSecurityEventStream] JSON parse error:', e)
        }
      }

      ws.onerror = () => {
        if (!isMountedRef.current) return
        // Trigger fallback polling
        startPolling()
      }

      ws.onclose = (closeEvent) => {
        if (!isMountedRef.current) return
        if (pingTimerRef.current) {
          clearInterval(pingTimerRef.current)
          pingTimerRef.current = null
        }

        // If closed due to unauthorized role, don't continuously spam reconnect
        if (closeEvent.code === 1008) {
          setStatus('unauthorized')
          return
        }

        setStatus('reconnecting')
        startPolling()

        // Attempt reconnect after 4 seconds
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && enabled) {
            connectWebSocket()
          }
        }, 4000)
      }
    } catch (err) {
      console.warn('[useSecurityEventStream] Setup error:', err)
      startPolling()
    }
  }, [enabled, maxEvents, startPolling, stopPolling])

  useEffect(() => {
    isMountedRef.current = true
    fetchHistory()
    connectWebSocket()

    return () => {
      isMountedRef.current = false
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (pingTimerRef.current) clearInterval(pingTimerRef.current)
      stopPolling()
    }
  }, [connectWebSocket, fetchHistory, stopPolling])

  return {
    events,
    status,
    isConnected: status === 'connected',
    isPolling: status === 'polling',
    lastEvent,
    refresh: fetchHistory,
    clearEvents: () => setEvents([]),
  }
}
