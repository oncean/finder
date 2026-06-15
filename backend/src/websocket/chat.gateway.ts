import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { AuthService } from '../modules/auth/auth.service';
import { ChatService } from '../modules/chat/chat.service';

interface ClientInfo {
  userId: string;
  groupId: string;
  nickname: string;
  avatar: string;
}

@WebSocketGateway({
  path: '/ws/chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clients = new Map<WebSocket, ClientInfo>();
  private onlineUsers = new Map<string, Set<string>>(); // groupId -> Set<userId>

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
  ) {}

  handleConnection(client: WebSocket) {
    console.log('客户端连接');
  }

  handleDisconnect(client: WebSocket) {
    const info = this.clients.get(client);
    if (info) {
      // 从在线列表移除
      const users = this.onlineUsers.get(info.groupId);
      if (users) {
        users.delete(info.userId);
        if (users.size === 0) {
          this.onlineUsers.delete(info.groupId);
        }
      }
      this.clients.delete(client);

      // 广播在线人数更新
      this.broadcastOnlineCount(info.groupId);
    }
  }

  @SubscribeMessage('join')
  async handleJoin(client: WebSocket, payload: { token: string; groupId: string }) {
    try {
      const decoded = this.authService.verifyToken(payload.token);
      if (!decoded) {
        client.send(JSON.stringify({ type: 'error', data: { message: 'token无效' } }));
        return;
      }

      const user = await this.authService.getUserByToken(payload.token);
      
      // 保存客户端信息
      this.clients.set(client, {
        userId: decoded.userId,
        groupId: payload.groupId,
        nickname: user.nickname,
        avatar: user.avatar,
      });

      // 添加到在线列表
      if (!this.onlineUsers.has(payload.groupId)) {
        this.onlineUsers.set(payload.groupId, new Set());
      }
      this.onlineUsers.get(payload.groupId).add(decoded.userId);

      // 广播在线人数
      this.broadcastOnlineCount(payload.groupId);

      // 发送历史消息
      const messages = await this.chatService.getMessages(payload.groupId, undefined, 50);
      client.send(JSON.stringify({
        type: 'history',
        data: { messages },
      }));

    } catch (error) {
      client.send(JSON.stringify({ type: 'error', data: { message: error.message } }));
    }
  }

  @SubscribeMessage('message')
  async handleMessage(client: WebSocket, payload: { type: string; content: string; shopCard?: any }) {
    const info = this.clients.get(client);
    if (!info) {
      client.send(JSON.stringify({ type: 'error', data: { message: '未加入群聊' } }));
      return;
    }

    try {
      // 保存消息到数据库
      const message = await this.chatService.sendMessage({
        groupId: info.groupId,
        type: payload.type as any,
        content: payload.content,
        shopCard: payload.shopCard,
      }, info.userId);

      // 广播给群聊内所有用户
      this.broadcast(info.groupId, {
        type: 'message',
        data: message,
      });

    } catch (error) {
      client.send(JSON.stringify({ type: 'error', data: { message: error.message } }));
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: WebSocket) {
    client.send(JSON.stringify({ type: 'pong' }));
  }

  private broadcast(groupId: string, message: any) {
    const data = JSON.stringify(message);
    this.clients.forEach((info, client) => {
      if (info.groupId === groupId && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  private broadcastOnlineCount(groupId: string) {
    const count = this.onlineUsers.get(groupId)?.size || 0;
    this.broadcast(groupId, {
      type: 'online_count',
      data: { count },
    });
  }
}
