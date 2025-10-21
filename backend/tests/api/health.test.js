import request from 'supertest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApp } from '../../app.js';
import pool from '../../db.js';

describe('GET /health', () => {
  beforeEach(() => {
    pool.query = vi.fn().mockResolvedValue({ rows: [] });
  });

  it('returns ok status when database responds', async () => {
    const app = createApp({ dbClient: pool });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(pool.query).toHaveBeenCalledWith('SELECT 1');
  });
});
