import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpException('未提供认证token', HttpStatus.UNAUTHORIZED);
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token);

    if (!decoded) {
      throw new HttpException('token无效或已过期', HttpStatus.UNAUTHORIZED);
    }

    // 将用户信息附加到请求对象
    request.user = decoded;
    return true;
  }
}
