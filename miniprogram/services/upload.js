const { CLOUD_ENV_ID } = require('../utils/config');

function getFileExtension(filePath) {
  const cleanPath = (filePath || '').split('?')[0];
  const matched = cleanPath.match(/\.([a-zA-Z0-9]+)$/);
  return matched ? matched[1].toLowerCase() : 'bin';
}

function createCloudPath(filePath, folder = 'uploads/files') {
  const ext = getFileExtension(filePath);
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  return `${folder}/${timestamp}-${random}.${ext}`;
}

async function uploadFile(filePath, options = {}) {
  if (!filePath) {
    throw new Error('文件路径不能为空');
  }

  if (!CLOUD_ENV_ID || !wx.cloud || !wx.cloud.uploadFile) {
    throw new Error('微信云存储未初始化，无法上传文件');
  }

  const cloudPath = options.cloudPath || createCloudPath(filePath, options.folder);
  const result = await wx.cloud.uploadFile({
    cloudPath,
    filePath
  });

  return {
    fileId: result.fileID,
    fileID: result.fileID,
    cloudPath
  };
}

function uploadImage(filePath, options = {}) {
  return uploadFile(filePath, {
    folder: 'uploads/images',
    ...options
  });
}

module.exports = {
  uploadFile,
  uploadImage
};
