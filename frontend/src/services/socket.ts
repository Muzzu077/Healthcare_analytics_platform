import { WsEvent } from '../types';

type EventCallback = (data: any) => void;
type ConnectionStateCallback = (state: 'connected' | 'reconnecting' | 'disconnected') => void;

class RealtimeSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private stateListeners: Set<ConnectionStateCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15;
  private reconnectInterval = 2000;
  private pingInterval: any = null;
  private isExplicitlyClosed = false;

  public connectionState: 'connected' | 'reconnecting' | 'disconnected' = 'disconnected';

  constructor() {
    const loc = window.location;
    const wsProtocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use environment variable or default backend host on port 8088
    const host = (import.meta as any).env?.VITE_WS_URL || `${wsProtocol}//${loc.hostname}:8088/ws`;
    this.url = host;
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    this.setConnectionState(this.reconnectAttempts > 0 ? 'reconnecting' : 'disconnected');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setConnectionState('connected');
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          
          // Check if standardized WsEvent schema or legacy event
          const eventType = rawData.event_type || rawData.type || 'message';
          const payload = rawData.payload !== undefined ? rawData.payload : rawData.data;

          const callbacks = this.listeners.get(eventType);
          if (callbacks) {
            callbacks.forEach(cb => cb(payload !== undefined ? payload : rawData));
          }

          // Broadcast to wildcard listeners
          const allCallbacks = this.listeners.get('*');
          if (allCallbacks) {
            allCallbacks.forEach(cb => cb(rawData));
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        if (!this.isExplicitlyClosed) {
          this.setConnectionState('reconnecting');
          this.scheduleReconnect();
        } else {
          this.setConnectionState('disconnected');
        }
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private setConnectionState(state: 'connected' | 'reconnecting' | 'disconnected') {
    this.connectionState = state;
    this.stateListeners.forEach(cb => cb(state));
  }

  public onConnectionStateChange(callback: ConnectionStateCallback) {
    this.stateListeners.add(callback);
    callback(this.connectionState);
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const timeout = Math.min(this.reconnectInterval * Math.pow(1.3, this.reconnectAttempts), 15000);
      setTimeout(() => {
        this.connect();
      }, timeout);
    } else {
      this.setConnectionState('disconnected');
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 20000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public on(eventType: string, callback: EventCallback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  public off(eventType: string, callback: EventCallback) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setConnectionState('disconnected');
  }
}

export const realtimeSocket = new RealtimeSocket();
