import type { RequestOptions } from '@umijs/max';
import { request } from '@umijs/max';

export interface RecommendationItem {
  id: string;
  title: string;
  content: string;
  images: string[];
  coverImage: string;
  authorId: string;
  author: {
    id: string;
    nickname: string;
    avatar: string;
  } | null;
  shopId: string;
  shop: {
    id: string;
    name: string;
    logo: string;
  } | null;
  consumeRecord: {
    amount: number;
    merchantName: string;
    tradeTime: string;
    tradeNo: string;
    paymentMethod: string;
  };
  reviewCount: number;
  isRecommended: boolean;
  recommendRank: number;
  location: string;
  city: string;
  eventTime: string;
  createdAt: string;
}

export interface RecommendationListParams {
  pageSize?: number;
  current?: number;
  keyword?: string;
}

/** 获取风向标评价列表 */
export async function fetchRecommendationList(
  params: RecommendationListParams,
  options?: RequestOptions,
) {
  const res = await request<{
    list: any[];
    total: number;
  }>('/api/v1/admin/comments', {
    method: 'GET',
    params: {
      ...params,
      isFengxiangbiao: 'true',
    },
    ...(options || {}),
  });
  return {
    ...res,
    list: (res.list || []).map(normalizeCommentRecommendation),
  };
}

/** 获取所有评价列表（用于选择风向标） */
export async function fetchAllPosts(
  params: RecommendationListParams,
  options?: RequestOptions,
) {
  const res = await request<{
    list: any[];
    total: number;
  }>('/api/v1/admin/comments', {
    method: 'GET',
    params,
    ...(options || {}),
  });
  return {
    ...res,
    list: (res.list || []).map(normalizeCommentRecommendation),
  };
}

/** 更新风向标设置 */
export async function updateRecommendation(
  id: string,
  data: { isRecommended: boolean; recommendRank?: number },
  options?: RequestOptions,
) {
  return request<RecommendationItem>('/api/v1/admin/comments/' + id, {
    method: 'PUT',
    data: {
      isFengxiangbiao: data.isRecommended,
      fengxiangbiaoRank: data.recommendRank,
    },
    ...(options || {}),
  });
}

/** 取消风向标 */
export async function deleteRecommendation(
  id: string,
  options?: RequestOptions,
) {
  return request<{
    message?: string;
  }>('/api/v1/admin/comments/' + id, {
    method: 'PUT',
    data: {
      isFengxiangbiao: false,
      fengxiangbiaoRank: null,
    },
    ...(options || {}),
  });
}

/** 批量更新风向标排名 */
export async function batchUpdateRanking(
  rankings: Array<{ id: string; rank: number }>,
  options?: RequestOptions,
) {
  return request<{
    message?: string;
  }>('/api/v1/admin/comments/batch-rank', {
    method: 'PUT',
    data: { rankings },
    ...(options || {}),
  });
}

function normalizeCommentRecommendation(item: any): RecommendationItem {
  const images = Array.isArray(item.images) ? item.images : [];
  return {
    ...item,
    coverImage: images[0] || item.shop?.coverImage || '',
    images,
    isRecommended: item.isFengxiangbiao,
    recommendRank: item.fengxiangbiaoRank,
    location: item.shop?.address || '',
    city: item.shop?.city || '',
    eventTime: item.createdAt,
    reviewCount: item.shop?.reviewCount || 0,
  };
}
