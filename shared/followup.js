// Follow-up coach: deterministic, human-sounding email drafts. No AI key needed.
import { ghostInfo, followUpStage } from './ghost.js';

const firstName = (n = '') => String(n).trim().split(/\s+/)[0] || '';
const clean = (s = '') => String(s).replace(/\s+/g, ' ').trim();

const TIPS = {
  first: 'Keep it short. Most replies come within 2 to 3 working days of a polite first nudge.',
  second: 'Add something new (a project, a fix, a question) so this is not just a repeat of the first email.',
  final: 'This is a closing-the-loop note. It is polite, takes no pressure to answer, and often gets the reply the earlier ones did not.',
};

export function buildFollowUpDraft(app, user = {}, now = new Date()) {
  const info = ghostInfo(app, now);
  const stage = followUpStage(app, info);
  const role = clean(app.role) || 'the role';
  const company = clean(app.company) || 'your team';
  const hi = app.contactName ? `Hi ${firstName(app.contactName)},` : 'Hi there,';
  const me = firstName(user.name) ? `${clean(user.name)}` : '';
  const sign = `Thanks and regards,\n${me}`.trim();
  const interviewed = app.status === 'Interview';
  const screening = app.status === 'Screening';
  const days = info?.daysQuiet;

  let subject;
  let body;

  if (stage === 'first') {
    subject = interviewed ? `Thank you, and next steps for ${role}` : `Following up on my ${role} application`;
    body = interviewed
      ? `${hi}\n\nThank you again for taking the time to speak with me about the ${role} position at ${company}. I really enjoyed learning more about the team and the work.\n\nI wanted to check in on the next steps and whether there is anything else I can share to help with the decision.\n\n${sign}`
      : `${hi}\n\nI applied for the ${role} position at ${company}${days ? ` ${days} days ago` : ''} and wanted to follow up on my application. I am still very interested in the role${screening ? ' and enjoyed our initial conversation' : ''}.\n\nIf it is useful, I am happy to share anything else about my background or projects. Could you let me know where things stand?\n\n${sign}`;
  } else if (stage === 'second') {
    subject = `Re: ${role} at ${company}`;
    body = `${hi}\n\nI am following up on my earlier note about the ${role} role at ${company}. Since then I have kept working on my skills and projects, and I would still love the chance to contribute to your team.\n\nWould it be possible to get a quick update on the timeline, even if the process is still ongoing?\n\n${sign}`;
  } else {
    subject = `Closing the loop: ${role} at ${company}`;
    body = `${hi}\n\nI have reached out a few times about the ${role} position at ${company} and understand that hiring timelines can change. I do not want to crowd your inbox, so this will be my last note.\n\nIf the role is still open, I would be glad to continue. If you have moved in another direction, I would appreciate a quick note so I can plan, and I would welcome being considered for future openings.\n\nThank you for your time.\n\n${sign}`;
  }

  return { stage, subject, body, tip: TIPS[stage] };
}
