import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import Application from '../models/Application.js';
import Activity from '../models/Activity.js';
import auth from '../middleware/auth.js';
import wrap from '../middleware/wrap.js';

const router = Router();

const password = z.string().min(6, 'Password must be at least 6 characters').max(100);
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Enter a valid email address'),
  password,
});
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });

const sign = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, remindersEnabled: u.remindersEnabled !== false });

router.post('/register', wrap(async (req, res) => {
  const { name, email, password: pw } = registerSchema.parse(req.body);
  if (await User.findOne({ email: email.toLowerCase() })) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }
  const user = await User.create({ name, email, password: await bcrypt.hash(pw, 10) });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
}));

router.post('/login', wrap(async (req, res) => {
  const { email, password: pw } = loginSchema.parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(pw, user.password))) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }
  res.json({ token: sign(user), user: publicUser(user) });
}));

router.get('/me', auth, wrap(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: 'Account not found.' });
  res.json({ user: publicUser(user) });
}));

router.patch('/profile', auth, wrap(async (req, res) => {
  const data = z
    .object({ name: z.string().trim().min(2).max(80).optional(), remindersEnabled: z.boolean().optional() })
    .parse(req.body);
  const user = await User.findByIdAndUpdate(req.userId, data, { new: true });
  res.json({ user: publicUser(user) });
}));

router.post('/password', auth, wrap(async (req, res) => {
  const { currentPassword, newPassword } = z.object({ currentPassword: z.string().min(1), newPassword: password }).parse(req.body);
  const user = await User.findById(req.userId);
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ ok: true });
}));

router.delete('/account', auth, wrap(async (req, res) => {
  const { password: pw } = z.object({ password: z.string().min(1) }).parse(req.body);
  const user = await User.findById(req.userId);
  if (!(await bcrypt.compare(pw, user.password))) return res.status(400).json({ message: 'Password is incorrect.' });
  await Promise.all([Application.deleteMany({ userId: user._id }), Activity.deleteMany({ userId: user._id })]);
  await user.deleteOne();
  res.json({ ok: true });
}));

export default router;
