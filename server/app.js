import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import applicationRoutes from './routes/applications.js';
import statsRoutes from './routes/stats.js';
import aiRoutes from './routes/ai.js';
import cronRoutes from './routes/cron.js';
import resumeRoutes from './routes/resume.js';
import matchRoutes from './routes/match.js';

const app = express();
app.set('trust proxy', 1); // needed behind Vercel / Vite proxy so rate limiting sees real IPs
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const limiter = (windowMs, limit, message) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { message } });

// brute-force protection on login / register, and a cap on AI usage
app.use(['/api/auth/login', '/api/auth/register'], limiter(15 * 60 * 1000, 30, 'Too many attempts. Please try again in a few minutes.'));
app.use('/api/ai', limiter(60 * 60 * 1000, 30, 'AI request limit reached. Try again in an hour.'));

// make sure MongoDB is connected before any route runs
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection error:', err.message);
    res.status(500).json({ message: 'Cannot reach the database. Check MONGODB_URI and Atlas network access.' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/cron', cronRoutes);

app.use('/api', (req, res) => res.status(404).json({ message: 'Route not found.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof ZodError) {
    const i = err.issues[0];
    return res.status(400).json({ message: i.message === 'Required' ? `${i.path.join('.')} is required` : i.message });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id.' });
  console.error(err);
  res.status(500).json({ message: 'Server error. Please try again.' });
});

export default app;
