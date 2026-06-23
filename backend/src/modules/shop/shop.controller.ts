import { Controller, Get, Post, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ShopService } from './shop.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get()
  async findNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius?: number,
    @Query('keyword') keyword?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.shopService.findNearby(
      parseFloat(lat as any),
      parseFloat(lng as any),
      radius || 3000,
      keyword,
      page || 1,
      pageSize || 20,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.shopService.findOne(id);
  }

  @Get(':id/reviews')
  async getReviews(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.shopService.getReviews(id, page || 1, pageSize || 20);
  }
}
