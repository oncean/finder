import type { RequestOptions } from '@umijs/max';
import { request } from '@umijs/max';

export interface MessageItem {
  id: string;
  type: string;
  content: string;
  shopId?: string;
  shopCard: {
    shopId: string;
    name: string;
    address: string;
    coverImage: string;
    distance: number;
    summaryTags: any;
    reviewCount: number;
    rating?: number;
  } | null;
  groupId: string;
  group: { id: string; name: string } | null;
  senderId: string;
  sender: {
    id: string;
    nickname: string;
    avatar: string;
  } | null;
  createdAt: string;
}

export interface MessageListParams {
  pageSize?: number;
  current?: number;
  type?: string;
  keyword?: string;
}

/** 获取消息列表 */
export async function fetchMessageList(
  params: MessageListParams,
  options?: RequestOptions,
) {
  return request<{
    list: MessageItem[];
    total: number;
  }>('/api/v1/admin/messages', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 发送消息 */
export async function sendMessage(
  data: {
    type: string;
    content?: string;
    shopId?: string;
    shopCard?: {
      shopId: string;
      name?: string;
      address?: string;
      coverImage?: string;
    };
    senderId?: string;
    groupId?: string;
  },
  options?: RequestOptions,
) {
  return request<MessageItem>('/api/v1/admin/messages/send', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/** 删除消息 */
export async function deleteMessage(
  id: string,
  options?: RequestOptions,
) {
  return request<{
    message: string;
  }>('/api/v1/admin/messages/' + id, {
    method: 'DELETE',
    ...(options || {}),
  });
}
