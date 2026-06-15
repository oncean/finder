import { Controller, Get, Post, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { PostService } from './post.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('posts')
export class PostController {
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
      page || 1,
      pageSize || 20,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.postService.findOne(id);
  }

  @Get(':id/related')
  async getRelated(@Param('id') id: string) {
    return this.postService.getRelated(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() dto: any, @Request() req) {
    return this.postService.create(dto, req.user.userId);
  }
}
