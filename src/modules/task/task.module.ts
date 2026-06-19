import { Module } from '@nestjs/common';
import { ProjectModule } from '../project/project.module';
import { TaskController } from './task.controller';
import { TaskRepository } from './task.repository';
import { TaskService } from './task.service';

@Module({
    imports: [ProjectModule],
    controllers: [TaskController],
    providers: [TaskService, TaskRepository],
    exports: [TaskService, TaskRepository],
})
export class TaskModule {}
