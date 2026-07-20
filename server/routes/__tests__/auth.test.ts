import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import authRouter from '../auth';

// Mock DB
vi.mock('../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  }
}));

// Mock config schema to prevent drizzle error in other places if they import schema
vi.mock('../../db/schema', () => ({
  users: { id: 'id', employeeId: 'employeeId', pinHash: 'pinHash' },
  config: { id: 'id' }
}));

import { db } from '../../db';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/auth/login should return user token and data on valid login', async () => {
    const mockUser = {
      id: '1',
      employeeId: 'EMP123',
      name: 'John Doe',
      role: 'ADMIN',
      pinHash: 'hashed_pin',
    };

    // Setup DB chain mock
    (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockUser])
        })
      })
    });

    // Setup bcrypt mock to return true
    (bcrypt.compare as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ loginId: 'EMP123', pin: '1234' });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.name).toBe('John Doe');
    // Ensure set-cookie header exists
    expect(res.header['set-cookie']).toBeDefined();
  });

  it('POST /api/auth/login should return 401 on invalid pin', async () => {
    const mockUser = {
      id: '1',
      employeeId: 'EMP123',
      name: 'John Doe',
      role: 'ADMIN',
      pinHash: 'hashed_pin',
    };

    (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockUser])
        })
      })
    });

    (bcrypt.compare as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ loginId: 'EMP123', pin: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid PIN');
  });

  it('POST /api/auth/login should return 404 if user not found', async () => {
    (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([])
        })
      })
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ loginId: 'unknown', pin: '1234' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });
});
