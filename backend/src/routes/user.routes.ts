import { Router } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { getUserById, updateUser } from '../services/userStore';

const router = Router();

// Get user profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // In MVP, return user info from token
    // In production, fetch from database
    res.json({
      id: req.user?.id,
      email: req.user?.email,
      name: req.user?.email.split('@')[0] // Placeholder
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, avatar } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get current user
    const currentUser = await getUserById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user in database
    const updatedUser = await updateUser(userId, (draft) => {
      if (name !== undefined) {
        draft.name = name?.trim() || undefined;
      }
      if (avatar !== undefined) {
        draft.avatar = avatar?.trim() || undefined;
      }
      return draft;
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        createdAt: updatedUser.createdAt,
        lastLoginAt: updatedUser.lastLoginAt,
        subscription: updatedUser.subscription,
        usage: updatedUser.usage
      }
    });
  } catch (error: any) {
    console.error('[User] Failed to update profile:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
});

// Get usage stats
router.get('/usage', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // In MVP, return placeholder data
    // In production, fetch from database
    res.json({
      generationsThisMonth: 0,
      lastResetDate: Date.now(),
      totalGenerations: 0
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch usage' });
  }
});

export { router as userRoutes };




