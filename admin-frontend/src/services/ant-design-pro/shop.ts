import type { RequestOptions } from '@umijs/max';
import { request } from '@umijs/max';

export interface ShopLocation {
  lat: number;
  lng: number;
}

export interface ShopItem {
  id: string;
  name: string;
  category?: string;
  address?: string;
  location?: ShopLocation;
  city?: string;
  coverImage?: string;
  logo?: string;
  phone?: string;
  businessHours?: string;
  rating?: number;
  reviewCount?: number;
  summaryTags?: { positive: string[]; negative: string[] };
  isVerified?: boolean;
  createdAt?: string;
}

export interface ShopListParams {
  pageSize?: number;
  current?: number;
  keyword?: string;
  category?: string;
}

/** 获取店铺列表 */
export async function fetchShopList(
  params: ShopListParams,
  options?: RequestOptions,
) {
  const res = await request<{
    list: ShopItem[];
    total: number;
  }>('/api/v1/admin/shops', {
    method: 'GET',
    params,
    ...(options || {}),
  });
  return { data: res.list, total: res.total, success: true };
}

/** 获取店铺详情 */
export async function fetchShopDetail(
  id: string,
  options?: RequestOptions,
) {
  return request<ShopItem>('/api/v1/admin/shops/' + id, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 创建店铺 */
export async function createShop(
  data: Partial<ShopItem>,
  options?: RequestOptions,
) {
  return request<ShopItem>('/api/v1/admin/shops', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/** 更新店铺 */
export async function updateShop(
  id: string,
  data: Partial<ShopItem>,
  options?: RequestOptions,
) {
  return request<ShopItem>('/api/v1/admin/shops/' + id, {
    method: 'PUT',
    data,
    ...(options || {}),
  });
}

/** 删除店铺 */
export async function deleteShop(
  id: string,
  options?: RequestOptions,
) {
  return request<{ message?: string }>('/api/v1/admin/shops/' + id, {
    method: 'DELETE',
    ...(options || {}),
  });
}
