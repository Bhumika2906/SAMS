import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

type Part = 'body' | 'params' | 'query';

export function validate(schema: ZodType, part: Part = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[part]);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    if (part === 'body') req.body = parsed.data;
    next();
  };
}
