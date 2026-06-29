import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn(`认证失败: ${request.method} ${request.url} - 未提供 Bearer token`);
      throw new HttpException('未提供认证token', HttpStatus.UNAUTHORIZED);
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token);

    if (!decoded) {
      this.logger.warn(`认证失败: ${request.method} ${request.url} - token 无效或已过期`);
      throw new HttpException('token无效或已过期', HttpStatus.UNAUTHORIZED);
    }

    // 将用户信息附加到请求对象
    request.user = decoded;
    return true;
  }
}
