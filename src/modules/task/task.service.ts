import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { CacheKey, CacheVersionKey } from 'src/common/cache/cache-key.util';
import { bumpCacheVersion, getCacheVersion } from 'src/common/cache/cache-version.util';
import type { PaginationMeta } from 'src/common/utils/pagination.util';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { getPagination, getPaginationMeta } from 'src/common/utils/pagination.util';
import { ProjectRepository } from '../project/project.repository';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskRecord, TaskRepository, UpdateTaskData } from './task.repository';

export type TaskResponse = {
    id: string;
    title: string;
    description: string | null;
    status: string;
    dueDate: Date | null;
    projectId: string;
    assigneeId: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type TaskListResponse = {
    data: TaskResponse[];
    meta: {
        pagination: PaginationMeta;
    };
};

@Injectable()
export class TaskService {
    constructor(
        private readonly taskRepository: TaskRepository,
        private readonly projectRepository: ProjectRepository,
        private readonly configService: ConfigService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
        @InjectPinoLogger(TaskService.name) private readonly logger: PinoLogger,
    ) {}

    async create(user: AuthenticatedUser, projectId: string, dto: CreateTaskDto): Promise<TaskResponse> {
        await this.ensureProjectOwnedByUser(projectId, user.sub);

        const task = await this.taskRepository.create({
            projectId,
            title: dto.title.trim(),
            description: dto.description?.trim(),
            dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        });

        await this.invalidateTaskCache(user.sub);

        this.logger.info({ userId: user.sub, projectId, taskId: task.id }, 'Task created');

        return this.toResponse(task);
    }

    async findAllByProject(user: AuthenticatedUser, projectId: string, query: QueryTaskDto): Promise<TaskListResponse> {
        await this.ensureProjectOwnedByUser(projectId, user.sub);

        const pagination = getPagination({
            page: query.page,
            limit: query.limit,
        });

        const search = query.search?.trim();
        const version = await this.getTaskCacheVersion(user.sub);

        const cacheKey = CacheKey.taskList({
            userId: user.sub,
            version,
            projectId,
            page: pagination.page,
            limit: pagination.limit,
            search,
            status: query.status,
        });

        const cached = await this.cacheManager.get<TaskListResponse>(cacheKey);

        if (cached) {
            this.logger.info({ userId: user.sub, projectId, cacheKey }, 'Task list cache hit');
            return cached;
        }

        const [tasks, total] = await Promise.all([
            this.taskRepository.findManyByProject({
                ownerId: user.sub,
                projectId,
                search,
                status: query.status,
                skip: pagination.skip,
                take: pagination.take,
            }),
            this.taskRepository.countByProject({
                ownerId: user.sub,
                projectId,
                search,
                status: query.status,
            }),
        ]);

        const result: TaskListResponse = {
            data: tasks.map((task) => this.toResponse(task)),
            meta: {
                pagination: getPaginationMeta(pagination.page, pagination.limit, total),
            },
        };

        await this.cacheManager.set(cacheKey, result, this.getCacheTtlMs());

        this.logger.info({ userId: user.sub, projectId, cacheKey }, 'Task list cache set');

        return result;
    }

    async findOne(user: AuthenticatedUser, id: string): Promise<TaskResponse> {
        const version = await this.getTaskCacheVersion(user.sub);

        const cacheKey = CacheKey.taskDetail({
            userId: user.sub,
            version,
            taskId: id,
        });

        const cached = await this.cacheManager.get<TaskResponse>(cacheKey);

        if (cached) {
            this.logger.info({ userId: user.sub, taskId: id, cacheKey }, 'Task detail cache hit');
            return cached;
        }

        const task = await this.findOwnedTaskOrThrow(id, user.sub);
        const result = this.toResponse(task);

        await this.cacheManager.set(cacheKey, result, this.getCacheTtlMs());

        this.logger.info({ userId: user.sub, taskId: id, cacheKey }, 'Task detail cache set');

        return result;
    }

    async update(user: AuthenticatedUser, id: string, dto: UpdateTaskDto): Promise<TaskResponse> {
        await this.findOwnedTaskOrThrow(id, user.sub);

        const updateData: UpdateTaskData = {};

        if (dto.title !== undefined) {
            updateData.title = dto.title.trim();
        }

        if (dto.description !== undefined) {
            updateData.description = dto.description.trim();
        }

        if (dto.status !== undefined) {
            updateData.status = dto.status;
        }

        if (dto.dueDate !== undefined) {
            updateData.dueDate = new Date(dto.dueDate);
        }

        const task = await this.taskRepository.update(id, updateData);

        await this.invalidateTaskCache(user.sub);

        this.logger.info({ userId: user.sub, taskId: task.id }, 'Task updated');

        return this.toResponse(task);
    }

    async remove(user: AuthenticatedUser, id: string): Promise<{ id: string; deleted: true }> {
        const deletedCount = await this.taskRepository.softDeleteByIdAndOwner(id, user.sub);

        if (deletedCount === 0) {
            this.throwTaskNotFound();
        }

        await this.invalidateTaskCache(user.sub);

        this.logger.info({ userId: user.sub, taskId: id }, 'Task deleted');

        return {
            id,
            deleted: true,
        };
    }

    private async ensureProjectOwnedByUser(projectId: string, ownerId: string): Promise<void> {
        const project = await this.projectRepository.findByIdAndOwner(projectId, ownerId);

        if (!project) {
            throw new NotFoundException({
                code: 'PROJECT_NOT_FOUND',
                i18nKey: I18N_KEYS.error.project.notFound,
                message: 'Project not found',
            });
        }
    }

    private async findOwnedTaskOrThrow(id: string, ownerId: string): Promise<TaskRecord> {
        const task = await this.taskRepository.findByIdAndOwner(id, ownerId);

        if (!task) {
            this.throwTaskNotFound();
        }

        return task;
    }

    private async getTaskCacheVersion(userId: string): Promise<string> {
        return getCacheVersion(this.cacheManager, CacheVersionKey.tasks(userId));
    }

    private async invalidateTaskCache(userId: string): Promise<void> {
        await bumpCacheVersion(this.cacheManager, CacheVersionKey.tasks(userId));
    }

    private getCacheTtlMs(): number {
        return this.configService.get<number>('CACHE_TTL_MS') ?? 30000;
    }

    private toResponse(task: TaskRecord): TaskResponse {
        return {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            dueDate: task.dueDate,
            projectId: task.projectId,
            assigneeId: task.assigneeId,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
        };
    }

    private throwTaskNotFound(): never {
        throw new NotFoundException({
            code: 'TASK_NOT_FOUND',
            i18nKey: I18N_KEYS.error.task.notFound,
            message: 'Task not found',
        });
    }
}
