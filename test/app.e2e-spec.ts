import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
    let app: INestApplication<App>;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/ (GET)', () => {
        return request(app.getHttpServer())
            .get('/')
            .expect(200)
            .expect((res) => {
                expect(res.body.message).toBe('OK');
                expect(res.body.data).toBe('Hello World!');

                expect(res.body.meta.requestId).toEqual(expect.any(String));
                expect(res.body.meta.requestId.length).toBeGreaterThan(0);

                expect(res.body.meta.timestamp).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/));

                expect(new Date(res.body.meta.timestamp).toISOString()).toBe(res.body.meta.timestamp);
            });
    });
});
