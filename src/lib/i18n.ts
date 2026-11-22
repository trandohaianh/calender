import { format, type FormatOptions } from 'date-fns';
import { vi } from 'date-fns/locale';

/** Locale tiếng Việt — tuần bắt đầu Thứ 2 (WEEK_STARTS_ON = 1 trong constants) */
export const dateLocale = vi;

export const WEEKDAY_LABELS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

export function formatVi(
  date: Date,
  pattern: string,
  options?: Omit<FormatOptions, 'locale'>
): string {
  return format(date, pattern, { locale: dateLocale, ...options });
}
