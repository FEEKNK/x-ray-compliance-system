import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bundlesRouter from '../bundles';

// Mock DB
vi.mock('../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }
}));

import { db } from '../../db';

const app = express();
app.use(express.json());
app.use('/api/bundles', bundlesRouter);

describe('Bundles API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/bundles should return all bundles ordered by sortOrder', async () => {
    const mockBundles = [
      { id: '1', name: 'Bundle 1', sortOrder: 0 },
      { id: '2', name: 'Bundle 2', sortOrder: 1 }
    ];

    (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(mockBundles)
      })
    });

    const res = await request(app).get('/api/bundles');
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: '1', name: 'Bundle 1', department: undefined, formIds: undefined },
      { id: '2', name: 'Bundle 2', department: undefined, formIds: undefined }
    ]);
  });

  it('PUT /api/bundles/reorder should update sortOrder for multiple bundles', async () => {
    const payload = [
      { id: '2', sortOrder: 0 },
      { id: '1', sortOrder: 1 }
    ];

    // Mock successful update
    (db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(true)
      })
    });

    const res = await request(app)
      .put('/api/bundles/reorder')
      .send({ updates: payload });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    // update should be called twice (once for each bundle)
    expect(db.update).toHaveBeenCalledTimes(2);
  });
});
