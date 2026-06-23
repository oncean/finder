import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { WindVaneService } from './wind-vane.service';
import { WindVane } from '../../entities/wind-vane.entity';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('wind-vane')
export class WindVaneController {
  constructor(private readonly windVaneService: WindVaneService) {}

  @Get('list')
  async findAll() {
    const result = await this.windVaneService.findAll();
    const data = result.map(item => ({
      ...item,
      comment: item.review,
    }));
    return {
      success: true,
      data,
      total: data.length,
    };
  }

  @Get('detail')
  async findById(@Query('id') id: string) {
    const result = await this.windVaneService.findById(id);
    return {
      success: true,
      data: result ? { ...result, comment: result.review } : null,
    };
  }

  @Post('create')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async create(@Body() body: { reviewId: string; ranking: number; featuredTag?: string }) {
    try {
      const result = await this.windVaneService.create(
        body.reviewId,
        body.ranking,
        body.featuredTag,
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Put('update')
  @UseGuards(AuthGuard)
  async update(@Body() body: { id: string; ranking?: number; isActive?: boolean; featuredTag?: string }) {
    const data: Partial<WindVane> = {};
    if (body.ranking !== undefined) data.ranking = body.ranking;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.featuredTag !== undefined) data.featuredTag = body.featuredTag;

    const result = await this.windVaneService.update(body.id, data);

    if (!result) {
      return {
        success: false,
        message: '风向标不存在',
      };
    }

    return {
      success: true,
      data: result,
    };
  }

  @Put('update-ranking')
  @UseGuards(AuthGuard)
  async updateRanking(@Body() body: { id: string; ranking: number }) {
    const result = await this.windVaneService.updateRanking(body.id, body.ranking);

    if (!result) {
      return {
        success: false,
        message: '风向标不存在',
      };
    }

    return {
      success: true,
      data: result,
    };
  }

  @Delete('delete')
  @UseGuards(AuthGuard)
  async delete(@Query('id') id: string) {
    const result = await this.windVaneService.delete(id);

    if (!result) {
      return {
        success: false,
        message: '风向标不存在',
      };
    }

    return {
      success: true,
      message: '删除成功',
    };
  }

  @Get('available-comments')
  async getAvailableComments() {
    const result = await this.windVaneService.getAvailableComments();
    return {
      success: true,
      data: result,
    };
  }
}
