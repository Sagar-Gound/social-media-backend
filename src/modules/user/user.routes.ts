import { prisma } from '@/config';
import { Router } from 'express';

const router = Router();

// ─── Get User Profile ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      isVerified: true,
    },
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({ message: 'Get user profile', data: user });
});


export default router;
