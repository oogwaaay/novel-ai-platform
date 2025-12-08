import 'dotenv/config'; // Load environment variables before anything else

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import crypto from 'node:crypto';
import session from 'express-session';
import passport from 'passport';
import { novelRoutes } from './routes/novel.routes';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { projectRoutes } from './routes/project.routes';
import { contextRoutes } from './routes/context.routes';
import {
  addProjectComment,
  listProjectComments,
  updateProjectComment,
  listSectionLocks,
  acquireSectionLock,
  renewSectionLock,
  releaseSectionLock,
  releaseLocksForUser,
  sweepExpiredLocks,
  addProjectActivity,
  listProjectActivities,
  type ProjectComment,
  type ProjectActivity,
  loadProjectCommentsFromSupabase,
  loadSectionLocksFromSupabase
} from './services/collaborationStore';
import { buildUserHandle, extractMentions, normalizeHandle } from './utils/handle';
import { apiRateLimit, authRateLimit, aiGenerationRateLimit } from './middleware/rateLimit';
import { auditLog } from './middleware/auditLog';
import { errorHandler, notFoundHandler, ApiError, asyncHandler, validationErrorHandler } from './middleware/errorHandler';

const app = express();

// CORS configuration - restrict to specific origin in production
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || (process.env.NODE_ENV === 'production' ? false : '*'),
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limit request body size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(auditLog);

// Initialize Passport for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes with rate limiting
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/novel', apiRateLimit, novelRoutes);
app.use('/api/user', apiRateLimit, userRoutes);
app.use('/api/projects', apiRateLimit, projectRoutes);
app.use('/api/context', apiRateLimit, contextRoutes);

// Enhanced health check
app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    },
    environment: process.env.NODE_ENV || 'development'
  };
  res.json(health);
});

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

const server = http.createServer(app);

type Participant = {
  userId: string;
  userName: string;
  color: string;
  handle: string;
};

interface SectionState {
  content: string;
  updatedAt: number;
}

interface RoomState {
  participants: Map<string, Participant>;
  sections: Map<string, SectionState>;
}

const PARTICIPANT_COLORS = [
  '#0ea5e9',
  '#f97316',
  '#22c55e',
  '#a855f7',
  '#f43f5e',
  '#14b8a6',
  '#eab308',
  '#64748b'
];

const collaborationRooms: Map<string, RoomState> = new Map();

const getOrCreateRoom = (projectId: string): RoomState => {
  if (!collaborationRooms.has(projectId)) {
    collaborationRooms.set(projectId, {
      participants: new Map(),
      sections: new Map()
    });
  }
  return collaborationRooms.get(projectId)!;
};

const pickColor = (room: RoomState, userId: string): string => {
  const existing = room.participants.get(userId);
  if (existing) return existing.color;

  const used = new Set(Array.from(room.participants.values()).map((p) => p.color));
  const available = PARTICIPANT_COLORS.find((color) => !used.has(color));
  return available || PARTICIPANT_COLORS[Math.floor(Math.random() * PARTICIPANT_COLORS.length)];
};

const getHandlesSet = (room: RoomState, excludeUserId?: string): Set<string> => {
  return new Set(
    Array.from(room.participants.entries())
      .filter(([userId]) => userId !== excludeUserId)
      .map(([, participant]) => participant.handle)
  );
};

const resolveSectionId = (sectionId?: string | null): string => {
  if (!sectionId) return 'draft';
  return sectionId;
};

// CORS configuration - restrict to specific origin in production
const corsOrigin = process.env.CLIENT_ORIGIN || (process.env.NODE_ENV === 'production' ? undefined : '*');
const io = new SocketIOServer(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const recordActivity = (
  projectId: string,
  activity: Omit<ProjectActivity, 'id' | 'projectId' | 'createdAt'>
) => {
  const entry = addProjectActivity({ projectId, ...activity });
  io.to(`project:${projectId}`).emit('collab:activity', entry);
  return entry;
};

// Lock cleanup interval - save reference for cleanup
const lockCleanupInterval = setInterval(() => {
  const affected = sweepExpiredLocks();
  affected.forEach((projectId) => {
    io.to(`project:${projectId}`).emit('collab:locks', listSectionLocks(projectId));
  });
}, 5000);

// Cleanup on process exit
process.on('SIGTERM', () => {
  clearInterval(lockCleanupInterval);
});

process.on('SIGINT', () => {
  clearInterval(lockCleanupInterval);
});

io.on('connection', (socket) => {
  socket.on('collab:join', async (payload) => {
    try {
      const { projectId, userId, userName, userEmail, sectionId, content } = payload || {};
      if (!projectId || !userId) {
        socket.emit('collab:error', { message: 'Missing projectId or userId' });
        return;
      }

      const room = getOrCreateRoom(projectId);
      const existing = room.participants.get(userId);
      let participant: Participant;
      if (existing) {
        participant = {
          ...existing,
          userName: userName || existing.userName
        };
      } else {
        const handle = buildUserHandle(
          { userName, userEmail, userId },
          getHandlesSet(room)
        );
        participant = {
          userId,
          userName: userName || 'Guest',
          color: pickColor(room, userId),
          handle
        };
      }

      const resolvedSection = resolveSectionId(sectionId);
      const sectionContent = typeof content === 'string' ? content : '';
      const existingSection = room.sections.get(resolvedSection);
      if (!existingSection && sectionContent) {
        room.sections.set(resolvedSection, {
          content: sectionContent,
          updatedAt: Date.now()
        });
      }

      room.participants.set(userId, participant);
      socket.join(`project:${projectId}`);
      socket.data.projectId = projectId;
      socket.data.userId = userId;
      socket.data.sectionId = resolvedSection;

      // Load existing comments & locks from Supabase on first join
      await loadProjectCommentsFromSupabase(projectId);
      await loadSectionLocksFromSupabase(projectId);

      const syncContent = room.sections.get(resolvedSection)?.content ?? sectionContent ?? '';
      socket.emit('collab:sync', {
        projectId,
        sectionId: resolvedSection,
        content: syncContent,
        participants: Array.from(room.participants.values()),
        comments: listProjectComments(projectId),
        locks: listSectionLocks(projectId),
        activities: listProjectActivities(projectId)
      });

      io.to(`project:${projectId}`).emit('collab:participants', {
        projectId,
        participants: Array.from(room.participants.values())
      });
    } catch (error) {
      console.error('[Collaboration] join error', error);
      socket.emit('collab:error', { message: 'Failed to join collaboration session' });
    }
  });

  socket.on('collab:section-change', (payload) => {
    try {
      const { projectId, sectionId, content } = payload || {};
      if (!projectId || !sectionId) return;
      const room = getOrCreateRoom(projectId);
      socket.data.sectionId = sectionId;
      if (typeof content === 'string' && content.length > 0) {
        room.sections.set(sectionId, {
          content,
          updatedAt: Date.now()
        });
      }
      const syncContent = room.sections.get(sectionId)?.content ?? content ?? '';
      socket.emit('collab:section-sync', { sectionId, content: syncContent });
    } catch (error) {
      console.error('[Collaboration] section-change error', error);
    }
  });

  socket.on('collab:content-update', (payload) => {
    try {
      const { projectId, sectionId, content, patch, baseContent } = payload || {};
      if (!projectId) return;
      const room = getOrCreateRoom(projectId);
      const targetSection = resolveSectionId(sectionId || socket.data.sectionId);
      const previousContent = room.sections.get(targetSection)?.content || '';
      
      if (typeof content === 'string') {
        room.sections.set(targetSection, {
          content,
          updatedAt: Date.now()
        });
      }
      
      // Include base content for three-way merge on client
      socket.to(`project:${projectId}`).emit('collab:content-update', {
        sectionId: targetSection,
        patch,
        content: typeof content === 'string' ? content : room.sections.get(targetSection)?.content,
        baseContent: baseContent || previousContent
      });
    } catch (error) {
      console.error('[Collaboration] content-update error', error);
    }
  });

  socket.on('collab:cursor', (payload) => {
    try {
      const { projectId, sectionId, range, userId } = payload || {};
      const resolvedProjectId = projectId || socket.data.projectId;
      const resolvedUserId = userId || socket.data.userId;
      if (!resolvedProjectId || !resolvedUserId) return;
      const room = getOrCreateRoom(resolvedProjectId);
      const participant = room.participants.get(resolvedUserId);
      io.to(`project:${resolvedProjectId}`).emit('collab:cursor', {
        userId: resolvedUserId,
        sectionId: resolveSectionId(sectionId || socket.data.sectionId),
        range,
        color: participant?.color
      });
    } catch (error) {
      console.error('[Collaboration] cursor event error', error);
    }
  });

  socket.on('collab:comment-add', (payload) => {
    try {
      const { projectId, text, selection, userId, userName, mentions, threadId, parentId } = payload || {};
      if (!projectId || !text || typeof text !== 'string') return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const room = getOrCreateRoom(projectId);

      let mentionHandles: string[] | undefined;
      const providedMentions = Array.isArray(mentions)
        ? Array.from(
            new Set(
              mentions
                .map((mention) => normalizeHandle(mention))
                .filter((mention): mention is string => Boolean(mention))
            )
          )
        : undefined;
      if (providedMentions?.length) {
        mentionHandles = providedMentions;
      } else {
        mentionHandles = extractMentions(
          trimmed,
          getHandlesSet(room)
        );
      }

      const comment: ProjectComment = {
        id: crypto.randomUUID(),
        projectId,
        text: trimmed,
        selection,
        userId: userId || socket.data.userId || 'unknown',
        userName: userName || 'Guest',
        mentions: mentionHandles && mentionHandles.length > 0 ? mentionHandles : undefined,
        threadId: threadId || '',
        parentId: parentId ?? null,
        status: 'open',
        createdAt: Date.now()
      };
      if (!comment.threadId) {
        comment.threadId = comment.id;
      }
      addProjectComment(comment);
      io.to(`project:${projectId}`).emit('collab:comment-added', comment);
      recordActivity(projectId, {
        type: 'comment_added',
        userId: comment.userId,
        userName: comment.userName,
        commentId: comment.id,
        threadId: comment.threadId,
        sectionId: comment.selection?.sectionId,
        text: comment.text.slice(0, 200)
      });
    } catch (error) {
      console.error('[Collaboration] comment-add error', error);
    }
  });

  socket.on('collab:comment-update', (payload) => {
    try {
      const { projectId, commentId, status, userId } = payload || {};
      if (!projectId || !commentId || !status) return;
      const updated = updateProjectComment(projectId, commentId, {
        status,
        resolvedBy: status === 'resolved' ? userId || socket.data.userId : undefined,
        resolvedAt: status === 'resolved' ? Date.now() : undefined
      });
      if (!updated) {
        return;
      }
      io.to(`project:${projectId}`).emit('collab:comment-updated', updated);
      if (status === 'resolved') {
        recordActivity(projectId, {
          type: 'comment_resolved',
          userId: userId || socket.data.userId,
          userName: socket.data.userName,
          commentId: updated.id,
          threadId: updated.threadId,
          sectionId: updated.selection?.sectionId,
          text: updated.text.slice(0, 200)
        });
      }
    } catch (error) {
      console.error('[Collaboration] comment-update error', error);
    }
  });

  socket.on('collab:lock-request', (payload) => {
    try {
      const { projectId, sectionId, range, userId, userName } = payload || {};
      const resolvedProjectId = projectId || socket.data.projectId;
      const resolvedSectionId = sectionId || socket.data.sectionId;
      const resolvedUserId = userId || socket.data.userId;
      if (
        !resolvedProjectId ||
        !resolvedSectionId ||
        !range ||
        typeof range.start !== 'number' ||
        typeof range.end !== 'number' ||
        range.end <= range.start
      ) {
        socket.emit('collab:lock-rejected', { message: 'Invalid lock request', projectId: resolvedProjectId });
        return;
      }

      const result = acquireSectionLock({
        projectId: resolvedProjectId,
        sectionId: resolvedSectionId,
        range,
        userId: resolvedUserId || 'guest-user',
        userName: userName || socket.data.userName || 'Guest'
      });

      if (result.lock) {
        socket.emit('collab:lock-granted', { lock: result.lock });
        io.to(`project:${resolvedProjectId}`).emit('collab:locks', listSectionLocks(resolvedProjectId));
        recordActivity(resolvedProjectId, {
          type: 'lock_acquired',
          userId: result.lock.userId,
          userName: result.lock.userName,
          sectionId: result.lock.sectionId,
          range: result.lock.range
        });
      } else {
        socket.emit('collab:lock-rejected', { projectId: resolvedProjectId, conflict: result.conflict, reason: result.error });
        if (result.conflict) {
          recordActivity(resolvedProjectId, {
            type: 'lock_denied',
            userId: resolvedUserId || socket.data.userId,
            userName: userName || socket.data.userName,
            sectionId: resolvedSectionId,
            range,
            text: `Locked by ${result.conflict.userName}`
          });
        }
      }
    } catch (error) {
      console.error('[Collaboration] lock-request error', error);
      socket.emit('collab:lock-rejected', { message: 'Failed to acquire lock' });
    }
  });

  socket.on('collab:lock-renew', (payload) => {
    try {
      const { projectId, lockId } = payload || {};
      const resolvedProjectId = projectId || socket.data.projectId;
      const resolvedUserId = socket.data.userId;
      if (!resolvedProjectId || !lockId || !resolvedUserId) return;
      const updated = renewSectionLock(resolvedProjectId, lockId, resolvedUserId);
      if (!updated) {
        socket.emit('collab:lock-rejected', { projectId: resolvedProjectId, reason: 'not_found' });
      } else {
        socket.emit('collab:lock-granted', { lock: updated });
      }
    } catch (error) {
      console.error('[Collaboration] lock-renew error', error);
    }
  });

  socket.on('collab:lock-release', (payload) => {
    try {
      const { projectId, lockId } = payload || {};
      const resolvedProjectId = projectId || socket.data.projectId;
      const resolvedUserId = socket.data.userId;
      if (!resolvedProjectId || !lockId) return;
      const removed = releaseSectionLock(resolvedProjectId, lockId, resolvedUserId);
      io.to(`project:${resolvedProjectId}`).emit('collab:locks', listSectionLocks(resolvedProjectId));
      if (removed) {
        recordActivity(resolvedProjectId, {
          type: 'lock_released',
          userId: removed.userId,
          userName: removed.userName,
          sectionId: removed.sectionId,
          range: removed.range
        });
      }
    } catch (error) {
      console.error('[Collaboration] lock-release error', error);
    }
  });

  const leaveRoom = () => {
    const { projectId, userId } = socket.data || {};
    if (!projectId || !userId) return;
    const room = collaborationRooms.get(projectId);
    if (!room) return;
    room.participants.delete(userId);
    const releasedLocks = releaseLocksForUser(projectId, userId);
    io.to(`project:${projectId}`).emit('collab:participants', {
      projectId,
      participants: Array.from(room.participants.values())
    });
    io.to(`project:${projectId}`).emit('collab:locks', listSectionLocks(projectId));
    releasedLocks.forEach((lock) => {
      recordActivity(projectId, {
        type: 'lock_released',
        userId: lock.userId,
        userName: lock.userName,
        sectionId: lock.sectionId,
        range: lock.range
      });
    });
  };

  socket.on('collab:leave', leaveRoom);
  socket.on('disconnect', leaveRoom);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

