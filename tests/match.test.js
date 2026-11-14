import { describe, it, expect } from 'vitest';
import { analyzeMatch, extractSkills, matchBand } from '../shared/skills.js';
import { buildMatchInsight } from '../server/services/insights.js';

const JD = 'Required: strong React and Node.js experience, REST APIs, MongoDB. Nice to have: Docker, AWS. Must know Git and TypeScript.';

describe('extractSkills', () => {
  it('understands aliases', () => {
    const s = extractSkills('I use nodejs, Mongoose and k8s. Also ReactJS.');
    expect([...s.keys()]).toEqual(expect.arrayContaining(['Node.js', 'MongoDB', 'Kubernetes', 'React']));
  });
  it('does not confuse Java and JavaScript', () => {
    const s = extractSkills('We use JavaScript every day.');
    expect(s.has('JavaScript')).toBe(true);
    expect(s.has('Java')).toBe(false);
  });
  it('weights required skills above optional ones', () => {
    const s = extractSkills(JD);
    expect(s.get('React')).toBeGreaterThan(s.get('Docker'));
  });
});

describe('analyzeMatch', () => {
  it('gives 100 for a perfect resume and lists missing skills otherwise', () => {
    const full = analyzeMatch('React Node.js REST APIs MongoDB Docker AWS Git TypeScript', JD);
    expect(full.score).toBe(100);
    const part = analyzeMatch('React, Node.js, MongoDB, Git', JD);
    expect(part.score).toBeGreaterThan(40);
    expect(part.score).toBeLessThan(100);
    expect(part.missing).toContain('TypeScript');
    expect(part.matched).toContain('React');
  });
  it('misses optional skills less harshly than required ones', () => {
    const noOptional = analyzeMatch('React Node.js REST APIs MongoDB Git TypeScript', JD).score;
    const noRequired = analyzeMatch('Docker AWS Git TypeScript MongoDB', JD).score;
    expect(noOptional).toBeGreaterThan(noRequired);
  });
  it('returns a null score when the job description has too few known skills', () => {
    expect(analyzeMatch('React', 'We are a friendly team who like coffee.').score).toBeNull();
  });
  it('asks for a resume when it is empty', () => {
    const r = analyzeMatch('', JD);
    expect(r.score).toBeNull();
    expect(r.reason).toBe('resume');
  });
});

describe('matchBand', () => {
  it('bands scores', () => {
    expect([matchBand(85), matchBand(55), matchBand(10), matchBand(null)]).toEqual(['High', 'Medium', 'Low', null]);
  });
});

describe('buildMatchInsight', () => {
  const mk = (score, status) => ({ matchScore: score, status });
  it('compares reply rates across bands', () => {
    const apps = [
      ...[80, 90, 75].map((s) => mk(s, 'Interview')),
      ...[20, 30, 10].map((s) => mk(s, 'Applied')),
    ];
    const r = buildMatchInsight(apps);
    expect(r.bands[0].rate).toBe(100);
    expect(r.bands[2].rate).toBe(0);
    expect(r.message).toMatch(/100 points/);
  });
  it('waits for enough data', () => {
    expect(buildMatchInsight([mk(80, 'Offer')]).message).toMatch(/Keep going/);
    expect(buildMatchInsight([]).message).toMatch(/Save your resume/);
  });
});
