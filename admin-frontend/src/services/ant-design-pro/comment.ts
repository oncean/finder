import type { RequestOptions } from '@umijs/max';
import { request } from '@umijs/max';
import type { ShopItem } from './shop';

export interface CommentItem {
  id: string;
  shopId: string;
  shop?: ShopItem;
  authorId: string;
  author?: {
    id: string;
    nickname: string;
    avatar?: string;
  };
  title: string;
  content: string;
  images: string[];
  rating: number;
  consumeRecord: {
    amount: number;
    tradeTime: string;
    image?: string;
  };
  likeCount: number;
  createdAt: string;
}

export interface CommentListParams {
  pageSize?: number;
  current?: number;
  shopId?: string;
  keyword?: string;
  isFengxiangbiao?: string;
}

/** 获取评价列表 */
export async function fetchCommentList(
  params: CommentListParams,
  options?: RequestOptions,
) {
  const res = await request<{
    list: CommentItem[];
    total: number;
  }>('/api/v1/admin/comments', {
    method: 'GET',
    params,
    ...(options || {}),
  });
  return { data: res.list, total: res.total, success: true };
}

/** 获取评价详情 */
export async function fetchCommentDetail(
  id: string,
  options?: RequestOptions,
) {
  return request<CommentItem>('/api/v1/admin/comments/' + id, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 创建评价 */
export async function createComment(
  data: Partial<Pick<CommentItem, 'title' | 'content' | 'rating' | 'authorId' | 'shopId'>>,
  options?: RequestOptions,
) {
  return request<CommentItem>('/api/v1/admin/comments', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

/** 更新评价 */
export async function updateComment(
  id: string,
  data: Partial<Pick<CommentItem, 'title' | 'content' | 'rating' | 'authorId'>>,
  options?: RequestOptions,
) {
  return request<CommentItem>('/api/v1/admin/comments/' + id, {
    method: 'PUT',
    data,
    ...(options || {}),
  });
}

/** 删除评价 */
export async function deleteComment(
  id: string,
  options?: RequestOptions,
) {
  return request<{ message?: string }>('/api/v1/admin/comments/' + id, {
    method: 'DELETE',
    ...(options || {}),
  });
}
