import { Router } from 'express';
import { z } from 'zod';
import auth from '../middleware/auth.js';
import wrap from '../middleware/wrap.js';

const router = Router();
router.use(auth);

const schema = z.object({
  task: z.enum(['cover_letter', 'interview_questions', 'match_summary']),
  company: z.string().max(120).optional(),
  role: z.string().max(120).optional(),
  jobDescription: z.string().min(30, 'Paste the job description first (at least a few lines).').max(8000),
  background: z.string().max(3000).optional(),
});

const INSTRUCTIONS = {
  cover_letter:
    'Write a concise, genuine cover letter (under 250 words) for this role. Use the candidate background if given. No placeholders like [Your Name]; end with a simple sign-off. Avoid clichés.',
  interview_questions:
    'List 8 likely interview questions for this role (mix of technical and behavioural), each followed by a one-line hint on what a strong answer covers.',
  match_summary:
    'Summarise the role in 3 bullets, list the 6 most important skills it asks for, and (if background is given) say which the candidate already has and which gaps to prepare for.',
};

// Free option: Google Gemini (aistudio.google.com). Paid option: Anthropic Claude.
async function askGemini(system, prompt) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048 },
    }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('\n');
}

async function askClaude(system, prompt) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
      max_tokens: 1200,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}

router.post('/', wrap(async (req, res) => {
  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ message: 'AI assistant is not set up. Add GEMINI_API_KEY (free) to your environment variables.' });
  }
  const d = schema.parse(req.body);
  const prompt = [
    `Company: ${d.company || 'n/a'}`,
    `Role: ${d.role || 'n/a'}`,
    `Candidate background: ${d.background || 'not provided'}`,
    `Job description:\n${d.jobDescription}`,
    `\nTask: ${INSTRUCTIONS[d.task]}`,
  ].join('\n');
  const system = 'You are a practical career coach helping a job seeker. Reply in plain text with simple formatting.';

  try {
    const result = process.env.GEMINI_API_KEY ? await askGemini(system, prompt) : await askClaude(system, prompt);
    res.json({ result });
  } catch (err) {
    console.error('AI error:', err.message);
    const busy = /429/.test(err.message);
    res.status(502).json({
      message: busy
        ? 'Free AI limit reached for now. Wait a minute and try again.'
        : 'The AI service returned an error. Check your API key and model name.',
    });
  }
}));

export default router;
