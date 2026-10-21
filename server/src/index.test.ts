import { API_PREFIX } from '@sams/shared';
import request from 'supertest';
import { createApp } from './app';

describe('@sams/server health & app lifecycle', () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_secret_for_sams_at_least_16_characters';
  const app = createApp();

  it('responds with healthy status on /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
  });

  it(`responds with healthy status on ${API_PREFIX}/health`, async () => {
    const res = await request(app).get(`${API_PREFIX}/health`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
  });
});
