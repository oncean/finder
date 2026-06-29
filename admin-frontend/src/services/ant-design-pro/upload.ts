import { request } from '@umijs/max';

export interface UploadResponse {
  fileId?: string;
  url: string;
  filename: string;
  size: number;
}

/** 上传图片 */
export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request<UploadResponse>('/api/v1/upload/image', {
    method: 'POST',
    data: formData,
  });

  return response;
}
