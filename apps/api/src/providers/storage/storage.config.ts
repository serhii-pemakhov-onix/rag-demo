export const DOCUMENTS_BUCKET = 'documents';
export const IMAGES_BUCKET = 'images';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export const ALLOWED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'text/html',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
];

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
