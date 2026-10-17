const CLOUDINARY_VIDEO_URL = 'https://api.cloudinary.com/v1_1/xthesdbd/video/upload';
const CLOUDINARY_IMAGE_URL = 'https://api.cloudinary.com/v1_1/xthesdbd/image/upload';
const UPLOAD_PRESET = 'rahoa_listings';
const MAX_FILE_SIZE = 30 * 1024 * 1024;

export interface CloudinaryUploadResult {
  secure_url: string;
}

function uploadToCloudinary(
  file: File,
  uploadUrl: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);

    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as CloudinaryUploadResult;
          if (!data.secure_url) {
            reject(new Error('Cloudinary did not return an image URL.'));
            return;
          }
          resolve(data.secure_url);
        } catch {
          reject(new Error('Failed to parse Cloudinary response.'));
        }
      } else {
        reject(new Error('Image upload failed. Please choose a different image and try again.'));
      }
    };

    xhr.onerror = () => reject(new Error('Image upload failed. Please check your connection and try again.'));
    xhr.send(formData);
  });
}

export async function uploadImageToCloudinary(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  return uploadToCloudinary(file, CLOUDINARY_IMAGE_URL, onProgress);
}

export async function uploadVideoToCloudinary(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Video file exceeds 30MB. Please choose a shorter clip (under 30s).');
  }

  return uploadToCloudinary(file, CLOUDINARY_VIDEO_URL, onProgress).catch((error: unknown) => {
    if (error instanceof Error && error.message.startsWith('Video upload')) {
      throw error;
    }
    throw new Error('Video upload failed. Please choose a shorter clip (under 30s).');
  });
}

export { MAX_FILE_SIZE };
