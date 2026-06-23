import { Controller, Get, Query } from '@nestjs/common';
import { PostService } from './post.service';

@Controller('feed')
export class FeedController {
  constructor(private readonly postService: PostService) {}

  @Get('recommendations')
  async getRecommendations(
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.postService.getRecommendations(
      lat ? parseFloat(lat as any) : undefined,
      lng ? parseFloat(lng as any) : undefined,
      page ? parseInt(page as any, 10) : 1,
      pageSize ? parseInt(pageSize as any, 10) : 20,
    );
  }
}
