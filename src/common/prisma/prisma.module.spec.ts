import { Test } from '@nestjs/testing';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';

describe('PrismaModule', () => {
    it('should exports PrismaService when the module is imported', async () => {
        const prismaServiceMock = { mocked: true };

        const moduleRef = await Test.createTestingModule({
            imports: [PrismaModule],
        })
            .overrideProvider(PrismaService)
            .useValue(prismaServiceMock)
            .compile();

        expect(moduleRef.get(PrismaService)).toBe(prismaServiceMock);
    });
});
