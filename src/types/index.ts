import type { Timestamp } from 'firebase/firestore';

export type ViewMode = 'year' | 'month' | 'week' | 'day' | 'agenda' | 'memories';

export type RecurrenceType =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  /** Lặp theo ngày âm lịch hàng tháng (rằm, mùng 1…) */
  | 'lunarMonthly'
  /** Lặp theo ngày âm lịch hàng năm (giỗ, sinh nhật âm…) */
  | 'lunarYearly';

export function isLunarRecurrence(t?: RecurrenceType | 'none'): t is 'lunarMonthly' | 'lunarYearly' {
  return t === 'lunarMonthly' || t === 'lunarYearly';
}

export type ReminderMinutes = 0 | 5 | 15 | 30 | 60 | 1440;

/** Schema Firestore — users/{userId}/events/{eventId} */
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  isAllDay: boolean;
  color: string;
  calendarId: string;
  recurrence?: {
    type: RecurrenceType;
    endDate?: Timestamp;
    interval: number;
  };
  reminder?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Schema Firestore — users/{userId}/calendars/{calendarId} */
export interface Calendar {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
  isDefault: boolean;
}

export type CreateCalendarEventInput = Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateCalendarEventInput = Partial<
  Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>
>;

export type CreateCalendarInput = Omit<Calendar, 'id'>;

export type UpdateCalendarInput = Partial<Omit<Calendar, 'id'>>;

/** UI layer — form & rendering */
export interface EventOccurrence {
  eventId: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  location: string;
  description: string;
  calendarId: string;
  reminder: ReminderMinutes;
}

export type RecurrenceEndMode = 'never' | 'date' | 'count';

/** Giá trị form EventModal (react-hook-form + zod) */
export interface EventFormValues {
  title: string;
  calendarId: string;
  isAllDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  color: string;
  location: string;
  description: string;
  recurrence: 'none' | RecurrenceType;
  recurrenceEndMode: RecurrenceEndMode;
  recurrenceEndDate?: string;
  recurrenceCount?: number;
  reminder: ReminderMinutes;
}

/** @deprecated Dùng EventFormValues */
export type EventFormData = EventFormValues & { allDay?: boolean; repeat?: EventFormValues['recurrence'] };
