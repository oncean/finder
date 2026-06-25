import type { RequestOptions } from '@umijs/max';
import { request } from '@umijs/max';

export interface ChatGroupItem {
  id: string;
  name: string;
  city: string;
  district: string;
  centerLat?: number | null;
  centerLng?: number | null;
  coverageRadius?: number | null;
  onlineCount: number;
  createdAt: string;
}

export interface ChatGroupOnlineUserItem {
  id: string;
  groupId: string;
  userId: string;
  isOnline: boolean;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    nickname: string;
    avatar?: string;
    phone?: string;
  } | null;
}

export interface ChatGroupListParams {
  pageSize?: number;
  current?: number;
  keyword?: string;
}

/** 获取群组列表 */
export async function fetchChatGroupList(
  params: ChatGroupListParams,
  options?: RequestOptions,
) {
  return request<{
    list: ChatGroupItem[];
    total: number;
  }>('/api/v1/admin/chat-groups', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 获取群组详情 */
export async function fetchChatGroupDetail(
  id: string,
  options?: RequestOptions,
) {
  return request<ChatGroupItem>('/api/v1/admin/chat-groups/' + id, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 创建群组 */
export async function createChatGroup(
  data: {
    name: string;
    city?: string;
    district?: string;
    centerLat?: number | null;
    centerLng?: number | null;
    coverageRadius?: number | null;
  },
  options?: RequestOptions,
) {
  return request<ChatGroupItem>('/api/v1/admin/chat-groups', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/** 更新群组 */
export async function updateChatGroup(
  id: string,
  data: {
    name?: string;
    city?: string;
    district?: string;
    centerLat?: number | null;
    centerLng?: number | null;
    coverageRadius?: number | null;
  },
  options?: RequestOptions,
) {
  return request<ChatGroupItem>('/api/v1/admin/chat-groups/' + id, {
    method: 'PUT',
    data,
    ...(options || {}),
  });
}

/** 删除群组 */
export async function deleteChatGroup(
  id: string,
  options?: RequestOptions,
) {
  return request<{
    message: string;
  }>('/api/v1/admin/chat-groups/' + id, {
    method: 'DELETE',
    ...(options || {}),
  });
}

/** 获取群组在线用户 */
export async function fetchChatGroupOnlineUsers(
  groupId: string,
  options?: RequestOptions,
) {
  return request<{
    list: ChatGroupOnlineUserItem[];
    total: number;
  }>('/api/v1/admin/chat-groups/' + groupId + '/online-users', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 新增群组在线用户 */
export async function addChatGroupOnlineUser(
  groupId: string,
  data: { userId: string },
  options?: RequestOptions,
) {
  return request<ChatGroupOnlineUserItem>('/api/v1/admin/chat-groups/' + groupId + '/online-users', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/** 删除群组在线用户 */
export async function deleteChatGroupOnlineUser(
  groupId: string,
  userId: string,
  options?: RequestOptions,
) {
  return request<{
    groupId: string;
    onlineCount: number;
  }>('/api/v1/admin/chat-groups/' + groupId + '/online-users/' + userId, {
    method: 'DELETE',
    ...(options || {}),
  });
}
