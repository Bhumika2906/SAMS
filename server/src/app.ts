import { API_PREFIX } from '@sams/shared';
import cors from 'cors';
import express, { type Express } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import { errorHandler, sendSuccess } from './errors';
import { applicationRouter } from './routes/application.routes';
import { authRouter } from './routes/auth.routes';
import { managementRouter } from './routes/management.routes';
import { paymentVerifyRouter } from './routes/payment-verify.routes';
import { roundRouter } from './routes/round.routes';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use((req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
      mongoSanitize.sanitize(req.body);
    }
    next();
  });

  // Health check endpoint
  app.get('/health', (_req, res) => {
    sendSuccess(res, { status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.get(`${API_PREFIX}/health`, (_req, res) => {
    sendSuccess(res, { status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Mount API routers
  app.use(`${API_PREFIX}/auth`, authRouter);
  app.use(`${API_PREFIX}/applications`, applicationRouter);
  app.use(`${API_PREFIX}/rounds`, roundRouter);
  app.use(`${API_PREFIX}/allotments`, roundRouter);
  app.use(`${API_PREFIX}/payments`, paymentVerifyRouter);
  app.use(`${API_PREFIX}/verify`, paymentVerifyRouter);
  app.use(`${API_PREFIX}/management`, managementRouter);

  // Central error handler
  app.use(errorHandler);

  return app;
}
