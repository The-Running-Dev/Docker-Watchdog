import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'watchdog:isPublic';

/** Marks a route as reachable without credentials even when auth is on. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
