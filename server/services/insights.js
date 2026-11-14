import { matchBand } from '../../shared/skills.js';

const BANDS = ['High', 'Medium', 'Low'];
const MIN_PER_BAND = 3;

// "Do applications that match my resume better actually get more replies?"
// A reply = the application moved past Applied (same definition as the response rate).
export function buildMatchInsight(apps) {
  const scored = apps.filter((a) => typeof a.matchScore === 'number');
  const bands = BANDS.map((band) => {
    const list = scored.filter((a) => matchBand(a.matchScore) === band);
    const replied = list.filter((a) => a.status !== 'Applied').length;
    return { band, total: list.length, replied, rate: list.length ? Math.round((replied / list.length) * 100) : 0 };
  });
  const avgScore = scored.length ? Math.round(scored.reduce((s, a) => s + a.matchScore, 0) / scored.length) : null;

  const high = bands[0];
  const low = bands[2];
  let message = null;
  if (scored.length === 0) {
    message = 'Save your resume in Settings and paste job descriptions to unlock this insight.';
  } else if (high.total >= MIN_PER_BAND && low.total >= MIN_PER_BAND) {
    const diff = high.rate - low.rate;
    message =
      diff > 5 ? `Strong-match applications get replies ${diff} points more often (${high.rate}% vs ${low.rate}%). Prioritise roles that fit.`
      : diff < -5 ? `Interesting: weaker-match roles are getting more replies (${low.rate}% vs ${high.rate}%). Your resume may be undersold for the strong ones.`
      : 'Match score is not changing your reply rate yet. Try tailoring your resume keywords to each job.';
  } else {
    message = `Keep going: add at least ${MIN_PER_BAND} applications in both the High and Low bands to see whether a better match gets more replies.`;
  }
  return { scored: scored.length, avgScore, bands, message };
}
