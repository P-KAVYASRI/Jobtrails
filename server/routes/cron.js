import { Router } from 'express';
import Application from '../models/Application.js';
import wrap from '../middleware/wrap.js';
import { mailerConfigured, sendMail } from '../services/mailer.js';
import { buildReminderEmail } from '../services/reminders.js';

const router = Router();
const DAY = 86400000;

// Called once a day by Vercel Cron (see vercel.json). Protected with CRON_SECRET.
router.get('/reminders', wrap(async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (!mailerConfigured()) return res.status(503).json({ message: 'SMTP_USER / SMTP_PASS are not set.' });

  const now = new Date();
  const horizon = new Date(now.getTime() + 2 * DAY);
  const apps = await Application.find({
    status: { $nin: ['Offer', 'Rejected'] },
    $or: [
      { followUpDate: { $ne: null, $gte: new Date(now.getTime() - 7 * DAY), $lte: horizon } },
      { 'interviews.date': { $gte: now, $lte: horizon } },
    ],
  }).populate('userId', 'name email remindersEnabled');

  const perUser = new Map();
  for (const a of apps) {
    const u = a.userId;
    if (!u || u.remindersEnabled === false) continue;
    const entry = perUser.get(String(u._id)) || { user: u, follow: [], interviews: [] };
    if (a.followUpDate && a.followUpDate >= new Date(now.getTime() - 7 * DAY) && a.followUpDate <= horizon) entry.follow.push(a);
    (a.interviews || [])
      .filter((i) => i.date && i.date >= now && i.date <= horizon)
      .forEach((i) => entry.interviews.push({ company: a.company, type: i.type, date: i.date }));
    perUser.set(String(u._id), entry);
  }

  let sent = 0;
  for (const { user, follow, interviews } of perUser.values()) {
    const mail = buildReminderEmail(user, follow, interviews, now);
    if (!mail) continue;
    try {
      await sendMail({ to: user.email, ...mail });
      sent++;
    } catch (err) {
      console.error('Reminder email failed for', user.email, err.message);
    }
  }
  res.json({ users: perUser.size, sent });
}));

export default router;
