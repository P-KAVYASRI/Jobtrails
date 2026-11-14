const DAY = 86400000;

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Sort follow-ups into overdue / today / tomorrow (day-level comparison, UTC)
export function classifyFollowUps(apps, now = new Date()) {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  return apps.reduce(
    (acc, a) => {
      const d = new Date(a.followUpDate);
      d.setUTCHours(0, 0, 0, 0);
      const diff = Math.round((d - today) / DAY);
      if (diff < 0) acc.overdue.push(a);
      else if (diff === 0) acc.today.push(a);
      else if (diff === 1) acc.tomorrow.push(a);
      return acc;
    },
    { overdue: [], today: [], tomorrow: [] }
  );
}

// Returns { subject, html, text } or null when there is nothing to report
export function buildReminderEmail(user, followUps, interviews, now = new Date()) {
  const groups = classifyFollowUps(followUps, now);
  const total = followUps.length + interviews.length;
  if (!total) return null;

  const lines = [];
  const section = (title, items) => {
    if (items.length) lines.push({ title, items });
  };
  section('Overdue follow-ups', groups.overdue.map((a) => `${a.company} – ${a.role}`));
  section('Follow up today', groups.today.map((a) => `${a.company} – ${a.role}`));
  section('Follow up tomorrow', groups.tomorrow.map((a) => `${a.company} – ${a.role}`));
  section(
    'Upcoming interviews',
    interviews.map((i) => `${i.company} – ${i.type} interview, ${new Date(i.date).toUTCString().replace(' GMT', ' UTC')}`)
  );

  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px">
    <h2 style="margin:0 0 8px">Hi ${esc(user.name)}, here's your Jobtrail digest</h2>
    ${lines
      .map((l) => `<h3 style="margin:16px 0 4px">${l.title}</h3><ul style="margin:0;padding-left:18px">${l.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`)
      .join('')}
    <p style="color:#64748b;font-size:12px;margin-top:20px">You can turn these emails off in Settings.</p></div>`;
  const text = `Hi ${user.name},\n\n` + lines.map((l) => `${l.title}:\n${l.items.map((i) => `- ${i}`).join('\n')}`).join('\n\n');

  return { subject: `Jobtrail: ${total} thing${total > 1 ? 's' : ''} need your attention`, html, text };
}
