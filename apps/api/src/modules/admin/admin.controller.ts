import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateArticleDto, UpdateArticleDto } from './dto/article.dto';
import { UploadImageDto } from './dto/image.dto';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Articles CRUD
  @Get('articles')
  @ApiOperation({ summary: 'Get all articles' })
  @ApiResponse({ status: 200, description: 'List of articles' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getArticles() {
    return this.adminService.getArticles();
  }

  @Post('articles')
  @ApiOperation({ summary: 'Create a new article' })
  @ApiResponse({ status: 201, description: 'Article created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createArticle(@Body() body: CreateArticleDto) {
    return this.adminService.createArticle(body);
  }

  @Put('articles/:id')
  @ApiOperation({ summary: 'Update an article' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  @ApiResponse({ status: 200, description: 'Article updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async updateArticle(@Param('id') id: string, @Body() body: UpdateArticleDto) {
    return this.adminService.updateArticle(id, body);
  }

  @Delete('articles/:id')
  @ApiOperation({ summary: 'Delete an article' })
  @ApiParam({ name: 'id', description: 'Article ID' })
  @ApiResponse({ status: 200, description: 'Article deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async deleteArticle(@Param('id') id: string) {
    return this.adminService.deleteArticle(id);
  }

  // Images CRUD
  @Get('images')
  @ApiOperation({ summary: 'Get all images' })
  @ApiResponse({ status: 200, description: 'List of images' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getImages() {
    return this.adminService.getImages();
  }

  @Post('images')
  @ApiOperation({ summary: 'Upload a new image' })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadImage(@Body() body: UploadImageDto) {
    return this.adminService.uploadImage(body);
  }

  @Delete('images/:id')
  @ApiOperation({ summary: 'Delete an image' })
  @ApiParam({ name: 'id', description: 'Image ID' })
  @ApiResponse({ status: 200, description: 'Image deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async deleteImage(@Param('id') id: string) {
    return this.adminService.deleteImage(id);
  }
}
