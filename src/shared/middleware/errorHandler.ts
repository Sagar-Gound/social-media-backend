import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import { env } from '../../config';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  // Known operational errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Unknown / programming errors
  console.error('💥 Unhandled Error:', err);

  res.status(500).json({
    status: 'error',
    message: env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
