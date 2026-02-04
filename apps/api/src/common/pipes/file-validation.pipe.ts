import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../../providers/storage/storage.config';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    file.originalname = sanitizedFilename;

    return file;
  }
}
