import { SetMetadata } from '@nestjs/common';

/** Metadata key for ResponseMessage custom decorator. Used for Nest JS Reflector on ResponseTransformInterceptor */
export const RESPONSE_MESSAGE_KEY = 'response_message';

/**
 * Custom Decorator for response message. Read by ResponseTransformInterceptor
 * @param message Message to be displayed in response
 */
export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE_KEY, message);
