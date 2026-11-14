import { Draggable } from '@hello-pangea/dnd';
import { MapPin, Wallet, BellRing, ExternalLink, CalendarClock } from 'lucide-react';
import { PRIORITY_STYLE } from '../constants';
import { followUpState, FOLLOW_STYLE, fmtDate, nextInterview, fmtDateTime } from '../utils';

export default function ApplicationCard({ app, index, onOpen, dragDisabled }) {
  const follow = followUpState(app);
  const interview = nextInterview(app);
  return (
    <Draggable draggableId={app._id} index={index} isDragDisabled={dragDisabled}>
      {(p, snap) => (
        <div
          ref={p.innerRef}
          {...p.draggableProps}
          {...p.dragHandleProps}
          onClick={() => onOpen(app)}
          className={`group mb-2.5 cursor-pointer rounded-lg border bg-white p-3 text-left transition dark:bg-ink-800 ${
            snap.isDragging
              ? 'rotate-1 border-teal-500 shadow-2xl'
              : 'border-slate-200 hover:border-teal-400 dark:border-ink-700 dark:hover:border-teal-500/60'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-bold leading-tight">{app.company}</p>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">{app.role}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_STYLE[app.priority]}`}>
              {app.priority}
            </span>
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
                <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600 dark:bg-ink-700 dark:text-slate-300">
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>Applied {fmtDate(app.appliedDate)}</span>
            {app.link && (
              <a href={app.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                 className="opacity-0 transition group-hover:opacity-100 hover:text-teal-500" aria-label="Open job posting">
                <ExternalLink size={13} />
              </a>
            )}
          </div>

          {interview && (
            <div className="mt-2 flex items-center gap-1.5 rounded-md bg-violet-100 px-2 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              <CalendarClock size={12} /> {interview.type} interview · {fmtDateTime(interview.date)}
            </div>
          )}

          {follow && (
            <div className={`mt-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${FOLLOW_STYLE[follow.tone]}`}>
              <BellRing size={12} /> {follow.text}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
