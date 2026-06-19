import { seconds } from '@nestjs/throttler';

/** Rate limit app level configuration */
export const RATE_LIMIT_POLICY = {
    default: { name: 'default', ttl: seconds(5), limit: 3 },
} as const;
