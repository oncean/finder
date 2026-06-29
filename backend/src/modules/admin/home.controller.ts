import { Controller, Get } from '@nestjs/common';

@Controller()
export class HomeController {
  @Get()
  getHome() {
    return {
      message: '风向标管理后台',
      adminPage: '/',
      api: '/api/v1',
    };
  }
}
