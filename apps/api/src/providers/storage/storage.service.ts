import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { DOCUMENTS_BUCKET, IMAGES_BUCKET } from './storage.config';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Minio.Client;

  constructor(private configService: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.configService.get<number>('MINIO_PORT', 9000),
      useSSL: false,
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists(DOCUMENTS_BUCKET);
    await this.ensureBucketExists(IMAGES_BUCKET);
  }

  async ensureBucketExists(bucket: string): Promise<void> {
    try {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket);
        this.logger.log(`Created bucket: ${bucket}`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure bucket exists: ${bucket}`, error);
      throw error;
    }
  }

  async uploadFile(
    bucket: string,
    key: string,
    data: Buffer,
    metadata?: Record<string, string>,
  ): Promise<{ bucket: string; key: string; etag: string }> {
    const result = await this.client.putObject(bucket, key, data, data.length, metadata);
    this.logger.log(`Uploaded file: ${bucket}/${key}`);
    return { bucket, key, etag: result.etag };
  }

  async getFile(bucket: string, key: string): Promise<Buffer> {
    const stream = await this.client.getObject(bucket, key);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    await this.client.removeObject(bucket, key);
    this.logger.log(`Deleted file: ${bucket}/${key}`);
  }

  async listFiles(bucket: string, prefix?: string): Promise<string[]> {
    const files: string[] = [];
    const stream = this.client.listObjects(bucket, prefix, true);

    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => {
        if (obj.name) { files.push(obj.name); }
      });
      stream.on('end', () => resolve(files));
      stream.on('error', reject);
    });
  }
}
