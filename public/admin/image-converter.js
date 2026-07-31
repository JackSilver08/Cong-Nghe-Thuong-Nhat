const WEBP_MIME = 'image/webp';
const DEFAULT_QUALITY = 0.82;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

function webpName(name) {
  const base = String(name || 'image')
    .replace(/\.[^.]+$/, '')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'image';
  return `${base}.webp`;
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Trình duyệt không thể tạo ảnh WebP.')),
      WEBP_MIME,
      quality,
    );
  });
}

async function decodeImage(file) {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file, { imageOrientation: 'from-image' });
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Convert the first frame of any browser-supported image into WebP. */
export async function convertImageToWebp(file, options = {}) {
  if (!(file instanceof Blob) || !String(file.type || '').startsWith('image/')) {
    throw new Error('Tệp đã chọn không phải là ảnh hợp lệ.');
  }
  if (file.size > (options.maxSourceBytes || MAX_SOURCE_BYTES)) {
    throw new Error('Ảnh gốc không được lớn hơn 20 MB.');
  }
  if (!file.size) throw new Error('Tệp ảnh đang trống.');

  let source;
  try {
    source = await decodeImage(file);
  } catch {
    throw new Error('Trình duyệt không đọc được định dạng ảnh này.');
  }

  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  if (!width || !height) {
    source.close?.();
    throw new Error('Ảnh không có kích thước hợp lệ.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) {
    source.close?.();
    throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
  }
  context.drawImage(source, 0, 0, width, height);
  source.close?.();

  const blob = await canvasToBlob(canvas, options.quality ?? DEFAULT_QUALITY);
  return new File([blob], webpName(file.name), {
    type: WEBP_MIME,
    lastModified: Date.now(),
  });
}
