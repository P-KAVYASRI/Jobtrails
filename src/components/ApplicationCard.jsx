import { Draggable } from '@hello-pangea/dnd';
import { MapPin, Wallet, BellRing, ExternalLink, CalendarClock, Ghost, Target } from 'lucide-react';
import { followUpState, FOLLOW_STYLE, fmtDate, nextInterview, fmtDateTime, ghostChip, GHOST_STYLE, matchStyle } from '../utils';

const PRIORITY_DOT = { High: 'bg-rose-500', Medium: 'bg-amber-400', Low: 'bg-slate-300 dark:bg-slate-500' };

export default function ApplicationCard({ app, index, onOpen, dragDisabled }) {
  const follow = followUpState(app);
  const interview = nextInterview(app);
  const quiet = ghostChip(app);

  return (
    <Draggable draggableId={app._id} index={index} isDragDisabled={dragDisabled}>
      {(p, snap) => (
        <div
          ref={p.innerRef}
          {...p.draggableProps}
          {...p.dragHandleProps}
          onClick={() => onOpen(app)}
          className={`group mb-2 cursor-pointer rounded-lg border bg-white p-3 text-left shadow-sm transition dark:bg-ink-800 ${
            snap.isDragging
              ? 'rotate-1 border-teal-500 shadow-xl'
              : 'border-slate-200 hover:border-slate-300 hover:shadow dark:border-ink-700 dark:hover:border-slate-600'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold leading-tight">{app.company}</p>
              <p className="mt-0.5 truncate text-[13px] text-slate-500 dark:text-slate-400">{app.role}</p>
            </div>
            {typeof app.matchScore === 'number' && (
              <button type="button" title="Resume match" aria-label={`${app.matchScore}% resume match, open details`}
                onClick={(e) => { e.stopPropagation(); onOpen(app, 'Match'); }}
                className={`chip shrink-0 tabular-nums transition hover:brightness-95 ${matchStyle(app.matchScore)}`}>
                <Target size={11} /> {app.matchScore}%
              </button>
            )}
          </div>

          {(app.location || app.salary) && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {app.location && <span className="flex items-center gap-1"><MapPin size={12} />{app.location}</span>}
              {app.salary && <span className="flex items-center gap-1"><Wallet size={12} />{app.salary}</span>}
            </div>
          )}

          {app.tags?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {app.tags.slice(0, 4).map((t) => (
                <span key={t} className="rounded border border-slate-200 px-1.5 py-px text-[11px] text-slate-500 dark:border-ink-700 dark:text-slate-400">{t}</span>
              ))}
            </div>
          )}

          {(interview || quiet || follow) && (
            <div className="mt-2.5 space-y-1.5">
              {interview && (
                <div className="chip w-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                  <CalendarClock size={12} /> {interview.type} interview, {fmtDateTime(interview.date)}
                </div>
              )}
              {quiet && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(app, 'Follow-up'); }}
                  className={`chip w-full text-left transition hover:brightness-95 ${GHOST_STYLE[quiet.level]}`}>
                  <Ghost size={12} /> {quiet.text} <span className="ml-auto font-semibold underline underline-offset-2">Draft follow-up</span>
                </button>
              )}
              {follow && (
                <div className={`chip w-full ${FOLLOW_STYLE[follow.tone]}`}><BellRing size={12} /> {follow.text}</div>
              )}
            </div>
          )}

          <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400">
            <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[app.priority] || PRIORITY_DOT.Low}`} title={`${app.priority} priority`} />
            <span>{app.priority}</span>
            <span className="text-slate-300 dark:text-ink-700">|</span>
            <span>Applied {fmtDate(app.appliedDate)}</span>
            {app.link && (
              <a href={app.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                 className="ml-auto opacity-0 transition group-hover:opacity-100 hover:text-teal-500" aria-label="Open job posting">
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
