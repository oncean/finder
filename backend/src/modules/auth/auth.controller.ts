import { Controller, Post, Body, Get, Headers, Put, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async wxLogin(@Body() dto: LoginDto) {
    return this.authService.wxLogin(dto);
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() body: { username: string; password: string }) {
    return this.authService.adminLogin(body.username, body.password);
  }

  @Get('me')
  async getMe(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    return this.authService.getUserByToken(token);
  }

  @Get('admin/me')
  async getAdminMe(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    return this.authService.getAdminMe(token);
  }

  @Put('me')
  async updateMe(
    @Headers('authorization') auth: string,
    @Body() data: any,
  ) {
    const token = auth?.replace('Bearer ', '');
    return this.authService.updateUser(token, data);
  }
}
