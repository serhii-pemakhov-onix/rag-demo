import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

@ApiTags('chat')
@ApiBearerAuth('access-token')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message and get AI response with RAG' })
  @ApiResponse({
    status: 200,
    description: 'AI response with sources',
    type: ChatResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async chat(@Body() body: ChatRequestDto) {
    return this.chatService.processMessage(body.message);
  }
}
