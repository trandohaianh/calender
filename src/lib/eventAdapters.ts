import { Timestamp } from 'firebase/firestore';
import { addDays, addMonths } from 'date-fns';
import { lunarNthOccurrence } from '@/lib/lunarRecurrence';
import { isLunarRecurrence } from '@/types';
import type {
  CalendarEvent,
  CreateCalendarEventInput,
  EventFormValues,
  RecurrenceType,
  ReminderMinutes,
} from '@/types';

export function toJsDate(value: Timestamp | Date): Date {
  if (value instanceof Timestamp) return value.toDate();
  return value;
}

export function getEventDateRange(ev: CalendarEvent): { start: Date; end: Date } {
  const startBase = toJsDate(ev.startDate);
  const endBase = toJsDate(ev.endDate);

  if (ev.isAllDay) {
    const start = new Date(startBase);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endBase);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  return { start: startBase, end: endBase };
}

export function formToEventInput(form: EventFormValues): CreateCalendarEventInput {
  const start = buildTimestamp(form.startDate, form.startTime, form.isAllDay, 'start');
  const end = buildTimestamp(form.endDate, form.endTime, form.isAllDay, 'end');

  const input: CreateCalendarEventInput = {
    title: form.title.trim(),
    description: stripHtml(form.description)?.trim() || undefined,
    location: form.location?.trim() || undefined,
    startDate: start,
    endDate: end,
    isAllDay: form.isAllDay,
    color: form.color,
    calendarId: form.calendarId,
    reminder: form.reminder || undefined,
  };

  if (form.recurrence !== 'none') {
    input.recurrence = {
      type: form.recurrence as RecurrenceType,
      interval: 1,
    };
    if (form.recurrenceEndMode === 'date' && form.recurrenceEndDate) {
      const [y, m, d] = form.recurrenceEndDate.split('-').map(Number);
      const endDate = new Date(y, m - 1, d, 23, 59, 59, 999);
      input.recurrence.endDate = Timestamp.fromDate(endDate);
    } else if (form.recurrenceEndMode === 'count' && form.recurrenceCount) {
      input.recurrence.endDate = Timestamp.fromDate(
        estimateRecurrenceEnd(start.toDate(), form.recurrence, form.recurrenceCount)
      );
    }
  }

  return input;
}

function estimateRecurrenceEnd(
  start: Date,
  type: RecurrenceType,
  count: number
): Date {
  let d = new Date(start);
  const n = count - 1;
  if (isLunarRecurrence(type)) {
    d = lunarNthOccurrence(start, type, 1, count);
  } else if (type === 'daily') d = addDays(d, n);
  else if (type === 'weekly') d = addDays(d, n * 7);
  else if (type === 'monthly') d = addMonths(d, n);
  else d = addMonths(d, n * 12);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function eventToForm(ev: CalendarEvent): EventFormValues {
  const { start, end } = getEventDateRange(ev);
  let recurrenceEndMode: EventFormValues['recurrenceEndMode'] = 'never';
  let recurrenceEndDate: string | undefined;
  let recurrenceCount: number | undefined;

  if (ev.recurrence?.endDate) {
    recurrenceEndMode = 'date';
    recurrenceEndDate = formatDateInput(ev.recurrence.endDate.toDate());
  }

  return {
    title: ev.title,
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
    startTime: formatTimeInput(start),
    endTime: formatTimeInput(end),
    isAllDay: ev.isAllDay,
    recurrence: ev.recurrence?.type ?? 'none',
    recurrenceEndMode,
    recurrenceEndDate,
    recurrenceCount,
    calendarId: ev.calendarId,
    color: ev.color,
    location: ev.location ?? '',
    description: ev.description ?? '',
    reminder: (ev.reminder ?? 0) as ReminderMinutes,
  };
}

export function formToEventPatch(
  form: Partial<EventFormValues>
): Partial<CreateCalendarEventInput> {
  const full = { ...defaultFormValues(), ...form } as EventFormValues;
  const patch: Partial<CreateCalendarEventInput> = {};

  if (form.title !== undefined) patch.title = form.title.trim();
  if (form.description !== undefined)
    patch.description = stripHtml(form.description)?.trim() || undefined;
  if (form.location !== undefined) patch.location = form.location.trim() || undefined;
  if (form.color !== undefined) patch.color = form.color;
  if (form.calendarId !== undefined) patch.calendarId = form.calendarId;
  if (form.reminder !== undefined) patch.reminder = form.reminder || undefined;
  if (form.isAllDay !== undefined) patch.isAllDay = form.isAllDay;

  if (
    form.startDate !== undefined ||
    form.startTime !== undefined ||
    form.isAllDay !== undefined
  ) {
    patch.startDate = buildTimestamp(
      full.startDate,
      full.startTime,
      full.isAllDay,
      'start'
    );
  }

  if (
    form.endDate !== undefined ||
    form.endTime !== undefined ||
    form.isAllDay !== undefined
  ) {
    patch.endDate = buildTimestamp(full.endDate, full.endTime, full.isAllDay, 'end');
  }

  if (form.recurrence !== undefined || form.recurrenceEndMode !== undefined) {
    if (full.recurrence === 'none') {
      patch.recurrence = undefined;
    } else {
      patch.recurrence = {
        type: full.recurrence,
        interval: 1,
      };
      if (full.recurrenceEndMode === 'date' && full.recurrenceEndDate) {
        const [y, m, d] = full.recurrenceEndDate.split('-').map(Number);
        patch.recurrence.endDate = Timestamp.fromDate(
          new Date(y, m - 1, d, 23, 59, 59, 999)
        );
      } else if (full.recurrenceEndMode === 'count' && full.recurrenceCount) {
        const start = buildTimestamp(full.startDate, full.startTime, full.isAllDay, 'start');
        patch.recurrence.endDate = Timestamp.fromDate(
          estimateRecurrenceEnd(start.toDate(), full.recurrence, full.recurrenceCount)
        );
      }
    }
  }

  return patch;
}

export function defaultFormValues(
  base?: Partial<EventFormValues>
): EventFormValues {
  const now = new Date();
  const dateStr = formatDateInput(now);
  const h = now.getHours();
  return {
    title: '',
    calendarId: '',
    isAllDay: false,
    startDate: dateStr,
    endDate: dateStr,
    startTime: `${String(h).padStart(2, '0')}:00`,
    endTime: `${String(h + 1).padStart(2, '0')}:00`,
    color: '#1a73e8',
    location: '',
    description: '',
    recurrence: 'none',
    recurrenceEndMode: 'never',
    recurrenceEndDate: undefined,
    recurrenceCount: 10,
    reminder: 0,
    ...base,
  };
}

function buildTimestamp(
  dateStr: string,
  timeStr: string,
  allDay: boolean,
  kind: 'start' | 'end'
): Timestamp {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (allDay) {
    const date = new Date(y, m - 1, d);
    if (kind === 'end') date.setHours(23, 59, 59, 999);
    else date.setHours(0, 0, 0, 0);
    return Timestamp.fromDate(date);
  }
  const [hh, mm] = timeStr.split(':').map(Number);
  return Timestamp.fromDate(new Date(y, m - 1, d, hh, mm, 0, 0));
}

export function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatTimeInput(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function mapEventDoc(id: string, data: Record<string, unknown>): CalendarEvent {
  return { id, ...data } as CalendarEvent;
}

export function googleMapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`;
}

function stripHtml(html: string): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent ?? div.innerText ?? '';
}
