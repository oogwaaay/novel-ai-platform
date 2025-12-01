import { Router } from 'express';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { body, validationResult } from 'express-validator';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import type { BillingCycle, SubscriptionTier, User } from '../models/User';
import { SUBSCRIPTION_PLANS } from '../models/User';
import {
  createUserRecord,
  getUserByEmail,
  getUserById,
  recordUsage,
  serializeUser,
  setUserSubscription,
  updateUser
} from '../services/userStore';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const generateToken = (user: { id: string; email: string }): string =>
  jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

const handleValidation = (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
};

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('name')
      .optional()
      .isLength({ max: 64 })
      .withMessage('Name is too long')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      if (!handleValidation(req, res)) return;
      const { email, password, name } = req.body;
      const existingUser = getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = createUserRecord({ email, passwordHash, name });
      const token = generateToken(user);

      res.json({
        user: serializeUser(user),
        token
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      if (!handleValidation(req, res)) return;
      const { email, password } = req.body;
      const user = getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const updatedUser = updateUser(user.id, (draft) => {
        draft.lastLoginAt = Date.now();
        return draft;
      });

      const token = generateToken({ id: (updatedUser || user).id, email: (updatedUser || user).email });

      res.json({
        user: serializeUser(updatedUser || user),
        token
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  }
);

router.post('/logout', (_req, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

router.post('/refresh', async (req, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const user = getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const newToken = generateToken(user);
    res.json({
      token: newToken,
      user: serializeUser(user)
    });
  } catch (error: any) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  const user = getUserById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ user: serializeUser(user) });
});

router.put(
  '/subscription',
  authMiddleware,
  [
    body('tier')
      .isIn(['free', 'starter', 'pro', 'unlimited'])
      .withMessage('Invalid tier'),
    body('billingCycle')
      .optional()
      .isIn(['monthly', 'yearly'])
      .withMessage('Invalid billing cycle'),
    body('status')
      .optional()
      .isIn(['active', 'trialing', 'past_due', 'canceled'])
      .withMessage('Invalid status')
  ],
  (req: AuthRequest, res: Response) => {
    if (!handleValidation(req, res)) return;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const tier = req.body.tier as SubscriptionTier;
    const billingCycle = (req.body.billingCycle || 'monthly') as BillingCycle;
    const status = (req.body.status || 'active') as User['subscription']['status'];

    const updated = setUserSubscription(userId, tier, billingCycle, status);
    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: serializeUser(updated) });
  }
);

router.get('/usage', authMiddleware, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  const user = getUserById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  const plan = SUBSCRIPTION_PLANS[user.subscription.tier];
  res.json({
    usage: user.usage,
    limits: plan.limits
  });
});

router.post(
  '/usage/reset',
  authMiddleware,
  (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const user = recordUsage(userId, {
      generations: -Number.MAX_SAFE_INTEGER,
      pages: -Number.MAX_SAFE_INTEGER,
      tokens: -Number.MAX_SAFE_INTEGER
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ usage: user.usage });
  }
);

// Password reset flow
// In-memory store for reset tokens (in production, use Redis or database)
const resetTokens = new Map<string, { userId: string; expiresAt: number }>();

router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Valid email is required')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      if (!handleValidation(req, res)) return;
      const { email } = req.body;
      const user = getUserByEmail(email);

      // Always return success to prevent email enumeration
      // In production, send email with reset link
      if (user) {
        const resetToken = randomUUID();
        const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
        resetTokens.set(resetToken, { userId: user.id, expiresAt });

        // In production, send email with reset link:
        // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        // await sendPasswordResetEmail(user.email, resetLink);

        console.log(`[Password Reset] Token for ${email}: ${resetToken}`);
        console.log(`[Password Reset] Reset link: /reset-password?token=${resetToken}`);
      }

      res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Failed to process request' });
    }
  }
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      if (!handleValidation(req, res)) return;
      const { token, password } = req.body;

      const tokenData = resetTokens.get(token);
      if (!tokenData) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      if (tokenData.expiresAt < Date.now()) {
        resetTokens.delete(token);
        return res.status(400).json({ message: 'Reset token has expired' });
      }

      const user = getUserById(tokenData.userId);
      if (!user) {
        resetTokens.delete(token);
        return res.status(404).json({ message: 'User not found' });
      }

      // Update password
      const passwordHash = await bcrypt.hash(password, 10);
      const updated = updateUser(user.id, (draft) => {
        draft.passwordHash = passwordHash;
        return draft;
      });

      // Remove used token
      resetTokens.delete(token);

      if (!updated) {
        return res.status(500).json({ message: 'Failed to update password' });
      }

      res.json({ message: 'Password reset successfully' });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  }
);

// Configure Passport serialization
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser((id: string, done) => {
  const user = getUserById(id);
  done(null, user || null);
});

// Configure Passport strategies
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/google/callback`
      },
      async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: User) => void) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          let user = getUserByEmail(email);
          if (!user) {
            // Create new user from Google profile
            const newUser = createUserRecord({
              email,
              name: profile.displayName || profile.name?.givenName || 'User',
              avatar: profile.photos?.[0]?.value,
              passwordHash: '', // OAuth users don't have passwords
              oauthProvider: 'google',
              oauthId: profile.id
            });
            user = newUser;
          } else {
            // Update existing user with OAuth info if needed
            if (!user.avatar && profile.photos?.[0]?.value) {
              updateUser(user.id, (draft) => {
                draft.avatar = profile.photos?.[0]?.value;
                return draft;
              });
            }
          }

          return done(null, user);
        } catch (error: any) {
          return done(error, undefined);
        }
      }
    )
  );
}

if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/github/callback`,
        scope: ['user:email']
      },
      async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: User) => void) => {
        try {
          // GitHub profile emails might be in profile.emails or need to be fetched
          const email = profile.emails?.[0]?.value || `${profile.username}@users.noreply.github.com`;
          
          let user = getUserByEmail(email);
          if (!user) {
            // Create new user from GitHub profile
            const newUser = createUserRecord({
              email,
              name: profile.displayName || profile.username || 'User',
              avatar: profile.photos?.[0]?.value,
              passwordHash: '', // OAuth users don't have passwords
              oauthProvider: 'github',
              oauthId: profile.id.toString()
            });
            user = newUser;
          } else {
            // Update existing user with OAuth info if needed
            if (!user.avatar && profile.photos?.[0]?.value) {
              updateUser(user.id, (draft) => {
                draft.avatar = profile.photos?.[0]?.value;
                return draft;
              });
            }
          }

          return done(null, user);
        } catch (error: any) {
          return done(error, undefined);
        }
      }
    )
  );
}

// OAuth routes
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  router.get('/google/callback', passport.authenticate('google', { session: false }), (req: any, res: Response) => {
    try {
      const user = req.user as User;
      if (!user) {
        return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
      }

      const token = generateToken(user);
      // Redirect to frontend with token
      res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error: any) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
    }
  });
}

if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
  router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

  router.get('/github/callback', passport.authenticate('github', { session: false }), (req: any, res: Response) => {
    try {
      const user = req.user;
      if (!user || !user.id || !user.email) {
        return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
      }

      const token = generateToken({ id: user.id, email: user.email });
      // Redirect to frontend with token
      res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error: any) {
      console.error('GitHub OAuth callback error:', error);
      res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
    }
  });
}

export { router as authRoutes };

