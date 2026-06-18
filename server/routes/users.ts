import { Router } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// GET /api/users/public — fetch public user info for login screen
router.get('/public', async (_req, res) => {
  try {
    const publicUsers = await db.select({
      id: users.id,
      name: users.name,
      department: users.department,
      role: users.role
    }).from(users).orderBy(asc(users.sortOrder), asc(users.name));
    res.json(publicUsers);
  } catch (error) {
    console.error('Error fetching public users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users — fetch all users
router.get('/', authenticateToken, async (_req, res) => {
  try {
    const allUsers = await db.select().from(users).orderBy(asc(users.sortOrder), asc(users.name));
    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users — create a new user
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { employeeId, name, department, email, role } = req.body;
    const [newUser] = await db.insert(users).values({
      employeeId,
      name,
      department,
      email,
      role,
    }).returning();
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/reorder — update sort order
router.put('/reorder', authenticateToken, async (req, res) => {
  try {
    const { updates } = req.body; // Expecting [{ id: string, sortOrder: number }]
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Process updates sequentially or use transaction if needed
    for (const update of updates) {
      if (update.id && typeof update.sortOrder === 'number') {
        await db.update(users)
          .set({ sortOrder: update.sortOrder })
          .where(eq(users.id, update.id));
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering users:', error);
    res.status(500).json({ error: 'Failed to reorder users' });
  }
});

// PUT /api/users/:id — update user
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId, name, department, email, role } = req.body;
    const [updated] = await db.update(users)
      .set({ employeeId, name, department, email, role })
      .where(eq(users.id, id as string))
      .returning();
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id — delete user
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(users).where(eq(users.id, id as string)).returning();
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
