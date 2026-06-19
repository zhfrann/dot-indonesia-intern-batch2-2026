import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { TaskStatus } from 'src/generated/prisma/enums';

export type TaskRecord = {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    dueDate: Date | null;
    projectId: string;
    assigneeId: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
};

export type CreateTaskData = {
    projectId: string;
    title: string;
    description?: string;
    dueDate?: Date;
};

export type UpdateTaskData = {
    title?: string;
    description?: string;
    status?: TaskStatus;
    dueDate?: Date;
};

export type FindTasksParams = {
    ownerId: string;
    projectId: string;
    search?: string;
    status?: TaskStatus;
    skip: number;
    take: number;
};

@Injectable()
export class TaskRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateTaskData): Promise<TaskRecord> {
        return this.prisma.task.create({
            data: {
                projectId: data.projectId,
                title: data.title,
                description: data.description,
                dueDate: data.dueDate,
            },
        });
    }

    async findManyByProject(params: FindTasksParams): Promise<TaskRecord[]> {
        const where = {
            projectId: params.projectId,
            deletedAt: null,
            project: {
                is: {
                    ownerId: params.ownerId,
                    deletedAt: null,
                },
            },
            ...(params.status ? { status: params.status } : {}),
            ...(params.search
                ? {
                      OR: [{ title: { contains: params.search } }, { description: { contains: params.search } }],
                  }
                : {}),
        };

        return this.prisma.task.findMany({
            where,
            orderBy: {
                createdAt: 'desc',
            },
            skip: params.skip,
            take: params.take,
        });
    }

    async countByProject(params: Omit<FindTasksParams, 'skip' | 'take'>): Promise<number> {
        const where = {
            projectId: params.projectId,
            deletedAt: null,
            project: {
                is: {
                    ownerId: params.ownerId,
                    deletedAt: null,
                },
            },
            ...(params.status ? { status: params.status } : {}),
            ...(params.search
                ? {
                      OR: [{ title: { contains: params.search } }, { description: { contains: params.search } }],
                  }
                : {}),
        };

        return this.prisma.task.count({
            where,
        });
    }

    async findByIdAndOwner(id: string, ownerId: string): Promise<TaskRecord | null> {
        return this.prisma.task.findFirst({
            where: {
                id,
                deletedAt: null,
                project: {
                    is: {
                        ownerId,
                        deletedAt: null,
                    },
                },
            },
        });
    }

    async update(id: string, data: UpdateTaskData): Promise<TaskRecord> {
        return this.prisma.task.update({
            where: {
                id,
            },
            data,
        });
    }

    async softDeleteByIdAndOwner(id: string, ownerId: string): Promise<number> {
        const result = await this.prisma.task.updateMany({
            where: {
                id,
                deletedAt: null,
                project: {
                    is: {
                        ownerId,
                        deletedAt: null,
                    },
                },
            },
            data: {
                deletedAt: new Date(),
            },
        });

        return result.count;
    }
}
