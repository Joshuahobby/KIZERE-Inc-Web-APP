import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { User } from '@shared/schema';

interface ConnectedClient {
  ws: WebSocket;
  userId: number;
}

class NotificationServer {
  private wss: WebSocketServer;
  private clients: Map<number, ConnectedClient>;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.clients = new Map();

    this.wss.on('connection', (ws, request) => {
      if (!request.url) return;

      // Extract user ID from URL params
      const userId = parseInt(new URL(request.url, 'http://localhost').searchParams.get('userId') || '0');
      if (!userId) {
        ws.close();
        return;
      }

      this.clients.set(userId, { ws, userId });

      ws.on('close', () => {
        this.clients.delete(userId);
      });
    });
  }

  sendNotification(userId: number, notification: {
    type: 'ITEM_STATUS_CHANGE' | 'NEW_MATCH' | 'MODERATION_UPDATE';
    message: string;
    data?: any;
  }) {
    const client = this.clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(notification));
    }
  }

  broadcastAdminNotification(notification: {
    type: 'ADMIN_ALERT';
    message: string;
    data?: any;
  }) {
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(notification));
      }
    });
  }
}

export let notificationServer: NotificationServer;

export function setupWebSocket(server: Server) {
  notificationServer = new NotificationServer(server);
}
