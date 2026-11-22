import type { EventOccurrence } from '@/types';

export interface LayoutedEvent {
  occ: EventOccurrence;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
}

/** Bố trí events chồng lấn theo cột trong một ngày */
export function layoutDayEvents(
  events: EventOccurrence[],
  hourHeight: number
): LayoutedEvent[] {
  if (events.length === 0) return [];

  type Item = {
    occ: EventOccurrence;
    startMin: number;
    endMin: number;
  };

  const items: Item[] = events
    .map((occ) => {
      const startMin = occ.start.getHours() * 60 + occ.start.getMinutes();
      const endMin = occ.end.getHours() * 60 + occ.end.getMinutes();
      return { occ, startMin, endMin: Math.max(endMin, startMin + 15) };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const clusters: Item[][] = [];
  let cluster: Item[] = [];
  let clusterEnd = -1;

  for (const item of items) {
    if (cluster.length === 0 || item.startMin < clusterEnd) {
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMin);
    } else {
      clusters.push(cluster);
      cluster = [item];
      clusterEnd = item.endMin;
    }
  }
  if (cluster.length) clusters.push(cluster);

  const results: LayoutedEvent[] = [];

  for (const group of clusters) {
    const columnEnds: number[] = [];
    const placed: { item: Item; col: number }[] = [];

    for (const item of group) {
      let col = columnEnds.findIndex((end) => end <= item.startMin);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(item.endMin);
      } else {
        columnEnds[col] = item.endMin;
      }
      placed.push({ item, col });
    }

    const totalCols = columnEnds.length;
    const gap = 1.5;

    for (const { item, col } of placed) {
      const widthPct = 100 / totalCols - gap;
      results.push({
        occ: item.occ,
        top: (item.startMin / 60) * hourHeight,
        height: Math.max(((item.endMin - item.startMin) / 60) * hourHeight, 28),
        leftPct: col * (100 / totalCols) + gap / 2,
        widthPct,
      });
    }
  }

  return results;
}
