import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '../../providers/storage/storage.config';

@Injectable()
export class ImageValidationPipe implements PipeTransform {
  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
      );
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      );
    }

    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    file.originalname = sanitizedFilename;

    return file;
  }
}
