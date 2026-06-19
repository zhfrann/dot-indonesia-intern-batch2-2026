import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class ProjectService {
    constructor(
        private readonly projectRepository: ProjectRepository,
        @InjectPinoLogger(ProjectService.name) private readonly logger: PinoLogger,
    ) {}

    async create(user: AuthenticatedUser, dto: CreateProjectDto): Promise<ProjectResponse> {
        const project = await this.projectRepository.create({
            ownerId: user.sub,
            name: dto.name.trim(),
            description: dto.description?.trim(),
        });

        this.logger.info({ userId: user.sub, projectId: project.id }, 'Project created');

        return this.toResponse(project);
    }

    async findAll(user: AuthenticatedUser, query: QueryProjectDto) {
        const pagination = getPagination({
            page: query.page,
            limit: query.limit,
        });

        const search = query.search?.trim();

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

        return {
            data: projects.map((project) => this.toResponse(project)),
            meta: {
                pagination: getPaginationMeta(pagination.page, pagination.limit, total),
            },
        };
    }

    async findOne(user: AuthenticatedUser, id: string): Promise<ProjectResponse> {
        const project = await this.findOwnedProjectOrThrow(id, user.sub);

        return this.toResponse(project);
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

        this.logger.info({ userId: user.sub, projectId: project.id }, 'Project updated');

        return this.toResponse(project);
    }

    async remove(user: AuthenticatedUser, id: string): Promise<{ id: string; deleted: true }> {
        const deletedCount = await this.projectRepository.softDeleteByIdAndOwner(id, user.sub);

        if (deletedCount === 0) {
            this.throwProjectNotFound();
        }

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
