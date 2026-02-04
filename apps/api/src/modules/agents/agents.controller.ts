import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AgentsService } from './agents.service';
import {
  AgentQueryDto,
  AgentWithSystemPromptDto,
  CreateAgentDto,
  PaginatedAgentsResponseDto,
  UpdateAgentDto,
} from './dto/agent.dto';

@ApiTags('agents')
@ApiBearerAuth('access-token')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all agents (with optional pagination)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'List of agents (paginated if query params provided)',
    type: PaginatedAgentsResponseDto,
  })
  async findAll(@Query() query: AgentQueryDto) {
    // If no pagination params provided, return all agents (backward compatible)
    if (query.page === undefined && query.limit === undefined) {
      return this.agentsService.findAll();
    }
    // Use pagination with defaults
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    return this.agentsService.findAllPaginated(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an agent by ID' })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  @ApiResponse({
    status: 200,
    description: 'Agent details',
    type: AgentWithSystemPromptDto,
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new agent (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Agent created',
    type: AgentWithSystemPromptDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 409, description: 'Agent with this slug already exists' })
  async create(@Body() dto: CreateAgentDto) {
    return this.agentsService.create(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update an agent (Admin only)' })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  @ApiResponse({
    status: 200,
    description: 'Agent updated',
    type: AgentWithSystemPromptDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAgentDto) {
    return this.agentsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete an agent (Admin only)' })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  @ApiResponse({ status: 200, description: 'Agent deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.delete(id);
  }
}
