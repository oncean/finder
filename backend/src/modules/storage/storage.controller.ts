import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  Body,
  Query,
  Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * 单文件上传
   * POST /api/v1/storage/upload
   * 返回 { fileId }，业务表直接保存 fileId
   */
  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
      },
      fileFilter: (req, file, callback) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp|mp4|mov|pdf|doc|docx|zip)$/i;
        if (!allowed.test(file.originalname)) {
          return callback(new Error('不支持的文件类型'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
    @Body('openid') openid?: string,
  ) {
    return this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      folder || 'uploads',
      openid || '',
    );
  }

  /**
   * 多文件上传
   * POST /api/v1/storage/upload-batch
   */
  @Post('upload-batch')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: {
        fileSize: 20 * 1024 * 1024, // 单个文件 20MB
      },
    }),
  )
  async uploadFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body('folder') folder?: string,
    @Body('openid') openid?: string,
  ) {
    const fileList = files.map((f) => ({
      buffer: f.buffer,
      originalname: f.originalname,
    }));

    return this.storageService.uploadFiles(
      fileList,
      folder || 'uploads',
      openid || '',
    );
  }

  /**
   * 通过 fileId 获取下载链接（网页端使用）
   * GET /api/v1/storage/download-url?fileid=cloud://...
   */
  @Get('download-url')
  async getDownloadUrl(@Query('fileid') fileId: string) {
    const url = await this.storageService.resolveUrl(fileId);
    return { url };
  }

  /**
   * 通过 fileId 直接下载文件（网页端使用）
   * GET /api/v1/storage/download?fileid=cloud://...
   */
  @Get('download')
  async download(
    @Query('fileid') fileId: string,
    @Res() res: Response,
  ) {
    const { buffer } = await this.storageService.getFile(fileId);
    const filename = fileId.split('/').pop() || 'download';
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(buffer);
  }
}
