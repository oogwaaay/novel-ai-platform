import { Router } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth';

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
    // In MVP, just return success
    // In production, update database
    res.json({
      id: req.user?.id,
      email: req.user?.email,
      name: name || req.user?.email.split('@')[0],
      avatar
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update profile' });
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




