import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskService } from './task.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller({
    path: '',
    version: '1',
})
export class TaskController {
    constructor(private readonly taskService: TaskService) {}

    @Post('projects/:projectId/tasks')
    @ApiOperation({ summary: 'Create a task inside a project' })
    @ApiParam({ name: 'projectId', description: 'Project ID' })
    @ApiResponse({ status: 201, description: 'Task created successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    @ResponseMessage(I18N_KEYS.response.task.created)
    async create(
        @CurrentUser() user: AuthenticatedUser,
        @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
        @Body() dto: CreateTaskDto,
    ) {
        return this.taskService.create(user, projectId, dto);
    }

    @Get('projects/:projectId/tasks')
    @ApiOperation({ summary: 'Get tasks by project' })
    @ApiParam({ name: 'projectId', description: 'Project ID' })
    @ApiResponse({ status: 200, description: 'Tasks fetched successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Project not found' })
    @ResponseMessage(I18N_KEYS.response.task.fetched)
    async findAllByProject(
        @CurrentUser() user: AuthenticatedUser,
        @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
        @Query() query: QueryTaskDto,
    ) {
        return this.taskService.findAllByProject(user, projectId, query);
    }

    @Get('tasks/:id')
    @ApiOperation({ summary: 'Get task detail' })
    @ApiParam({ name: 'id', description: 'Task ID' })
    @ApiResponse({ status: 200, description: 'Task fetched successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Task not found' })
    @ResponseMessage(I18N_KEYS.response.task.fetched)
    async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.taskService.findOne(user, id);
    }

    @Patch('tasks/:id')
    @ApiOperation({ summary: 'Update task' })
    @ApiParam({ name: 'id', description: 'Task ID' })
    @ApiResponse({ status: 200, description: 'Task updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Task not found' })
    @ResponseMessage(I18N_KEYS.response.task.updated)
    async update(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Body() dto: UpdateTaskDto,
    ) {
        return this.taskService.update(user, id, dto);
    }

    @Delete('tasks/:id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete task' })
    @ApiParam({ name: 'id', description: 'Task ID' })
    @ApiResponse({ status: 200, description: 'Task deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Task not found' })
    @ResponseMessage(I18N_KEYS.response.task.deleted)
    async remove(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.taskService.remove(user, id);
    }
}
