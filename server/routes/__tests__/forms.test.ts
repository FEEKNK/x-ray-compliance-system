import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import formsRouter from '../forms';

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

// Mock middlewares
vi.mock('../../middleware/auth', () => ({
  authenticateToken: vi.fn((req, res, next) => next()),
  requireAdmin: vi.fn((req, res, next) => next())
}));

import { db } from '../../db';

const app = express();
app.use(express.json());
app.use('/api/forms', formsRouter);

describe('Forms API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/forms should return all forms', async () => {
    const mockForms = [
      { id: '1', title: 'Daily Check', department: 'IMAGING' }
    ];

    (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(mockForms)
      })
    });

    const res = await request(app).get('/api/forms');
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockForms);
  });

  it('POST /api/forms should create a form', async () => {
    const newForm = { title: 'New Form', department: 'MRI', questions: [] };
    const createdForm = { id: '2', ...newForm };

    (db.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([createdForm])
      })
    });

    const res = await request(app)
      .post('/api/forms')
      .send(newForm);
    
    expect(res.status).toBe(201);
    expect(res.body).toEqual(createdForm);
  });

  it('PUT /api/forms/:id should update a form', async () => {
    const updateData = { title: 'Updated Form' };
    const updatedForm = { id: '1', ...updateData };

    (db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedForm])
        })
      })
    });

    const res = await request(app)
      .put('/api/forms/1')
      .send(updateData);
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual(updatedForm);
  });
});
