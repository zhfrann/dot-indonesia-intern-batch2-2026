import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

type AuthResponseData = {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        name: string;
        createdAt: string;
        updatedAt: string;
    };
};

type ProjectResponseData = {
    id: string;
    name: string;
    description: string | null;
    status: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
};

type TaskResponseData = {
    id: string;
    title: string;
    description: string | null;
    status: string;
    dueDate: string | null;
    projectId: string;
    assigneeId: string | null;
    createdAt: string;
    updatedAt: string;
};

type Envelope<T> = {
    message: string;
    data: T;
    meta: {
        requestId: string;
        timestamp: string;
        pagination?: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
};

describe('End 2 End Test', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const testUser = {
        email: 'e2e-user@example.com',
        name: 'E2E User',
        password: 'password123',
    };

    let accessToken: string;
    let refreshToken: string;
    let projectId: string;
    let taskId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        app.use(cookieParser());

        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: '1',
        });

        await app.init();

        prisma = app.get(PrismaService);

        await resetDatabase();
    });

    afterAll(async () => {
        await resetDatabase();
        await app.close();
    });

    async function resetDatabase() {
        await prisma.task.deleteMany();
        await prisma.project.deleteMany();
        await prisma.authSession.deleteMany();
        await prisma.user.deleteMany();
    }

    describe('Auth Token API', () => {
        it('should register a new user and return access token + refresh token', async () => {
            const response = await request(app.getHttpServer()).post('/v1/auth/register').send(testUser).expect(201);

            const body = response.body as Envelope<AuthResponseData>;

            expect(body.data.accessToken).toEqual(expect.any(String));
            expect(body.data.refreshToken).toEqual(expect.any(String));
            expect(body.data.user.email).toBe(testUser.email);
            expect(body.data.user.name).toBe(testUser.name);
            expect(body.data.user).not.toHaveProperty('password');
            expect(body.data.user).not.toHaveProperty('passwordHash');

            accessToken = body.data.accessToken;
            refreshToken = body.data.refreshToken;
        });

        it('should login and return access token + refresh token', async () => {
            const response = await request(app.getHttpServer())
                .post('/v1/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                })
                .expect(200);

            const body = response.body as Envelope<AuthResponseData>;

            expect(body.data.accessToken).toEqual(expect.any(String));
            expect(body.data.refreshToken).toEqual(expect.any(String));
            expect(body.data.user.email).toBe(testUser.email);

            accessToken = body.data.accessToken;
            refreshToken = body.data.refreshToken;
        });

        it('should reject login with wrong password', async () => {
            await request(app.getHttpServer())
                .post('/v1/auth/login')
                .send({
                    email: testUser.email,
                    password: 'wrongpassword',
                })
                .expect(401);
        });

        it('should reject protected endpoint without token', async () => {
            await request(app.getHttpServer()).get('/v1/auth/me').expect(401);
        });

        it('should access protected endpoint with valid token', async () => {
            const response = await request(app.getHttpServer())
                .get('/v1/auth/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            const body = response.body as Envelope<AuthResponseData['user']>;

            expect(body.data.email).toBe(testUser.email);
            expect(body.data.name).toBe(testUser.name);
        });

        it('should reject protected endpoint with invalid token', async () => {
            await request(app.getHttpServer()).get('/v1/auth/me').set('Authorization', 'Bearer invalid-token').expect(401);
        });

        it('should refresh token', async () => {
            const response = await request(app.getHttpServer())
                .post('/v1/auth/refresh')
                .send({
                    refreshToken,
                })
                .expect(200);

            const body = response.body as Envelope<AuthResponseData>;

            expect(body.data.accessToken).toEqual(expect.any(String));
            expect(body.data.refreshToken).toEqual(expect.any(String));
            expect(body.data.user.email).toBe(testUser.email);

            accessToken = body.data.accessToken;
            refreshToken = body.data.refreshToken;
        });
    });

    describe('Project CRUD', () => {
        it('should create a project', async () => {
            const response = await request(app.getHttpServer())
                .post('/v1/projects')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: 'E2E Project',
                    description: 'Project created from e2e test.',
                })
                .expect(201);

            const body = response.body as Envelope<ProjectResponseData>;

            expect(body.data.id).toEqual(expect.any(String));
            expect(body.data.name).toBe('E2E Project');
            expect(body.data.description).toBe('Project created from e2e test.');
            expect(body.data.status).toBe('ACTIVE');

            projectId = body.data.id;
        });

        it('should get project list', async () => {
            const response = await request(app.getHttpServer())
                .get('/v1/projects?page=1&limit=10')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            const body = response.body as Envelope<ProjectResponseData[]>;

            expect(Array.isArray(body.data)).toBe(true);
            expect(body.data.length).toBeGreaterThanOrEqual(1);
            expect(body.meta.pagination).toBeDefined();
            expect(body.meta.pagination?.page).toBe(1);
            expect(body.meta.pagination?.limit).toBe(10);
        });

        it('should get project detail', async () => {
            const response = await request(app.getHttpServer())
                .get(`/v1/projects/${projectId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            const body = response.body as Envelope<ProjectResponseData>;

            expect(body.data.id).toBe(projectId);
            expect(body.data.name).toBe('E2E Project');
        });

        it('should update project', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/v1/projects/${projectId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: 'Updated E2E Project',
                    status: 'COMPLETED',
                })
                .expect(200);

            const body = response.body as Envelope<ProjectResponseData>;

            expect(body.data.id).toBe(projectId);
            expect(body.data.name).toBe('Updated E2E Project');
            expect(body.data.status).toBe('COMPLETED');
        });
    });

    describe('Task CRUD Related To Project', () => {
        it('should create a task inside project', async () => {
            const response = await request(app.getHttpServer())
                .post(`/v1/projects/${projectId}/tasks`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    title: 'E2E Task',
                    description: 'Task created from e2e test.',
                    dueDate: '2026-06-30T10:00:00.000Z',
                })
                .expect(201);

            const body = response.body as Envelope<TaskResponseData>;

            expect(body.data.id).toEqual(expect.any(String));
            expect(body.data.title).toBe('E2E Task');
            expect(body.data.description).toBe('Task created from e2e test.');
            expect(body.data.status).toBe('TODO');
            expect(body.data.projectId).toBe(projectId);

            taskId = body.data.id;
        });

        it('should get tasks by project', async () => {
            const response = await request(app.getHttpServer())
                .get(`/v1/projects/${projectId}/tasks?page=1&limit=10`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            const body = response.body as Envelope<TaskResponseData[]>;

            expect(Array.isArray(body.data)).toBe(true);
            expect(body.data.length).toBeGreaterThanOrEqual(1);
            expect(body.meta.pagination).toBeDefined();
        });

        it('should get task detail', async () => {
            const response = await request(app.getHttpServer())
                .get(`/v1/tasks/${taskId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            const body = response.body as Envelope<TaskResponseData>;

            expect(body.data.id).toBe(taskId);
            expect(body.data.title).toBe('E2E Task');
            expect(body.data.projectId).toBe(projectId);
        });

        it('should update task', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/v1/tasks/${taskId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    title: 'Updated E2E Task',
                    status: 'IN_PROGRESS',
                })
                .expect(200);

            const body = response.body as Envelope<TaskResponseData>;

            expect(body.data.id).toBe(taskId);
            expect(body.data.title).toBe('Updated E2E Task');
            expect(body.data.status).toBe('IN_PROGRESS');
        });

        it('should delete task', async () => {
            const response = await request(app.getHttpServer())
                .delete(`/v1/tasks/${taskId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.data).toEqual({
                id: taskId,
                deleted: true,
            });
        });

        it('should return 404 when accessing deleted task', async () => {
            await request(app.getHttpServer()).get(`/v1/tasks/${taskId}`).set('Authorization', `Bearer ${accessToken}`).expect(404);
        });
    });

    describe('Project Delete', () => {
        it('should delete project', async () => {
            const response = await request(app.getHttpServer())
                .delete(`/v1/projects/${projectId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.data).toEqual({
                id: projectId,
                deleted: true,
            });
        });

        it('should return 404 when accessing deleted project', async () => {
            await request(app.getHttpServer()).get(`/v1/projects/${projectId}`).set('Authorization', `Bearer ${accessToken}`).expect(404);
        });
    });

    describe('Logout', () => {
        it('should logout current session', async () => {
            await request(app.getHttpServer()).post('/v1/auth/logout').set('Authorization', `Bearer ${accessToken}`).expect(200);
        });

        it('should reject access token after logout because session is revoked', async () => {
            await request(app.getHttpServer()).get('/v1/auth/me').set('Authorization', `Bearer ${accessToken}`).expect(401);
        });
    });
});
