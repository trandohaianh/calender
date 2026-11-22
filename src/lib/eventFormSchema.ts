import { z } from 'zod';

function parseDateTime(
  dateStr: string,
  timeStr: string,
  isAllDay: boolean,
  kind: 'start' | 'end'
): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (isAllDay) {
    const date = new Date(y, m - 1, d);
    if (kind === 'end') date.setHours(23, 59, 59, 999);
    else date.setHours(0, 0, 0, 0);
    return date;
  }
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export const eventFormSchema = z
  .object({
    title: z.string().min(1, 'Tiêu đề bắt buộc').max(200, 'Tối đa 200 ký tự'),
    calendarId: z.string().min(1, 'Chọn lịch'),
    isAllDay: z.boolean(),
    startDate: z.string().min(1),
    startTime: z.string(),
    endDate: z.string().min(1),
    endTime: z.string(),
    color: z.string().min(1),
    location: z.string().max(500).optional().default(''),
    description: z.string().max(5000).optional().default(''),
    recurrence: z.enum([
      'none',
      'daily',
      'weekly',
      'monthly',
      'yearly',
      'lunarMonthly',
      'lunarYearly',
    ]),
    recurrenceEndMode: z.enum(['never', 'date', 'count']),
    recurrenceEndDate: z.string().optional(),
    recurrenceCount: z.coerce.number().min(1).max(999).optional(),
    reminder: z.coerce.number(),
  })
  .superRefine((data, ctx) => {
    const start = parseDateTime(data.startDate, data.startTime, data.isAllDay, 'start');
    const end = parseDateTime(data.endDate, data.endTime, data.isAllDay, 'end');
    if (end < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
        path: ['endDate'],
      });
    }
    if (data.recurrence !== 'none') {
      if (data.recurrenceEndMode === 'date' && !data.recurrenceEndDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Chọn ngày kết thúc chuỗi lặp',
          path: ['recurrenceEndDate'],
        });
      }
      if (data.recurrenceEndMode === 'count' && !data.recurrenceCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nhập số lần lặp (1–999)',
          path: ['recurrenceCount'],
        });
      }
    }
  });

export type EventFormSchema = z.infer<typeof eventFormSchema>;
