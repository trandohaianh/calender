import { useMemo } from 'react';
import { useCalendarStore } from '@/store/calendarStore';
import { getEventDateRange } from '@/lib/eventAdapters';

const SITE_URL = import.meta.env.VITE_SITE_URL ?? '';

/** JSON-LD Event schema cho sự kiện sắp tới (SEO web) */
export function SeoStructuredData() {
  const events = useCalendarStore((s) => s.events);

  const jsonLd = useMemo(() => {
    const now = Date.now();
    const upcoming = events
      .map((ev) => {
        const { start, end } = getEventDateRange(ev);
        return { ev, start, end };
      })
      .filter(({ start }) => start.getTime() >= now - 86400000)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 10);

    if (!upcoming.length) return null;

    return {
      '@context': 'https://schema.org',
      '@graph': upcoming.map(({ ev, start, end }) => ({
        '@type': 'Event',
        name: ev.title,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        ...(ev.location ? { location: { '@type': 'Place', name: ev.location } } : {}),
        ...(SITE_URL ? { url: `${SITE_URL.replace(/\/$/, '')}/?event=${ev.id}` } : {}),
      })),
    };
  }, [events]);

  if (!jsonLd) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
