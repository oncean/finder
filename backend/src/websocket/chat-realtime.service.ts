import { Injectable } from '@nestjs/common';

type BroadcastHandler = (groupId: string, event: string, data: any) => void;

@Injectable()
export class ChatRealtimeService {
  private broadcastHandler?: BroadcastHandler;

  registerBroadcastHandler(handler: BroadcastHandler) {
    this.broadcastHandler = handler;
  }

  broadcastToGroup(groupId: string, event: string, data: any) {
    if (!this.broadcastHandler) {
      return;
    }

    this.broadcastHandler(groupId, event, data);
  }
}
