import type { RequestConfig } from '@umijs/max';
import { getIntl } from '@umijs/max';
import { message } from 'antd';

/**
 * @name 错误处理
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
  // 错误处理
  errorConfig: {
    // 错误接收及处理
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;

      if (error.response) {
        const { status, data } = error.response;
        const msg = data?.message || `请求错误 (${status})`;
        if (status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/user/login';
          return;
        }
        message.error(msg);
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        message.error(
          getIntl().formatMessage({
            id: 'app.request.offline',
            defaultMessage:
              'Network unavailable. Please check your connection and try again.',
          }),
        );
      } else if (error.request) {
        message.error('None response! Please retry.');
      } else {
        message.error('Request error, please retry.');
      }
    },
  },

  // 请求拦截器
  requestInterceptors: [
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
      }
      return config;
    },
  ],

  // 响应拦截器
  responseInterceptors: [],
};
