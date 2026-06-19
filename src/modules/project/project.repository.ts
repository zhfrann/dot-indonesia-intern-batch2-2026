import { Injectable } from '@nestjs/common';
import { ProjectStatus } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/common/prisma/prisma.service';

export type ProjectRecord = {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
};

export type FindProjectsParams = {
    ownerId: string;
    search?: string;
    status?: ProjectStatus;
    skip: number;
    take: number;
};

export type CreateProjectData = {
    ownerId: string;
    name: string;
    description?: string;
};

export type UpdateProjectData = {
    name?: string;
    description?: string;
    status?: ProjectStatus;
};

@Injectable()
export class ProjectRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateProjectData): Promise<ProjectRecord> {
        return this.prisma.project.create({
            data: {
                ownerId: data.ownerId,
                name: data.name,
                description: data.description,
            },
        });
    }

    async findMany(params: FindProjectsParams): Promise<ProjectRecord[]> {
        const where = {
            ownerId: params.ownerId,
            deletedAt: null,
            ...(params.status ? { status: params.status } : {}),
            ...(params.search
                ? {
                      OR: [{ name: { contains: params.search } }, { description: { contains: params.search } }],
                  }
                : {}),
        };

        return this.prisma.project.findMany({
            where,
            orderBy: {
                createdAt: 'desc',
            },
            skip: params.skip,
            take: params.take,
        });
    }

    async count(params: Omit<FindProjectsParams, 'skip' | 'take'>): Promise<number> {
        const where = {
            ownerId: params.ownerId,
            deletedAt: null,
            ...(params.status ? { status: params.status } : {}),
            ...(params.search
                ? {
                      OR: [{ name: { contains: params.search } }, { description: { contains: params.search } }],
                  }
                : {}),
        };

        return this.prisma.project.count({
            where,
        });
    }

    async findByIdAndOwner(id: string, ownerId: string): Promise<ProjectRecord | null> {
        return this.prisma.project.findFirst({
            where: {
                id,
                ownerId,
                deletedAt: null,
            },
        });
    }

    async update(id: string, data: UpdateProjectData): Promise<ProjectRecord> {
        return this.prisma.project.update({
            where: {
                id,
            },
            data,
        });
    }

    async softDeleteByIdAndOwner(id: string, ownerId: string): Promise<number> {
        const result = await this.prisma.project.updateMany({
            where: {
                id,
                ownerId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        return result.count;
    }
}
