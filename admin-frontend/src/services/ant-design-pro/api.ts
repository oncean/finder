// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取当前的管理员用户 GET /api/v1/auth/admin/me */
export async function currentUser(options?: { [key: string]: any }) {
  return request<API.CurrentUser>('/api/v1/auth/admin/me', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 登录接口 POST /api/v1/auth/admin/login */
export async function login(body: API.LoginParams, options?: { [key: string]: any }) {
  return request<API.LoginResult>('/api/v1/auth/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    skipErrorHandler: true,
    ...(options || {}),
  });
}
