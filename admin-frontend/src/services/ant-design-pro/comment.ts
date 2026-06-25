import type { RequestOptions } from '@umijs/max';
import { request } from '@umijs/max';

export interface CommentItem {
  id: string;
  title: string;
  content: string;
  rating: number;
  likeCount: number;
  shopId: string;
  shop?: {
    id: string;
    name: string;
    logo?: string;
  };
  author?: {
    id: string;
    nickname: string;
    avatar?: string;
  };
  authorId: string;
}

export interface CommentListParams {
  pageSize?: number;
  current?: number;
  keyword?: string;
  shopId?: string;
  authorId?: string;
  isFengxiangbiao?: string;
}

/** 获取评价列表 */
export async function fetchCommentList(
  params: CommentListParams,
  options?: RequestOptions,
) {
  return request<{
    list: CommentItem[];
    total: number;
  }>('/api/v1/admin/comments', {
    method: 'GET',
    params,
    ...(options || {}),
  });
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
  data: Partial<Omit<CommentItem, 'id' | 'shop'>>,
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
  data: Partial<CommentItem>,
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
  return request<{
    message?: string;
  }>('/api/v1/admin/comments/' + id, {
    method: 'DELETE',
    ...(options || {}),
  });
}
