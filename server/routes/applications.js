import { Router } from 'express';
import { z } from 'zod';
import Application, { STATUSES, PRIORITIES, INTERVIEW_TYPES } from '../models/Application.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { applyMatch } from '../services/match.js';
import { ghostInfo } from '../../shared/ghost.js';
import { buildFollowUpDraft } from '../../shared/followup.js';
import auth from '../middleware/auth.js';
import wrap from '../middleware/wrap.js';

const router = Router();
router.use(auth);

const optionalDate = z.union([z.literal(''), z.null(), z.coerce.date()]).optional();

const interviewSchema = z.object({
  round: z.string().trim().max(60).optional(),
  type: z.enum(INTERVIEW_TYPES).optional(),
  date: optionalDate,
  interviewer: z.string().trim().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

const appSchema = z.object({
  company: z.string().trim().min(1, 'Company is required').max(120),
  role: z.string().trim().min(1, 'Role is required').max(120),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  salary: z.string().trim().max(60).optional(),
  location: z.string().trim().max(100).optional(),
  link: z.string().trim().max(500).optional(),
  notes: z.string().max(5000).optional(),
  contactName: z.string().trim().max(100).optional(),
  contactEmail: z.string().trim().max(120).optional(),
  appliedDate: optionalDate,
  followUpDate: optionalDate,
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  jobDescription: z.string().max(8000).optional(),
  interviews: z.array(interviewSchema).max(15).optional(),
});

const clean = (data) => {
  const out = { ...data };
  if (out.followUpDate === '') out.followUpDate = null;
  if (out.appliedDate === '' || out.appliedDate === null) delete out.appliedDate;
  if (out.interviews) out.interviews = out.interviews.map((i) => ({ ...i, date: i.date === '' ? null : i.date }));
  return out;
};

const nextOrder = async (userId, status) => {
  const last = await Application.findOne({ userId, status }).sort({ order: -1 }).select('order');
  return last ? last.order + 1 : 0;
};

const logMove = (app, from, to) =>
  Activity.create({ userId: app.userId, applicationId: app._id, company: app.company, from, to });

// list all
router.get('/', wrap(async (req, res) => {
  const apps = await Application.find({ userId: req.userId }).sort({ order: 1 });
  res.json({ applications: apps });
}));

// create
router.post('/', wrap(async (req, res) => {
  const data = clean(appSchema.parse(req.body));
  const status = data.status || 'Applied';
  // an application logged with a past "applied on" date starts its stage clock then, not today
  const stageStart = data.appliedDate && new Date(data.appliedDate) < new Date() ? new Date(data.appliedDate) : new Date();
  const app = new Application({ ...data, status, statusChangedAt: stageStart, userId: req.userId, order: await nextOrder(req.userId, status) });
  applyMatch(app, (await User.findById(req.userId).select('resume'))?.resume);
  await app.save();
  await logMove(app, null, status);
  res.status(201).json({ application: app });
}));

// bulk reorder after drag & drop
const reorderSchema = z.object({
  movedId: z.string(),
  items: z.array(z.object({ id: z.string(), status: z.enum(STATUSES), order: z.number().int().min(0) })).max(1000),
});
router.post('/reorder', wrap(async (req, res) => {
  const { movedId, items } = reorderSchema.parse(req.body);
  const moved = await Application.findOne({ _id: movedId, userId: req.userId });
  if (!moved) return res.status(404).json({ message: 'Application not found.' });
  const target = items.find((i) => i.id === movedId);
  const prev = moved.status;

  await Application.bulkWrite(
    items.map((i) => ({
      updateOne: { filter: { _id: i.id, userId: req.userId }, update: { $set: { status: i.status, order: i.order } } },
    }))
  );
  if (target && target.status !== prev) {
    await Application.updateOne({ _id: movedId }, { $set: { statusChangedAt: new Date() } });
    await logMove(moved, prev, target.status);
  }
  res.json({ ok: true });
}));

// update
router.put('/:id', wrap(async (req, res) => {
  const data = clean(appSchema.partial().parse(req.body));
  const app = await Application.findOne({ _id: req.params.id, userId: req.userId });
  if (!app) return res.status(404).json({ message: 'Application not found.' });
  const prev = app.status;
  Object.assign(app, data);
  if (data.status && data.status !== prev) {
    app.statusChangedAt = new Date();
    app.order = await nextOrder(req.userId, data.status);
    await logMove(app, prev, data.status);
  }
  // correcting the applied date of an application still in Applied also moves its stage clock
  if (data.appliedDate && app.status === 'Applied' && !(data.status && data.status !== prev) && app.statusChangedAt > app.appliedDate) {
    app.statusChangedAt = app.appliedDate;
  }
  if (data.jobDescription !== undefined) applyMatch(app, (await User.findById(req.userId).select('resume'))?.resume);
  await app.save();
  res.json({ application: app });
}));

// follow-up coach: ghost status + a ready-to-send draft
router.get('/:id/followup', wrap(async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.userId });
  if (!app) return res.status(404).json({ message: 'Application not found.' });
  const user = await User.findById(req.userId).select('name');
  const info = ghostInfo(app);
  res.json({
    ghost: info && { level: info.level, daysQuiet: info.daysQuiet, since: info.since },
    nudgeCount: app.nudgeCount || 0,
    lastNudgedAt: app.lastNudgedAt,
    draft: info ? buildFollowUpDraft(app, user || {}) : null,
  });
}));

// user sent the follow-up: reset the quiet timer and schedule the next check-in in a week
router.post('/:id/followup/sent', wrap(async (req, res) => {
  const app = await Application.findOne({ _id: req.params.id, userId: req.userId });
  if (!app) return res.status(404).json({ message: 'Application not found.' });
  app.lastNudgedAt = new Date();
  app.nudgeCount = (app.nudgeCount || 0) + 1;
  app.followUpDate = new Date(Date.now() + 7 * 86400000);
  await app.save();
  res.json({ application: app });
}));

// delete
router.delete('/:id', wrap(async (req, res) => {
  const app = await Application.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!app) return res.status(404).json({ message: 'Application not found.' });
  await Activity.deleteMany({ applicationId: app._id });
  res.json({ ok: true });
}));

// stage history of one application
router.get('/:id/activity', wrap(async (req, res) => {
  const items = await Activity.find({ applicationId: req.params.id, userId: req.userId }).sort({ at: -1 }).limit(20);
  res.json({ activity: items });
}));

export default router;