import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { ProjectRepository } from './project.repository';

@Module({
    providers: [ProjectService, ProjectRepository],
    controllers: [ProjectController],
    exports: [ProjectService, ProjectRepository],
})
export class ProjectModule {}
