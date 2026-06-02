import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import schedulesRouter from '../schedules';

// Mock the db
vi.mock('../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn(async (cb) => {
      // Mock the transaction object (tx) so it can also insert
      const tx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'mock-id' }])
      };
      return await cb(tx);
    })
  }
}));

import { db } from '../../db';

const app = express();
app.use(express.json());
app.use('/api/schedules', schedulesRouter);

describe('Schedules API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/schedules should create multiple schedules when given an array', async () => {
    const newSchedules = [
      { staffId: '1', formId: 'f1', date: '2026-05-30', shift: 'Morning', status: 'Pending' },
      { staffId: '1', formId: 'f2', date: '2026-05-30', shift: 'Afternoon', status: 'Pending' }
    ];

    (db.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 's1' }, { id: 's2' }])
      })
    });

    const res = await request(app)
      .post('/api/schedules')
      .send(newSchedules);

    expect(res.status).toBe(201);
    expect(res.body.length).toBe(2);
  });

  it('POST /api/schedules/bulk-delete should delete multiple schedules', async () => {
    const idsToDelete = ['s1', 's2'];

    (db.delete as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 2 })
    });

    const res = await request(app)
      .post('/api/schedules/bulk-delete')
      .send({ ids: idsToDelete });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
