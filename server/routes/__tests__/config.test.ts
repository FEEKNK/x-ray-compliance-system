import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import configRouter from '../config';

// Mock the db
vi.mock('../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  }
}));

import { db } from '../../db';

const app = express();
app.use(express.json());
app.use('/api/config', configRouter);

describe('Config API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/config should ensure config exists and return it', async () => {
    const mockConfigRow = {
      settings: { hospitalName: 'Test Hospital' },
      announcements: ['Test Announcement']
    };

    // The ensureConfig helper calls select -> from -> where
    // Let's pretend it finds a row, so it doesn't insert
    (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockConfigRow])
      })
    });

    const res = await request(app).get('/api/config');
    
    expect(res.status).toBe(200);
    expect(res.body.settings.hospitalName).toBe('Test Hospital');
    expect(res.body.announcements).toContain('Test Announcement');
  });

  it('PUT /api/config should update settings', async () => {
    const updatedSettings = { hospitalName: 'New Hospital' };
    
    (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([ { settings: {} } ])
      })
    });

    (db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ settings: updatedSettings, announcements: [] }])
        })
      })
    });

    const res = await request(app)
      .put('/api/config')
      .send({ settings: updatedSettings });

    expect(res.status).toBe(200);
    expect(res.body.settings.hospitalName).toBe('New Hospital');
  });
});
