// Resume to job match engine. Pure JS, no paid AI, fully explainable.
//
// How it works
// 1. A dictionary maps ~110 skills to the many ways people write them ("node", "node.js", "nodejs").
// 2. We find which skills appear in the job description and give each a weight:
//      base 1  +0.5 per extra mention (max +1)
//      +1 when the same sentence says required / must / essential / proficient
//      -0.5 when the sentence says preferred / bonus / nice to have
// 3. Score = weight of skills found in the resume / total weight of skills the job asks for.
// 4. We return matched and missing skills so the user knows exactly what to change.

const S = (name, ...aliases) => ({ name, re: new RegExp(`(?<![a-z0-9+#.])(?:${aliases.join('|')})(?![a-z0-9+#])`, 'i') });

export const SKILLS = [
  // languages
  S('JavaScript', 'javascript', 'java script', 'ecmascript', 'es6', 'js'),
  S('TypeScript', 'typescript', 'ts'),
  S('Python', 'python3?'),
  S('Java', 'java(?!\\s?script)'),
  S('C++', 'c\\+\\+', 'cpp'),
  S('C#', 'c#', 'csharp', 'c sharp'),
  S('C', 'c language', 'c programming'),
  S('Go', 'golang', 'go lang'),
  S('Rust', 'rust'),
  S('PHP', 'php'),
  S('Ruby', 'ruby'),
  S('Kotlin', 'kotlin'),
  S('Swift', 'swift'),
  S('Dart', 'dart'),
  S('SQL', 'sql', 'structured query language'),
  S('HTML', 'html5?'),
  S('CSS', 'css3?'),
  S('Bash', 'bash', 'shell scripting', 'shell script'),
  // frontend
  S('React', 'react', 'react\\.js', 'reactjs'),
  S('Next.js', 'next\\.js', 'nextjs'),
  S('Vue', 'vue', 'vue\\.js', 'vuejs'),
  S('Angular', 'angular', 'angularjs'),
  S('Svelte', 'svelte'),
  S('Redux', 'redux', 'redux toolkit', 'zustand'),
  S('Tailwind CSS', 'tailwind', 'tailwindcss'),
  S('Bootstrap', 'bootstrap'),
  S('Sass', 'sass', 'scss'),
  S('Responsive design', 'responsive design', 'responsive web', 'mobile[- ]first'),
  S('Webpack', 'webpack', 'vite'),
  S('React Native', 'react native'),
  S('Flutter', 'flutter'),
  S('Android', 'android'),
  S('iOS', 'ios'),
  // backend
  S('Node.js', 'node', 'node\\.js', 'nodejs'),
  S('Express', 'express', 'express\\.js', 'expressjs'),
  S('NestJS', 'nestjs', 'nest\\.js'),
  S('Django', 'django'),
  S('Flask', 'flask'),
  S('FastAPI', 'fastapi'),
  S('Spring Boot', 'spring boot', 'spring framework'),
  S('.NET', '\\.net', 'dotnet', 'asp\\.net'),
  S('Laravel', 'laravel'),
  S('REST APIs', 'rest', 'restful', 'rest apis?', 'web services', 'api development'),
  S('GraphQL', 'graphql'),
  S('Microservices', 'microservices?'),
  S('WebSockets', 'websockets?', 'socket\\.io'),
  S('Authentication', 'jwt', 'oauth2?', 'authentication', 'authorization'),
  // data
  S('MongoDB', 'mongodb', 'mongo', 'mongoose'),
  S('PostgreSQL', 'postgres', 'postgresql'),
  S('MySQL', 'mysql', 'mariadb'),
  S('Redis', 'redis'),
  S('Firebase', 'firebase', 'firestore'),
  S('Elasticsearch', 'elasticsearch', 'elastic search'),
  S('Kafka', 'kafka'),
  S('NoSQL', 'nosql'),
  S('Data structures', 'data structures?', 'dsa', 'algorithms?'),
  S('Pandas', 'pandas'),
  S('NumPy', 'numpy'),
  S('Data analysis', 'data analysis', 'data analytics', 'analytics'),
  S('Excel', 'excel', 'google sheets'),
  S('Power BI', 'power ?bi'),
  S('Tableau', 'tableau'),
  S('Machine learning', 'machine learning', 'ml'),
  S('Deep learning', 'deep learning', 'neural networks?'),
  S('NLP', 'nlp', 'natural language processing'),
  S('TensorFlow', 'tensorflow'),
  S('PyTorch', 'pytorch'),
  S('scikit-learn', 'scikit[- ]learn', 'sklearn'),
  S('LLMs', 'llms?', 'large language models?', 'generative ai', 'genai', 'prompt engineering'),
  // devops / cloud
  S('Git', 'git', 'github', 'gitlab', 'version control'),
  S('Docker', 'docker', 'containers?'),
  S('Kubernetes', 'kubernetes', 'k8s'),
  S('AWS', 'aws', 'amazon web services', 'ec2', 's3', 'lambda'),
  S('Azure', 'azure'),
  S('GCP', 'gcp', 'google cloud'),
  S('CI/CD', 'ci/cd', 'ci ?cd', 'continuous integration', 'continuous deployment', 'github actions', 'jenkins'),
  S('Linux', 'linux', 'unix'),
  S('Terraform', 'terraform', 'infrastructure as code'),
  S('Nginx', 'nginx'),
  S('Vercel', 'vercel', 'netlify'),
  // quality & practices
  S('Testing', 'unit tests?', 'unit testing', 'testing', 'jest', 'vitest', 'mocha', 'pytest', 'junit', 'cypress', 'playwright', 'selenium'),
  S('TDD', 'tdd', 'test[- ]driven'),
  S('Agile', 'agile', 'scrum', 'kanban', 'sprints?'),
  S('Jira', 'jira'),
  S('System design', 'system design', 'software architecture', 'architecture'),
  S('OOP', 'oop', 'object[- ]oriented'),
  S('Design patterns', 'design patterns?'),
  S('Performance optimization', 'performance optimi[sz]ation', 'optimi[sz]ing performance', 'web performance'),
  S('Security', 'owasp', 'application security', 'web security', 'secure coding'),
  S('Accessibility', 'accessibility', 'a11y', 'wcag'),
  S('SEO', 'seo'),
  // design / product / soft
  S('Figma', 'figma'),
  S('UI/UX', 'ui/ux', 'ux', 'ui design', 'user experience', 'user interface'),
  S('Product thinking', 'product management', 'product thinking', 'roadmap'),
  S('Communication', 'communication skills?', 'communicat\\w+', 'stakeholders?'),
  S('Teamwork', 'teamwork', 'collaborat\\w+', 'cross[- ]functional'),
  S('Problem solving', 'problem[- ]solving', 'analytical'),
  S('Leadership', 'leadership', 'mentoring', 'mentor'),
  S('Documentation', 'documentation', 'technical writing'),
  S('Postman', 'postman', 'swagger', 'openapi'),
  S('Linux servers', 'ssh', 'server administration'),
  S('Cybersecurity', 'cyber ?security', 'penetration testing', 'pentest'),
  S('Networking', 'networking', 'tcp/ip', 'http'),
  S('Embedded', 'embedded', 'arduino', 'raspberry pi', 'iot'),
  S('Blockchain', 'blockchain', 'solidity', 'web3', 'smart contracts?'),
  S('Game development', 'unity', 'unreal', 'game development'),
  S('Salesforce', 'salesforce'),
  S('SAP', 'sap'),
  S('Digital marketing', 'digital marketing', 'google ads', 'content marketing'),
];

const REQUIRED = /\b(required|requirements?|must|essential|mandatory|proficien\w+|strong|expert\w*|hands[- ]on|minimum|experience (?:in|with))\b/i;
const OPTIONAL = /\b(preferred|bonus|nice[- ]to[- ]have|good to have|plus|a plus|desirable|optional|familiarity|exposure)\b/i;

const sentences = (text) => String(text || '').split(/(?<=[.!?;])\s+|\n+/).map((s) => s.trim()).filter(Boolean);

/** Skills found in a text -> Map(name -> weight). Weight only matters for job descriptions. */
export function extractSkills(text) {
  const found = new Map();
  for (const sent of sentences(text)) {
    for (const { name, re } of SKILLS) {
      if (!re.test(sent)) continue;
      const cur = found.get(name) || { count: 0, bonus: 0 };
      cur.count += 1;
      if (REQUIRED.test(sent)) cur.bonus = Math.max(cur.bonus, 1);
      else if (OPTIONAL.test(sent)) cur.bonus = Math.min(cur.bonus, -0.5);
      found.set(name, cur);
    }
  }
  const out = new Map();
  for (const [name, { count, bonus }] of found) {
    out.set(name, Math.max(0.5, 1 + Math.min(count - 1, 2) * 0.5 + bonus));
  }
  return out;
}

export const MIN_JD_SKILLS = 3;

/** { score: 0-100 | null, matched: [], missing: [], jobSkills: n, reason? } */
export function analyzeMatch(resumeText, jobDescription) {
  const jd = extractSkills(jobDescription);
  if (jd.size < MIN_JD_SKILLS) {
    return { score: null, matched: [], missing: [], jobSkills: jd.size, reason: 'jd' };
  }
  const resume = extractSkills(resumeText);
  if (!resume.size) {
    return { score: null, matched: [], missing: [...jd.keys()], jobSkills: jd.size, reason: 'resume' };
  }
  let total = 0;
  let got = 0;
  const matched = [];
  const missing = [];
  for (const [name, w] of jd) {
    total += w;
    if (resume.has(name)) { got += w; matched.push({ name, weight: w }); } else missing.push({ name, weight: w });
  }
  const byWeight = (a, b) => b.weight - a.weight || a.name.localeCompare(b.name);
  return {
    score: Math.round((got / total) * 100),
    matched: matched.sort(byWeight).map((m) => m.name),
    missing: missing.sort(byWeight).map((m) => m.name),
    jobSkills: jd.size,
  };
}

export const matchBand = (score) => (score == null ? null : score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low');
