import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectService } from './project.service';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller({
    path: 'projects',
    version: '1',
})
export class ProjectController {
    constructor(private readonly projectService: ProjectService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new project' })
    @ApiResponse({ status: 201, description: 'Project created successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ResponseMessage(I18N_KEYS.response.project.created)
    async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProjectDto) {
        return this.projectService.create(user, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get current user projects' })
    @ApiResponse({ status: 200, description: 'Projects fetched successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ResponseMessage(I18N_KEYS.response.project.fetched)
    async findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryProjectDto) {
        return this.projectService.findAll(user, query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get project detail' })
    @ApiParam({ name: 'id', description: 'Project ID' })
    @ApiResponse({ status: 200, description: 'Project fetched successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    @ResponseMessage(I18N_KEYS.response.project.fetched)
    async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.projectService.findOne(user, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update project' })
    @ApiParam({ name: 'id', description: 'Project ID' })
    @ApiResponse({ status: 200, description: 'Project updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    @ResponseMessage(I18N_KEYS.response.project.updated)
    async update(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Body() dto: UpdateProjectDto,
    ) {
        return this.projectService.update(user, id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete project' })
    @ApiParam({ name: 'id', description: 'Project ID' })
    @ApiResponse({ status: 200, description: 'Project deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    @ResponseMessage(I18N_KEYS.response.project.deleted)
    async remove(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.projectService.remove(user, id);
    }
}
