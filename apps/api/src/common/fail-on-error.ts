import { HttpException, HttpStatus } from '@nestjs/common';
import type { RestartResult } from '@subzerodev/watchdog-shared';

/** A failed restart answers 500 with the result, so the caller still gets the details. */
export function failOnError(result: RestartResult): RestartResult {
  if (!result.success) throw new HttpException(result, HttpStatus.INTERNAL_SERVER_ERROR);

  return result;
}
