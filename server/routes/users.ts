import { Router } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/users — fetch all users
router.get('/', async (_req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users — create a new user
router.post('/', async (req, res) => {
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

// PUT /api/users/:id — update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId, name, department, email, role } = req.body;
    const [updated] = await db.update(users)
      .set({ employeeId, name, department, email, role })
      .where(eq(users.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id — delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
