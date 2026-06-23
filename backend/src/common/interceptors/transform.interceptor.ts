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
        // 如果 controller 已经返回了标准格式，直接透传
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        // 否则包装成前端期望的格式
        return {
          success: true,
          data,
        };
      }),
    );
  }
}
