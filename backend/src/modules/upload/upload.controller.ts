import { Controller, Post, Req, UseGuards, UseInterceptors, UploadedFile, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Request } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { getRequiredEnv } from '../../config/env';

@Controller('upload')
export class UploadController {
  private readonly uploadBaseUrl = getRequiredEnv('UPLOAD_BASE_URL');

  @Post('image')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: getRequiredEnv('UPLOAD_DIR'),
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(new Error('仅支持图片文件'), false);
        }
        callback(null, true);
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      url: `${this.uploadBaseUrl}/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size,
    };
  }
}
