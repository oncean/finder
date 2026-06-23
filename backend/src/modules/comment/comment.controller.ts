import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CommentService } from './comment.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('admin/comments')
@UseGuards(AuthGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  async findAll(
    @Query('current') current: any = 1,
    @Query('pageSize') pageSize: any = 10,
    @Query('keyword') keyword?: string,
    @Query('shopId') shopId?: string,
  ) {
    const page = parseInt(current, 10) || 1;
    const limit = parseInt(pageSize, 10) || 10;
    return this.commentService.findAll(page, limit, keyword, shopId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.commentService.findOne(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() body: any) {
    return this.commentService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    return this.commentService.delete(id);
  }
}
