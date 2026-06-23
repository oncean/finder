import { Controller, Get } from '@nestjs/common';
import { join } from 'path';

@Controller()
export class HomeController {
  @Get()
  getHome() {
    return {
      message: '风向标管理后台',
      adminPage: '/admin.html',
      api: '/api/v1',
    };
  }
}