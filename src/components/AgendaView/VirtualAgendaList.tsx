import { useMemo, useRef, useEffect, useState } from 'react';
import { VariableSizeList as List, type ListChildComponentProps } from 'react-window';
import { format } from 'date-fns';
import { MapPin } from 'lucide-react';
import { formatVi } from '@/lib/i18n';
import { isEventOngoing } from '@/lib/eventUtils';
import type { EventOccurrence } from '@/types';
import { cn } from '@/lib/utils';

const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 96;

export type AgendaRow =
  | { type: 'header'; key: string; day: Date; isToday: boolean }
  | { type: 'event'; key: string; occ: EventOccurrence; day: Date };

interface RowData {
  rows: AgendaRow[];
  onEventClick: (eventId: string, day: Date) => void;
}

function AgendaRowRenderer({
  index,
  style,
  data,
}: ListChildComponentProps<RowData>) {
  const row = data.rows[index];
  const onEventClick = data.onEventClick;

  if (row.type === 'header') {
    return (
      <div style={style} className="px-4 sm:px-6 box-border">
        <header
          className={cn(
            'border-b border-border bg-background/95 py-2 backdrop-blur',
            row.isToday && 'border-primary/30'
          )}
        >
          <h3
            className={cn(
              'text-sm font-bold capitalize text-muted-foreground',
              row.isToday && 'text-primary'
            )}
          >
            {row.isToday ? 'Hôm nay — ' : ''}
            {formatVi(row.day, 'EEEE, d MMMM yyyy')}
          </h3>
        </header>
      </div>
    );
  }

  const { occ, day } = row;
  return (
    <div style={style} className="px-4 sm:px-6 pb-2 box-border">
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
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{occ.description}</p>
          )}
        </div>
      </button>
    </div>
  );
}

interface VirtualAgendaListProps {
  rows: AgendaRow[];
  onEventClick: (eventId: string, day: Date) => void;
}

export function VirtualAgendaList({ rows, onEventClick }: VirtualAgendaListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<List>(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [rows]);

  const itemData = useMemo<RowData>(
    () => ({ rows, onEventClick }),
    [rows, onEventClick]
  );

  const getItemSize = (index: number) =>
    rows[index]?.type === 'header' ? HEADER_HEIGHT : ROW_HEIGHT;

  if (!rows.length) return null;

  return (
    <div ref={containerRef} className="h-full min-h-0 flex-1">
      <List
        ref={listRef}
        height={Math.max(height, 200)}
        width="100%"
        itemCount={rows.length}
        itemSize={getItemSize}
        itemData={itemData}
        overscanCount={4}
      >
        {AgendaRowRenderer}
      </List>
    </div>
  );
}
