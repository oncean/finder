import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CommentService } from './comment.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('admin/comments')
@UseGuards(AuthGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  async findAll(
    @Query('current') current: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('keyword') keyword?: string,
    @Query('shopId') shopId?: string,
    @Query('isFengxiangbiao') isFengxiangbiao?: string,
  ) {
    return this.commentService.findAll(Number(current), Number(pageSize), keyword, shopId, undefined, isFengxiangbiao);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.commentService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Body() body: any) {
    return this.commentService.create(body);
  }

  @Put('batch-rank')
  @HttpCode(HttpStatus.OK)
  async batchUpdateRank(@Body() body: { rankings: Array<{ id: string; rank: number }> }) {
    return this.commentService.batchUpdateFengxiangbiaoRank(body.rankings);
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
