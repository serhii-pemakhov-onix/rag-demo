import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
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

  @Post('stream')
  @SkipAuth()
  @ApiOperation({ summary: 'Stream AI response via SSE' })
  async chatStream(@Body() body: ChatRequestDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let closed = false;
    res.on('close', () => {
      closed = true;
    });

    for await (const event of this.chatService.processMessageStream(body)) {
      if (closed) {
        break;
      }
      res.write(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`);
    }

    if (!closed) {
      res.end();
    }
  }
}
