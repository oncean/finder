import type { RequestOptions } from '@umijs/max';
import { request } from '@umijs/max';

export interface WechatUserItem {
  id: string;
  openid: string;
  unionid?: string;
  nickname: string;
  avatar?: string;
  phone?: string;
  location?: { lat: number; lng: number; city: string };
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WechatUserListParams {
  pageSize?: number;
  current?: number;
  keyword?: string;
}

/** 获取微信用户列表 */
export async function fetchWechatUserList(
  params: WechatUserListParams,
  options?: RequestOptions,
) {
  return request<{
    list: WechatUserItem[];
    total: number;
  }>('/api/v1/admin/users', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 获取微信用户详情 */
export async function fetchWechatUserDetail(
  id: string,
  options?: RequestOptions,
) {
  return request<WechatUserItem>('/api/v1/admin/users/' + id, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 创建微信用户 */
export async function createWechatUser(
  data: Partial<Pick<WechatUserItem, 'nickname' | 'avatar' | 'phone' | 'location' | 'isAdmin'>>,
  options?: RequestOptions,
) {
  return request<WechatUserItem>('/api/v1/admin/users', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/** 更新微信用户 */
export async function updateWechatUser(
  id: string,
  data: Partial<Pick<WechatUserItem, 'nickname' | 'avatar' | 'phone' | 'location' | 'isAdmin'>>,
  options?: RequestOptions,
) {
  return request<WechatUserItem>('/api/v1/admin/users/' + id, {
    method: 'PUT',
    data,
    ...(options || {}),
  });
}

/** 删除微信用户 */
export async function deleteWechatUser(
  id: string,
  options?: RequestOptions,
) {
  return request<{
    message?: string;
  }>('/api/v1/admin/users/' + id, {
    method: 'DELETE',
    ...(options || {}),
  });
}
