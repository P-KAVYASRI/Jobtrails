import { Router } from 'express';
import mongoose from 'mongoose';
import Application, { STATUSES } from '../models/Application.js';
import Activity from '../models/Activity.js';
import auth from '../middleware/auth.js';
import wrap from '../middleware/wrap.js';
import { ghostInfo } from '../../shared/ghost.js';
import { buildMatchInsight } from '../services/insights.js';

const router = Router();
router.use(auth);

const DAY = 86400000;
const mondayOf = (d) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x;
};
const label = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

router.get('/', wrap(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.userId);

  // 8 weekly buckets ending with the current week
  const thisMonday = mondayOf(new Date());
  const starts = Array.from({ length: 8 }, (_, i) => new Date(thisMonday.getTime() - (7 - i) * 7 * DAY));
  const boundaries = [...starts, new Date(thisMonday.getTime() + 7 * DAY)];

  const now = new Date();
  const [byStatus, weeklyRaw, stageRaw, followUps, recent, interviews] = await Promise.all([
    Application.aggregate([{ $match: { userId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Application.aggregate([
      { $match: { userId } },
      { $bucket: { groupBy: '$appliedDate', boundaries, default: 'other', output: { count: { $sum: 1 } } } },
    ]),
    Application.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$status',
          days: { $avg: { $divide: [{ $subtract: ['$$NOW', '$statusChangedAt'] }, DAY] } },
        },
      },
    ]),
    Application.find({ userId, followUpDate: { $ne: null }, status: { $nin: ['Offer', 'Rejected'] } })
      .sort({ followUpDate: 1 })
      .limit(6)
      .select('company role followUpDate status'),
    Activity.find({ userId }).sort({ at: -1 }).limit(8),
    Application.aggregate([
      { $match: { userId, 'interviews.date': { $gte: now } } },
      { $unwind: '$interviews' },
      { $match: { 'interviews.date': { $gte: now } } },
      { $sort: { 'interviews.date': 1 } },
      { $limit: 5 },
      { $project: { company: 1, role: 1, type: '$interviews.type', date: '$interviews.date' } },
    ]),
  ]);

  // v3: ghost radar, match vs replies, skill gaps (computed in JS over a lean projection)
  const all = await Application.find({ userId }).select(
    'company role status appliedDate statusChangedAt lastNudgedAt nudgeCount interviews.date matchScore missingSkills'
  ).lean();
  const ghosts = all
    .map((a) => ({ a, g: ghostInfo(a, now) }))
    .filter(({ g }) => g && g.level !== 'ok')
    .sort((x, y) => y.g.daysQuiet - x.g.daysQuiet)
    .slice(0, 8)
    .map(({ a, g }) => ({ _id: a._id, company: a.company, role: a.role, status: a.status, level: g.level, daysQuiet: g.daysQuiet }));
  const ghostTotal = all.filter((a) => { const g = ghostInfo(a, now); return g && g.level !== 'ok'; }).length;
  const matchInsight = buildMatchInsight(all);
  const skillGaps = (() => {
    const tally = new Map();
    all.forEach((a) => (a.missingSkills || []).forEach((k) => tally.set(k, (tally.get(k) || 0) + 1)));
    return [...tally].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, 8).map(([skill, count]) => ({ skill, count }));
  })();

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  byStatus.forEach((b) => (counts[b._id] = b.count));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const weekMap = new Map(weeklyRaw.filter((w) => w._id !== 'other').map((w) => [new Date(w._id).getTime(), w.count]));
  const weekly = starts.map((d) => ({ label: label(d), count: weekMap.get(d.getTime()) || 0 }));

  const stageMap = Object.fromEntries(stageRaw.map((s) => [s._id, s.days]));
  const stages = STATUSES.map((s) => ({ status: s, days: Math.round((stageMap[s] || 0) * 10) / 10 }));

  res.json({
    total,
    active: counts.Applied + counts.Screening + counts.Interview,
    counts,
    responseRate: total ? Math.round(((total - counts.Applied) / total) * 100) : 0,
    offerRate: total ? Math.round((counts.Offer / total) * 100) : 0,
    weekly,
    stages,
    followUps,
    recent,
    interviews,
    ghosts,
    ghostTotal,
    matchInsight,
    skillGaps,
  });
}));

export default router;
