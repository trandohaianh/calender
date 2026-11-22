import { format } from 'date-fns';
import { MapPin } from 'lucide-react';
import { formatVi } from '@/lib/i18n';
import { isEventOngoing } from '@/lib/eventUtils';
import { cn } from '@/lib/utils';
import type { AgendaRow } from './VirtualAgendaList';
import { DayWeatherBadge } from '@/components/WeatherAi/DayWeatherBadge';

interface AgendaSimpleListProps {
  rows: AgendaRow[];
  onEventClick: (eventId: string, day: Date) => void;
}

/** Danh sách agenda nhỏ — không cần virtualize */
export function AgendaSimpleList({ rows, onEventClick }: AgendaSimpleListProps) {
  const sections: { header: AgendaRow & { type: 'header' }; events: AgendaRow[] }[] = [];
  let current: (typeof sections)[0] | null = null;

  for (const row of rows) {
    if (row.type === 'header') {
      current = { header: row, events: [] };
      sections.push(current);
    } else if (current) {
      current.events.push(row);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      {sections.map(({ header, events }) => (
        <section key={header.key} className="mb-8">
          <header
            className={cn(
              'sticky top-0 z-10 -mx-1 mb-3 flex items-center justify-between border-b border-border bg-background/95 px-1 py-2 backdrop-blur',
              header.isToday && 'border-primary/30'
            )}
          >
            <h3
              className={cn(
                'text-sm font-bold capitalize text-muted-foreground',
                header.isToday && 'text-primary'
              )}
            >
              {header.isToday ? 'Hôm nay — ' : ''}
              {formatVi(header.day, 'EEEE, d MMMM yyyy')}
            </h3>
            <DayWeatherBadge date={header.day} />
          </header>
          <ul className="space-y-2">
            {events.map((row) => {
              if (row.type !== 'event') return null;
              const { occ, day } = row;
              return (
                <li key={row.key}>
                  <button
                    type="button"
                    className={cn(
                      'group flex w-full gap-4 rounded-xl border border-border/60 bg-card p-4 text-left',
                      'transition-all duration-200 hover:border-primary/30 hover:bg-accent/30 hover:shadow-md',
                      'dark:bg-card/80 dark:hover:bg-accent/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isEventOngoing(occ) && 'ring-2 ring-primary/50'
                    )}
                    style={{ borderLeftWidth: 4, borderLeftColor: occ.color }}
                    onClick={() => onEventClick(occ.eventId, day)}
                  >
                    <time className="w-20 shrink-0 font-mono text-xs text-muted-foreground sm:w-24 sm:text-sm">
                      {occ.allDay ? (
                        <span className="font-medium text-foreground">Cả ngày</span>
                      ) : (
                        <>
                          <span className="block">{format(occ.start, 'HH:mm')}</span>
                          <span className="block opacity-70">{format(occ.end, 'HH:mm')}</span>
                        </>
                      )}
                    </time>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold group-hover:text-primary transition-colors">
                        {occ.title}
                      </p>
                      {occ.location && (
                        <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                          {occ.location}
                        </p>
                      )}
                      {occ.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {occ.description}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
