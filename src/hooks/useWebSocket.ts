import { useEffect, useRef, useCallback } from 'react';
import { CallRequest, TrafficPattern } from '../types';
import { useElevatorStore } from '../store/elevatorStore';

interface WebSocketMessage {
  type: string;
  payload: any;
}

export const useWebSocket = (url: string) => {
  const wsRef = useRef<WebSocket | null>(null);
  const addCalls = useElevatorStore((state) => state.addCalls);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (message.type === 'NEW_CALLS') {
          const calls = message.payload as CallRequest[];
          addCalls(calls);
        } else if (message.type === 'CONFIG') {
          console.log('Received config:', message.payload);
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [url, addCalls]);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const setTrafficPattern = useCallback(
    (pattern: TrafficPattern) => {
      sendMessage('SET_PATTERN', pattern);
    },
    [sendMessage]
  );

  const toggleSimulation = useCallback(
    (running: boolean) => {
      sendMessage('TOGGLE_SIMULATION', running);
    },
    [sendMessage]
  );

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { sendMessage, setTrafficPattern, toggleSimulation };
};
