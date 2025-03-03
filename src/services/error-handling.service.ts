import { injectable } from 'inversify';

@injectable()
export class ErrorHandlingService {
    handleCallback<T>(error: Error | null, result: T | null, callback: (error: Error | null, result: T | null) => void) {
        if (error) {
            callback(error, null);
        } else {
            callback(null, result);
        }
    }
}
