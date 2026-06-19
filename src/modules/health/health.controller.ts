import { Controller, Get, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { I18N_KEYS } from 'src/common/constants/i18n-keys.constant';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';

/**
 * Not Implemented Yet
 */

@Controller({ path: 'health', version: '1' })
export class HealthController {
    private readonly logger = new Logger(HealthController.name);

    @Get()
    @ResponseMessage(I18N_KEYS.response.healthCheckSuccess)
    @SkipThrottle()
    test() {
        this.logger.log('health check success');
        return {
            status: 'ok',
        };
    }
}
