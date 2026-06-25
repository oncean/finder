import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const path = request.url;

    // 对以下接口返回原始数据，不包装
    if (
      path.includes('/auth/admin/login') ||
      path.includes('/auth/login') ||
      path.includes('/upload/')
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      map(data => {
        // 如果 controller 返回了包含 success 的对象，剥离 success 字段
        if (data && typeof data === 'object' && 'success' in data) {
          const { success, ...rest } = data;
          return rest;
        }
        // 否则包装到 data 字段
        return { data };
      }),
    );
  }
}
