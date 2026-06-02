import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import usersRouter from '../users';

// Mock the entire db object
vi.mock('../../db', () => {
  return {
    db: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }
  };
});

import { db } from '../../db';

const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

describe('Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/users should return a list of users', async () => {
    const mockUsers = [
      { id: '1', name: 'John Doe', role: 'ADMIN', department: 'IMAGING' }
    ];
    
    // Setup db chain mock
    (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockResolvedValue(mockUsers)
    });

    const res = await request(app).get('/api/users');
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockUsers);
  });

  it('POST /api/users should create a user', async () => {
    const newUser = {
      employeeId: 'EMP123',
      name: 'Jane Doe',
      role: 'STAFF',
      department: 'MRI'
    };
    
    const createdUser = { id: '2', ...newUser };

    // Setup db insert chain
    (db.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([createdUser])
      })
    });

    const res = await request(app)
      .post('/api/users')
      .send(newUser);
    
    expect(res.status).toBe(201);
    expect(res.body).toEqual(createdUser);
  });
});
