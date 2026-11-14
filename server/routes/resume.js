import { Router } from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import Application from '../models/Application.js';
import auth from '../middleware/auth.js';
import wrap from '../middleware/wrap.js';
import { extractSkills } from '../../shared/skills.js';
import { applyMatch } from '../services/match.js';

const router = Router();
router.use(auth);

router.get('/', wrap(async (req, res) => {
  const user = await User.findById(req.userId).select('resume');
  const resume = user?.resume || '';
  res.json({ resume, skills: [...extractSkills(resume).keys()] });
}));

// Saving the resume re-scores every application that has a job description
router.put('/', wrap(async (req, res) => {
  const { resume } = z.object({ resume: z.string().max(12000, 'Resume text is too long (max 12,000 characters).') }).parse(req.body);
  await User.findByIdAndUpdate(req.userId, { resume });
  const apps = await Application.find({ userId: req.userId, jobDescription: { $ne: '' } });
  await Promise.all(apps.map((a) => applyMatch(a, resume).save()));
  res.json({ resume, skills: [...extractSkills(resume).keys()], rescored: apps.length });
}));

export default router;
