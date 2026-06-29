import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../../common/guards/auth.guard';
import { StorageService } from '../storage/storage.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly storageService: StorageService) {}

  @Post('image')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
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
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const result = await this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      'uploads/avatar',
    );
    const url = await this.storageService.resolveUrl(result.fileId);

    return {
      fileId: result.fileId,
      url,
      filename: file.originalname,
      size: file.size,
    };
  }
}
