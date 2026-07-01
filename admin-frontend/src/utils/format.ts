const numberFormatter = new Intl.NumberFormat('en-US');

/**
 * Format a number with thousand separators.
 * Replaces numeral(val).format('0,0')
 */
export const formatNumber = (val: number | string): string => {
  const parsed = Number(val);
  return Number.isFinite(parsed) ? numberFormatter.format(parsed) : '';
};

/**
 * Format a number as yuan currency string.
 * Replaces `¥ ${numeral(val).format('0,0')}`
 */
export const formatYuan = (val: number | string) => `¥ ${formatNumber(val)}`;

/**
 * 获取图片的完整访问 URL
 * 数据库存储的是 fileId (如 cloud://xxx)
 * 通过后端 /api/v1/storage/image 接口获取图片数据
 */
export const getImageUrl = (fileId: string | undefined | null): string => {
  console.info("fileId" + fileId)
  if (!fileId) return '';
  // 如果是 http 开头，直接返回
  if (fileId.startsWith('http://') || fileId.startsWith('https://')) {
    return fileId;
  }
  // 其他情况通过后端接口获取
  return `/api/v1/storage/image?fileid=${encodeURIComponent(fileId)}`;
};
