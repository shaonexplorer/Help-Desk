import { io, type Socket } from 'socket.io-client';
import type { TicketWithUsers } from '@/api/tickets';

// Event types for ticket operations
export type TicketEvent =
  | 'ticket:created'
  | 'ticket:updated'
  | 'ticket:deleted'
  | 'ticket:restored'
  | 'ticket:assignment-changed';

// Event types for notifications
export type NotificationEvent = 'ticket:customer-replied';

// Listener callback types
export type TicketEventListener = (ticket: TicketWithUsers) => void;
export type TicketDeletedListener = (ticketId: string) => void;

// Customer reply notification payload
export interface CustomerReplyNotification {
  ticketId: string;
  ticketSubject: string;
  senderEmail: string;
  senderName?: string;
}

// Singleton socket instance
let socket: Socket | null = null;

/**
 * Initialize the Socket.IO connection.
 * Should be called once on app startup.
 */
export function initSocket(): Socket {
  if (socket) return socket;

  // In development, the Express server runs on port 5000
  // In production, the client is served by the same origin
  const serverUrl = import.meta.env.DEV ? 'http://localhost:5000' : undefined;

  socket = io(serverUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason: string) => {
    console.log('Socket disconnected:', socket?.id, 'reason:', reason);
  });

  socket.on('connect_error', (error: Error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
}

/**
 * Get the current socket instance, initializing if needed.
 */
export function getSocket(): Socket {
  return socket || initSocket();
}

/**
 * Subscribe to a ticket event.
 * Returns an unsubscribe function.
 */
export function onTicketEvent(
  event: TicketEvent,
  callback: (ticket: TicketWithUsers) => void
): () => void {
  const s = getSocket();

  s.on(event, callback);

  return () => {
    s.off(event, callback);
  };
}

/**
 * Subscribe to a ticket event without using the ticket data.
 * Returns an unsubscribe function.
 */
export function onTicketEventNoData(event: TicketEvent, callback: () => void): () => void {
  const s = getSocket();
  const handler = () => callback();

  s.on(event, handler);

  return () => {
    s.off(event, handler);
  };
}

/**
 * Subscribe to all ticket events with a single callback.
 * Returns an unsubscribe function.
 */
export function onTicketEvents(events: TicketEvent[], callback: TicketEventListener): () => void {
  const s = getSocket();

  events.forEach(event => {
    s.on(event, callback);
  });

  return () => {
    events.forEach(event => {
      s.off(event, callback);
    });
  };
}

/**
 * Join the dashboard room for receiving analytics updates.
 */
export function joinDashboardRoom(): void {
  const s = getSocket();
  s.emit('join:dashboard');
}

/**
 * Leave the dashboard room.
 */
export function leaveDashboardRoom(): void {
  const s = getSocket();
  s.emit('leave:dashboard');
}

/**
 * Subscribe to the tickets stream.
 */
export function subscribeToTickets(): void {
  const s = getSocket();
  s.emit('subscribe:tickets');
}

/**
 * Unsubscribe from the tickets stream.
 */
export function unsubscribeFromTickets(): void {
  const s = getSocket();
  s.emit('unsubscribe:tickets');
}

/**
 * Send a ping to test the connection.
 */
export function pingServer(): Promise<string> {
  const s = getSocket();
  return new Promise((resolve) => {
    s.timeout(5000).emitWithAck('ping', {}, (response: string) => {
      resolve(response);
    });
  });
}

/**
 * Subscribe to customer reply notifications.
 * Returns an unsubscribe function.
 */
export function onCustomerReply(
  callback: (data: CustomerReplyNotification) => void
): () => void {
  const s = getSocket();
  const handler = (data: CustomerReplyNotification) => callback(data);

  s.on('ticket:customer-replied', handler);

  return () => {
    s.off('ticket:customer-replied', handler);
  };
}

// Cleanup function for when the app unmounts
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}