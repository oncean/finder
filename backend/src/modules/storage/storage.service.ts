import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';

export interface UploadResult {
  fileId: string;
}

type StorageMode = 'local' | 'cloud';

interface CacheEntry {
  url: string;
  expireAt: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly envId = process.env.CLOUD_ENV_ID;
  private readonly mode: StorageMode;
  private readonly localDir: string;
  private readonly localBaseUrl: string;

  // URL 缓存：fileId (cloud://...) -> { url, expireAt }
  // 缓存有效期 = max_age - 300s（提前5分钟过期）
  private urlCache = new Map<string, CacheEntry>();

  private accessToken: string | null = null;
  private accessTokenExpireAt = 0;

  constructor() {
    const mode = (process.env.STORAGE_MODE || 'cloud').toLowerCase();
    this.mode = mode === 'local' ? 'local' : 'cloud';
    this.localDir = process.env.UPLOAD_DIR || './uploads';
    this.localBaseUrl = process.env.UPLOAD_BASE_URL || 'http://localhost:3000';

    this.logger.log(`存储模式: ${this.mode}`);
    if (this.mode === 'local') {
      this.logger.log(`本地存储目录: ${this.localDir}`);
      if (!existsSync(this.localDir)) {
        mkdirSync(this.localDir, { recursive: true });
      }
    }
  }

  private isCertificateError(error: unknown) {
    const err = error as { code?: string; message?: string };
    const message = (err?.message || '').toLowerCase();
    return (
      err?.code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
      err?.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
      err?.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
      message.includes('self-signed certificate') ||
      message.includes('unable to verify the first certificate')
    );
  }

  private getSafeUrl(url: string) {
    try {
      const parsedUrl = new URL(url);
      return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
    } catch {
      return url;
    }
  }

  private async requestWithStorageLog<T>(
    action: string,
    url: string,
    request: () => Promise<T>,
  ): Promise<T> {
    const safeUrl = this.getSafeUrl(url);
    this.logger.log(`${action}: ${safeUrl}`);

    try {
      return await request();
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (this.isCertificateError(error)) {
        this.logger.error(`${action} 证书校验失败: ${safeUrl}, code=${err?.code || ''}, message=${err?.message || ''}`);
      } else {
        this.logger.error(`${action} 请求失败: ${safeUrl}, code=${err?.code || ''}, message=${err?.message || ''}`);
      }
      throw error;
    }
  }

  /**
   * 获取微信 access_token（带缓存）
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.accessTokenExpireAt - 60000) {
      return this.accessToken;
    }

    const appid = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;

    if (!appid || !secret) {
      throw new Error('WX_APPID 或 WX_SECRET 未配置，无法获取 access_token');
    }

    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
    const { data } = await this.requestWithStorageLog(
      '获取微信 access_token',
      tokenUrl,
      () => axios.get(tokenUrl, { timeout: 10000 }),
    );

    if (data.errcode) {
      throw new Error(`获取 access_token 失败: ${data.errmsg}`);
    }

    this.accessToken = data.access_token;
    this.accessTokenExpireAt = Date.now() + data.expires_in * 1000;
    return this.accessToken;
  }

  /**
   * 上传文件
   * 返回 fileId，业务表直接保存此值
   * 云端: cloud://envId.bucket/path
   * 本地: uploads/xxx.png（相对路径）
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    folder = 'uploads',
    openid = '',
  ): Promise<UploadResult> {
    const ext = (extname(originalName) || '.bin').replace('.', '').toLowerCase();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
    const cloudPath = `${folder}/${filename}`;

    if (this.mode === 'local') {
      const dirPath = join(this.localDir, folder);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
      writeFileSync(join(this.localDir, cloudPath), fileBuffer);
      this.logger.log(`本地文件保存成功: ${cloudPath}`);
      return { fileId: cloudPath };
    }

    if (!this.envId) {
      throw new Error('CLOUD_ENV_ID 环境变量未设置');
    }

    const accessToken = await this.getAccessToken();

    // 调用 tcb/uploadfile 获取上传凭证
    // https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/development/storage/service/upload.html
    const uploadFileUrl = `https://api.weixin.qq.com/tcb/uploadfile?access_token=${accessToken}`;
    const { data: uploadRes } = await this.requestWithStorageLog(
      '获取云存储上传链接',
      uploadFileUrl,
      () => axios.post(
        uploadFileUrl,
        { env: this.envId, path: cloudPath },
        { timeout: 10000 },
      ),
    );

    if (uploadRes.errcode !== 0) {
      throw new Error(`获取上传链接失败: ${uploadRes.errmsg}`);
    }

    // 使用凭证直传文件到 COS
    await this.requestWithStorageLog('上传文件到云存储', uploadRes.url, () => {
      const form = new FormData();
      form.append('key', cloudPath);
      form.append('Signature', uploadRes.authorization);
      form.append('x-cos-security-token', uploadRes.token);
      form.append('x-cos-meta-fileid', uploadRes.cos_file_id);
      form.append('file', fileBuffer, originalName);

      return axios.post(uploadRes.url, form, {
        headers: form.getHeaders(),
        timeout: 30000,
      });
    });

    this.logger.log(`云端文件上传成功: ${cloudPath}`);

    // 返回微信官方 file_id（cloud://envId.bucket/path）
    return { fileId: uploadRes.file_id };
  }

  /**
   * 批量上传文件
   */
  async uploadFiles(
    files: Array<{ buffer: Buffer; originalname: string }>,
    folder = 'uploads',
    openid = '',
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    for (const file of files) {
      const result = await this.uploadFile(file.buffer, file.originalname, folder, openid);
      results.push(result);
    }
    return results;
  }

  /**
   * 通过 fileId 获取可访问的 URL
   * 本地模式：拼接 UPLOAD_BASE_URL + fileId
   * 云端模式：调用 batchdownloadfile 获取官方 download_url（带缓存）
   */
  async resolveUrl(fileId: string): Promise<string> {
    if (!fileId) return '';

    if (/^https?:\/\//i.test(fileId) || fileId.startsWith('/')) {
      return fileId;
    }

    // 本地模式（非 cloud:// 开头）
    if (!fileId.startsWith('cloud://')) {
      return `${this.localBaseUrl.replace(/\/$/, '')}/${fileId}`;
    }

    // 检查缓存
    const cached = this.urlCache.get(fileId);
    if (cached && Date.now() < cached.expireAt) {
      return cached.url;
    }

    // 云端模式：调用 batchdownloadfile
    // https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/development/storage/service/download.html
    const accessToken = await this.getAccessToken();
    const downloadUrl = `https://api.weixin.qq.com/tcb/batchdownloadfile?access_token=${accessToken}`;
    const { data } = await this.requestWithStorageLog(
      '获取云存储下载链接',
      downloadUrl,
      () => axios.post(
        downloadUrl,
        { env: this.envId, file_list: [{ fileid: fileId, max_age: 7200 }] },
        { timeout: 10000 },
      ),
    );

    if (data.errcode !== 0) {
      throw new Error(`获取下载链接失败: ${data.errmsg}`);
    }

    const fileInfo = data.file_list?.[0];
    if (!fileInfo || fileInfo.status !== 0) {
      throw new Error(`获取下载链接失败: ${fileInfo?.errmsg || '未知错误'}`);
    }

    const url = fileInfo.download_url;
    // 缓存有效期 = max_age - 300秒（提前5分钟过期）
    this.urlCache.set(fileId, { url, expireAt: Date.now() + 6900 * 1000 });
    return url;
  }

  /**
   * 批量解析 fileId 为 URL
   */
  async resolveUrls(fileIds: string[]): Promise<string[]> {
    const results: string[] = new Array(fileIds.length).fill('');
    const cloudIds: string[] = [];
    const cloudIndices: number[] = [];

    for (let i = 0; i < fileIds.length; i++) {
      if (!fileIds[i]) continue;

      if (/^https?:\/\//i.test(fileIds[i]) || fileIds[i].startsWith('/')) {
        results[i] = fileIds[i];
        continue;
      }

      if (!fileIds[i].startsWith('cloud://')) {
        // 本地模式直接拼接
        results[i] = `${this.localBaseUrl.replace(/\/$/, '')}/${fileIds[i]}`;
      } else {
        // 检查缓存
        const cached = this.urlCache.get(fileIds[i]);
        if (cached && Date.now() < cached.expireAt) {
          results[i] = cached.url;
        } else {
          cloudIds.push(fileIds[i]);
          cloudIndices.push(i);
        }
      }
    }

    if (cloudIds.length === 0) return results;

    // 批量调用 batchdownloadfile
    const accessToken = await this.getAccessToken();
    const downloadUrl = `https://api.weixin.qq.com/tcb/batchdownloadfile?access_token=${accessToken}`;
    const { data } = await this.requestWithStorageLog(
      '批量获取云存储下载链接',
      downloadUrl,
      () => axios.post(
        downloadUrl,
        { env: this.envId, file_list: cloudIds.map(id => ({ fileid: id, max_age: 7200 })) },
        { timeout: 10000 },
      ),
    );

    if (data.errcode !== 0) {
      throw new Error(`获取下载链接失败: ${data.errmsg}`);
    }

    for (let j = 0; j < cloudIds.length; j++) {
      const fileInfo = data.file_list?.[j];
      if (fileInfo && fileInfo.status === 0) {
        const url = fileInfo.download_url;
        this.urlCache.set(cloudIds[j], { url, expireAt: Date.now() + 6900 * 1000 });
        results[cloudIndices[j]] = url;
      }
    }

    return results;
  }

  /**
   * 通过 fileId 下载文件内容
   */
  async getFile(fileId: string): Promise<{ buffer: Buffer; originalName?: string }> {
    if (!fileId) {
      throw new Error('fileId 不能为空');
    }

    // 本地模式
    if (!fileId.startsWith('cloud://')) {
      const filePath = join(this.localDir, fileId);
      return { buffer: readFileSync(filePath) };
    }

    // 云端模式：获取 download_url 后下载
    const downloadUrl = await this.resolveUrl(fileId);
    const { data } = await this.requestWithStorageLog(
      '下载云存储文件',
      downloadUrl,
      () => axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      }),
    );

    return { buffer: Buffer.from(data) };
  }
}
