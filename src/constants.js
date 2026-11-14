export const STATUSES = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected'];
export const PRIORITIES = ['Low', 'Medium', 'High'];

// Full class names so Tailwind can detect them
export const STATUS_STYLE = {
  Applied:   { dot: 'bg-sky-500',     hex: '#0ea5e9', bar: 'border-t-sky-500' },
  Screening: { dot: 'bg-violet-500',  hex: '#8b5cf6', bar: 'border-t-violet-500' },
  Interview: { dot: 'bg-amber-500',   hex: '#f59e0b', bar: 'border-t-amber-500' },
  Offer:     { dot: 'bg-emerald-500', hex: '#10b981', bar: 'border-t-emerald-500' },
  Rejected:  { dot: 'bg-rose-500',    hex: '#f43f5e', bar: 'border-t-rose-500' },
};

export const PRIORITY_STYLE = {
  High:   'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Low:    'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
};

export const INTERVIEW_TYPES = ['Phone', 'Technical', 'HR', 'Onsite', 'Other'];
