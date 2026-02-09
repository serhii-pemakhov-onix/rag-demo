import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipAuth } from '../../common/decorators/skip-auth.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ImageValidationPipe } from '../../common/pipes/image-validation.pipe';
import {
  GetImagesQueryDto,
  ImageResponseDto,
  ImageWithAgentResponseDto,
  UploadImageDto,
} from './dto/image.dto';
import { ImagesService } from './images.service';

@ApiTags('images')
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all images' })
  @ApiQuery({
    name: 'agentId',
    required: false,
    description: 'Filter by agent ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
  })
  @ApiResponse({
    status: 200,
    description: 'List of images',
    type: [ImageWithAgentResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async findAll(@Query() query: GetImagesQueryDto) {
    return this.imagesService.findAll(query);
  }

  @Get(':id/file')
  @SkipAuth()
  @ApiOperation({ summary: 'Get image file content' })
  @ApiParam({ name: 'id', description: 'Image ID' })
  @ApiResponse({ status: 200, description: 'Image file content' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async getFile(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const image = await this.imagesService.findById(id);
    const buffer = await this.imagesService.getFileContent(id);

    res.set({
      'Content-Type': image.mimeType,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=86400',
    });

    res.send(buffer);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get an image by ID' })
  @ApiParam({ name: 'id', description: 'Image ID' })
  @ApiResponse({
    status: 200,
    description: 'Image details',
    type: ImageWithAgentResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.imagesService.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a new image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'agentId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (max 5MB)',
        },
        agentId: {
          type: 'string',
          format: 'uuid',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    },
  })
  @ApiResponse({
    status: 202,
    description: 'Image accepted for processing',
    type: ImageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async upload(
    @UploadedFile(ImageValidationPipe) file: Express.Multer.File,
    @Body() body: UploadImageDto,
  ) {
    return this.imagesService.upload(file, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete an image' })
  @ApiParam({ name: 'id', description: 'Image ID' })
  @ApiResponse({ status: 200, description: 'Image deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.imagesService.delete(id);
  }
}
