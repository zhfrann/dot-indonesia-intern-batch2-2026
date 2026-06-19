type ProjectListCacheKeyInput = {
    userId: string;
    version: string;
    page: number;
    limit: number;
    search?: string;
    status?: string;
};

type ProjectDetailCacheKeyInput = {
    userId: string;
    version: string;
    projectId: string;
};

type TaskListCacheKeyInput = {
    userId: string;
    version: string;
    projectId: string;
    page: number;
    limit: number;
    search?: string;
    status?: string;
};

type TaskDetailCacheKeyInput = {
    userId: string;
    version: string;
    taskId: string;
};

function safeCacheValue(value: unknown): string {
    if (value === undefined || value === null || value === '') {
        return 'all';
    }

    return encodeURIComponent(String(value));
}

export const CacheVersionKey = {
    projects: (userId: string) => `cache:version:projects:${userId}`,
    tasks: (userId: string) => `cache:version:tasks:${userId}`,
};

export const CacheKey = {
    projectList: (input: ProjectListCacheKeyInput) =>
        [
            'cache',
            'projects',
            'list',
            `v=${safeCacheValue(input.version)}`,
            `user=${safeCacheValue(input.userId)}`,
            `page=${safeCacheValue(input.page)}`,
            `limit=${safeCacheValue(input.limit)}`,
            `search=${safeCacheValue(input.search)}`,
            `status=${safeCacheValue(input.status)}`,
        ].join(':'),

    projectDetail: (input: ProjectDetailCacheKeyInput) =>
        [
            'cache',
            'projects',
            'detail',
            `v=${safeCacheValue(input.version)}`,
            `user=${safeCacheValue(input.userId)}`,
            `project=${safeCacheValue(input.projectId)}`,
        ].join(':'),

    taskList: (input: TaskListCacheKeyInput) =>
        [
            'cache',
            'tasks',
            'list',
            `v=${safeCacheValue(input.version)}`,
            `user=${safeCacheValue(input.userId)}`,
            `project=${safeCacheValue(input.projectId)}`,
            `page=${safeCacheValue(input.page)}`,
            `limit=${safeCacheValue(input.limit)}`,
            `search=${safeCacheValue(input.search)}`,
            `status=${safeCacheValue(input.status)}`,
        ].join(':'),

    taskDetail: (input: TaskDetailCacheKeyInput) =>
        [
            'cache',
            'tasks',
            'detail',
            `v=${safeCacheValue(input.version)}`,
            `user=${safeCacheValue(input.userId)}`,
            `task=${safeCacheValue(input.taskId)}`,
        ].join(':'),
};
