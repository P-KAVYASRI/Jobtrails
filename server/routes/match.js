import { Router } from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import wrap from '../middleware/wrap.js';
import { analyzeMatch, matchBand } from '../../shared/skills.js';

const router = Router();
router.use(auth);

// Analyse any job description against the saved resume (works before the application is saved)
router.post('/', wrap(async (req, res) => {
  const { jobDescription } = z.object({ jobDescription: z.string().max(8000) }).parse(req.body);
  const user = await User.findById(req.userId).select('resume');
  const hasResume = !!user?.resume?.trim();
  const result = analyzeMatch(user?.resume || '', jobDescription);
  res.json({ ...result, band: matchBand(result.score), hasResume });
}));

export default router;
