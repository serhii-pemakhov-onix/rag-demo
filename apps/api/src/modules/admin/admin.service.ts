import { Injectable } from '@nestjs/common';
import type { CreateArticleDto, UpdateArticleDto } from './dto/article.dto';
import type { UploadImageDto } from './dto/image.dto';

@Injectable()
export class AdminService {
  // Articles
  async getArticles() {
    // TODO: Implement with Prisma
    return [];
  }

  async createArticle(data: CreateArticleDto) {
    // TODO: Implement with Prisma
    return { id: 'placeholder', ...data };
  }

  async updateArticle(id: string, data: UpdateArticleDto) {
    // TODO: Implement with Prisma
    return { id, ...data };
  }

  async deleteArticle(id: string) {
    // TODO: Implement with Prisma
    return { id, deleted: true };
  }

  // Images
  async getImages() {
    // TODO: Implement with Prisma and MinIO
    return [];
  }

  async uploadImage(data: UploadImageDto) {
    // TODO: Implement with MinIO
    return { id: 'placeholder', ...data };
  }

  async deleteImage(id: string) {
    // TODO: Implement with Prisma and MinIO
    return { id, deleted: true };
  }
}
