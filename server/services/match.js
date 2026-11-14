import { analyzeMatch } from '../../shared/skills.js';

// Copy the match result onto an application document (does not save it)
export function applyMatch(app, resume) {
  if (!resume || !app.jobDescription) {
    app.matchScore = null;
    app.matchedSkills = [];
    app.missingSkills = [];
    return app;
  }
  const r = analyzeMatch(resume, app.jobDescription);
  app.matchScore = r.score;
  app.matchedSkills = r.matched;
  app.missingSkills = r.missing;
  return app;
}
