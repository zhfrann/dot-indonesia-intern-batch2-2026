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
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectRecord, ProjectRepository, UpdateProjectData } from './project.repository';

export type ProjectResponse = {
    id: string;
    name: string;
    description: string | null;
    status: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
};

export type ProjectListResponse = {
    data: ProjectResponse[];
    meta: {
        pagination: PaginationMeta;
    };
};

@Injectable()
export class ProjectService {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly configService: ConfigService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
        @InjectPinoLogger(ProjectService.name) private readonly logger: PinoLogger,
    ) {}

    async create(user: AuthenticatedUser, dto: CreateProjectDto): Promise<ProjectResponse> {
        const project = await this.projectRepository.create({
            ownerId: user.sub,
            name: dto.name.trim(),
            description: dto.description?.trim(),
        });

        await this.invalidateProjectCache(user.sub);

        this.logger.info({ userId: user.sub, projectId: project.id }, 'Project created');

        return this.toResponse(project);
    }

    async findAll(user: AuthenticatedUser, query: QueryProjectDto): Promise<ProjectListResponse> {
        const pagination = getPagination({
            page: query.page,
            limit: query.limit,
        });

        const search = query.search?.trim();
        const version = await this.getProjectCacheVersion(user.sub);

        const cacheKey = CacheKey.projectList({
            userId: user.sub,
            version,
            page: pagination.page,
            limit: pagination.limit,
            search,
            status: query.status,
        });

        const cached = await this.cacheManager.get<ProjectListResponse>(cacheKey);

        if (cached) {
            this.logger.info({ userId: user.sub, cacheKey }, 'Project list cache hit');
            return cached;
        }

        const [projects, total] = await Promise.all([
            this.projectRepository.findMany({
                ownerId: user.sub,
                search,
                status: query.status,
                skip: pagination.skip,
                take: pagination.take,
            }),
            this.projectRepository.count({
                ownerId: user.sub,
                search,
                status: query.status,
            }),
        ]);

        const result: ProjectListResponse = {
            data: projects.map((project) => this.toResponse(project)),
            meta: {
                pagination: getPaginationMeta(pagination.page, pagination.limit, total),
            },
        };

        await this.cacheManager.set(cacheKey, result, this.getCacheTtlMs());

        this.logger.info({ userId: user.sub, cacheKey }, 'Project list cache set');

        return result;
    }

    async findOne(user: AuthenticatedUser, id: string): Promise<ProjectResponse> {
        const version = await this.getProjectCacheVersion(user.sub);

        const cacheKey = CacheKey.projectDetail({
            userId: user.sub,
            version,
            projectId: id,
        });

        const cached = await this.cacheManager.get<ProjectResponse>(cacheKey);

        if (cached) {
            this.logger.info({ userId: user.sub, projectId: id, cacheKey }, 'Project detail cache hit');
            return cached;
        }

        const project = await this.findOwnedProjectOrThrow(id, user.sub);
        const result = this.toResponse(project);

        await this.cacheManager.set(cacheKey, result, this.getCacheTtlMs());

        this.logger.info({ userId: user.sub, projectId: id, cacheKey }, 'Project detail cache set');

        return result;
    }

    async update(user: AuthenticatedUser, id: string, dto: UpdateProjectDto): Promise<ProjectResponse> {
        await this.findOwnedProjectOrThrow(id, user.sub);

        const updateData: UpdateProjectData = {};

        if (dto.name !== undefined) {
            updateData.name = dto.name.trim();
        }

        if (dto.description !== undefined) {
            updateData.description = dto.description.trim();
        }

        if (dto.status !== undefined) {
            updateData.status = dto.status;
        }

        const project = await this.projectRepository.update(id, updateData);

        await this.invalidateProjectCache(user.sub);

        this.logger.info({ userId: user.sub, projectId: project.id }, 'Project updated');

        return this.toResponse(project);
    }

    async remove(user: AuthenticatedUser, id: string): Promise<{ id: string; deleted: true }> {
        const deletedCount = await this.projectRepository.softDeleteByIdAndOwner(id, user.sub);

        if (deletedCount === 0) {
            this.throwProjectNotFound();
        }

        await this.invalidateProjectCache(user.sub);
        await this.invalidateTaskCache(user.sub);

        this.logger.info({ userId: user.sub, projectId: id }, 'Project deleted');

        return {
            id,
            deleted: true,
        };
    }

    private async findOwnedProjectOrThrow(id: string, ownerId: string): Promise<ProjectRecord> {
        const project = await this.projectRepository.findByIdAndOwner(id, ownerId);

        if (!project) {
            this.throwProjectNotFound();
        }

        return project;
    }

    private async getProjectCacheVersion(userId: string): Promise<string> {
        return getCacheVersion(this.cacheManager, CacheVersionKey.projects(userId));
    }

    private async invalidateProjectCache(userId: string): Promise<void> {
        await bumpCacheVersion(this.cacheManager, CacheVersionKey.projects(userId));
    }

    private async invalidateTaskCache(userId: string): Promise<void> {
        await bumpCacheVersion(this.cacheManager, CacheVersionKey.tasks(userId));
    }

    private getCacheTtlMs(): number {
        return this.configService.get<number>('CACHE_TTL_MS') ?? 30000;
    }

    private toResponse(project: ProjectRecord): ProjectResponse {
        return {
            id: project.id,
            name: project.name,
            description: project.description,
            status: project.status,
            ownerId: project.ownerId,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
    }

    private throwProjectNotFound(): never {
        throw new NotFoundException({
            code: 'PROJECT_NOT_FOUND',
            i18nKey: I18N_KEYS.error.project.notFound,
            message: 'Project not found',
        });
    }
}
