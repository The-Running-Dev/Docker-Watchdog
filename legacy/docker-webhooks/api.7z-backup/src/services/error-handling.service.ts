// api/services/error-handling.service.ts

import { Injectable } from '@nestjs/common';

@Injectable()
export class ErrorHandlingService {
    handleCallback<T>(error: Error | null, result: T | null, callback: (error: Error | null, result: T | null) => void) {
        if (error) {
            callback(error, null);
        } else {
            callback(null, result);
        }
    }
}
