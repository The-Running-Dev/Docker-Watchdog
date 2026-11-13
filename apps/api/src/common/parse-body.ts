import { BadRequestException } from '@nestjs/common';
import type { z } from 'zod';

/** Validates a request body against a zod schema, answering 400 with every problem found. */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body ?? {});

  if (!result.success) {
    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: result.error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`),
    });
  }

  return result.data;
}
