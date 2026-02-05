import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipAuth } from '../../common/decorators/skip-auth.decorator';
import { ChatService } from './chat.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @SkipAuth()
  @ApiOperation({ summary: 'Send a message and get AI response with RAG' })
  @ApiResponse({
    status: 200,
    description: 'AI response with sources and images',
    type: ChatResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async chat(@Body() body: ChatRequestDto) {
    return this.chatService.processMessage(body);
  }
}
