import { useEffect, useState, useRef, useMemo } from 'react';
import { toastError } from '@/store/toastStore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, MapPin, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useWeatherStore } from '@/store/weatherStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCalendarStore } from '@/store/calendarStore';
import { useEvents } from '@/hooks/useEvents';
import {
  eventToForm,
  defaultFormValues,
  googleMapsUrl,
  formatDateInput,
} from '@/lib/eventAdapters';
import { eventFormSchema } from '@/lib/eventFormSchema';
import type { EventFormValues } from '@/types';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { RichTextEditor } from './RichTextEditor';
import { LunarRecurrenceHelper } from './LunarRecurrenceHelper';
import { isLunarRecurrence } from '@/types';
import { MemoryPanel } from '@/components/Memories/MemoryPanel';
import { keepDialogOpenForLightbox } from '@/components/Memories/PhotoThumb';
import { useMemoryStore } from '@/store/memoryStore';
import { memoryIdFor } from '@/lib/memoryDb';
import { getEventDateRange } from '@/lib/eventAdapters';
import { formatVi } from '@/lib/i18n';

const COLOR_PRESETS = [
  '#1a73e8',
  '#34a853',
  '#f9ab00',
  '#ea4335',
  '#9334e6',
  '#e67c73',
  '#0b8043',
  '#3f51b5',
];

type RecurrenceScope = 'single' | 'series' | null;

export function EventModal() {
  const isOpen = useCalendarStore((s) => s.isEventModalOpen);
  const editingEventId = useCalendarStore((s) => s.editingEventId);
  const modalDefaultDate = useCalendarStore((s) => s.modalDefaultDate);
  const calendars = useCalendarStore((s) => s.calendars);
  const closeEventModal = useCalendarStore((s) => s.closeEventModal);
  const { getEventById, addEvent, editEvent, removeEvent } = useEvents();

  const isMobile = useMediaQuery('(max-width: 767px)');
  const [saving, setSaving] = useState(false);
  const [scopePrompt, setScopePrompt] = useState<RecurrenceScope>(null);
  const [pendingValues, setPendingValues] = useState<EventFormValues | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<'details' | 'memory'>('details');

  const editingEvent = editingEventId ? getEventById(editingEventId) : null;
  const hasRecurrence = !!editingEvent?.recurrence?.type;

  /** Lần diễn ra được bấm (sự kiện lặp có kỷ niệm riêng cho từng lần) */
  const occurrenceDate = editingEvent
    ? (modalDefaultDate ?? getEventDateRange(editingEvent).start)
    : null;
  const memoryTarget = useMemo(() => {
    if (!editingEvent || !occurrenceDate) return null;
    const date = formatDateInput(occurrenceDate);
    return {
      id: memoryIdFor(editingEvent.id, date),
      eventId: editingEvent.id,
      date,
      title: editingEvent.title,
      color: editingEvent.color,
    };
  }, [editingEvent, occurrenceDate?.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const memory = useMemoryStore((s) => (memoryTarget ? s.memories[memoryTarget.id] : undefined));
  const memoryCount = (memory?.photoIds.length ?? 0) + (memory?.note.trim() ? 1 : 0);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: defaultFormValues(),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const titleField = register('title');

  const isAllDay = watch('isAllDay');
  const recurrence = watch('recurrence');
  const recurrenceEndMode = watch('recurrenceEndMode');
  const location = watch('location');
  const color = watch('color');
  const startDateValue = watch('startDate');

  const weatherReport = useWeatherStore((s) => s.weatherReport);

  const eventWeatherForecast = useMemo(() => {
    if (!weatherReport?.daily || !startDateValue) return null;
    return weatherReport.daily.find((d) => d.date === startDateValue) || null;
  }, [weatherReport, startDateValue]);

  const handleAiSuggestNotes = () => {
    const currentDesc = watch('description') || '';
    const isRain =
      eventWeatherForecast?.condition?.isRain ||
      (eventWeatherForecast?.precipitationProbMax ?? 0) >= 40;
    const temp = eventWeatherForecast?.tempMax ?? 30;

    const aiNote = `\n\n📌 [AI Trợ lý Gợi ý]:\n- Thời tiết dự kiến: ${
      eventWeatherForecast
        ? `${eventWeatherForecast.condition.label}, ${temp}°C`
        : 'Thời tiết thuận lợi'
    }.\n- ${
      isRain
        ? '⚠️ Khả năng có mưa: Mang theo ô gấp / áo mưa và bảo quản thiết bị điện tử.'
        : '☀️ Thời tiết tốt, trang phục thoải mái, lịch sự.'
    }\n- Đồ cần chuẩn bị: Laptop, sạc dự phòng, giấy tờ sự kiện.`;

    setValue('description', currentDesc ? `${currentDesc}${aiNote}` : aiNote.trim());
  };

  useEffect(() => {
    if (!isOpen) return;
    setTab('details');
    setScopePrompt(null);
    setPendingValues(null);

    if (editingEvent) {
      reset(eventToForm(editingEvent));
    } else {
      const base = modalDefaultDate ?? new Date();
      const dateStr = formatDateInput(base);
      const h = base.getHours();
      reset(
        defaultFormValues({
          startDate: dateStr,
          endDate: dateStr,
          startTime: `${String(h).padStart(2, '0')}:00`,
          endTime: `${String(h + 1).padStart(2, '0')}:00`,
          calendarId: calendars[0]?.id ?? '',
          color: calendars[0]?.color ?? COLOR_PRESETS[0],
        })
      );
    }
  }, [isOpen, editingEventId, editingEvent, modalDefaultDate, calendars, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => titleInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [isOpen, editingEventId]);

  const persist = async (values: EventFormValues, scope: RecurrenceScope) => {
    setSaving(true);
    try {
      const payload: EventFormValues =
        scope === 'single'
          ? { ...values, recurrence: 'none', recurrenceEndMode: 'never' }
          : values;

      if (editingEventId) {
        await editEvent(editingEventId, payload);
      } else {
        await addEvent(payload);
      }
      closeEventModal();
    } catch (e) {
      console.error(e);
      toastError(
        'Lưu thất bại',
        e instanceof Error ? e.message : 'Kiểm tra Firebase và quyền đăng nhập.'
      );
    } finally {
      setSaving(false);
      setScopePrompt(null);
      setPendingValues(null);
    }
  };

  const onSubmit = (values: EventFormValues) => {
    if (editingEventId && hasRecurrence) {
      setPendingValues(values);
      setScopePrompt(null);
      return;
    }
    void persist(values, 'series');
  };

  const confirmScope = (scope: 'single' | 'series') => {
    if (pendingValues) void persist(pendingValues, scope);
  };

  const handleDelete = async () => {
    if (!editingEventId || !confirm('Xóa sự kiện này?')) return;
    setSaving(true);
    try {
      await removeEvent(editingEventId);
      closeEventModal();
    } catch (e) {
      console.error(e);
      toastError('Xóa thất bại', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const showScopeDialog = editingEventId && hasRecurrence && pendingValues && scopePrompt === null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && closeEventModal()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onPointerDownOutside={keepDialogOpenForLightbox}
          onInteractOutside={keepDialogOpenForLightbox}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            titleInputRef.current?.focus();
          }}
          className={cn(
            'clay fixed z-50 flex flex-col border-0 duration-300',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            isMobile
              ? 'inset-x-0 bottom-0 top-auto max-h-[92vh] overflow-hidden rounded-t-[2rem] data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom'
              : 'left-1/2 top-1/2 w-full max-w-[540px] -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-hidden rounded-[2rem] data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95'
          )}
        >
          <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-pink-200/70 via-fuchsia-200/60 to-violet-200/70 px-5 py-4 dark:from-pink-500/20 dark:via-fuchsia-500/15 dark:to-violet-500/20">
            <DialogPrimitive.Title className="flex items-center gap-2 font-fun text-xl font-extrabold">
              <span className="gloss flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-xl shadow-[0_3px_0_rgb(0_0_0/0.08)] dark:bg-white/10">
                {editingEventId ? '✏️' : '🌟'}
              </span>
              {editingEventId ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-full bg-white/70 p-2 transition-transform hover:rotate-90 hover:bg-white dark:bg-white/10">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {isMobile && (
            <div className="mx-auto mt-1 h-1 w-10 shrink-0 rounded-full bg-muted" />
          )}

          {memoryTarget && !showScopeDialog && (
            <div className="flex shrink-0 gap-1 border-b px-5 pt-2" role="tablist">
              {(['details', 'memory'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={cn(
                    '-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
                    tab === t
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t === 'details' ? 'Chi tiết' : '📸 Kỷ niệm'}
                  {t === 'memory' && memoryCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                      {memory?.photoIds.length ?? 0} ảnh
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {showScopeDialog ? (
            <div className="flex flex-col gap-4 p-6">
              <p className="text-sm text-muted-foreground">
                Sự kiện này thuộc chuỗi lặp. Bạn muốn áp dụng thay đổi cho:
              </p>
              <Button variant="outline" className="w-full justify-start h-auto py-3" onClick={() => confirmScope('single')}>
                <div className="text-left">
                  <div className="font-semibold">Chỉ sự kiện này</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    Tách khỏi chuỗi lặp (bỏ recurrence)
                  </div>
                </div>
              </Button>
              <Button className="w-full justify-start h-auto py-3" onClick={() => confirmScope('series')}>
                <div className="text-left">
                  <div className="font-semibold">Tất cả sự kiện trong chuỗi</div>
                  <div className="text-xs text-primary-foreground/80 font-normal">
                    Cập nhật rule lặp cho toàn bộ series
                  </div>
                </div>
              </Button>
              <Button variant="ghost" onClick={() => { setPendingValues(null); }}>
                Quay lại form
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-1 flex-col overflow-hidden"
            >
              {memoryTarget && tab === 'memory' && occurrenceDate && (
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {editingEvent?.title}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {formatVi(occurrenceDate, 'EEEE, d MMMM yyyy')}
                      {hasRecurrence && ' · kỷ niệm riêng cho lần này'}
                    </p>
                  </div>
                  <MemoryPanel target={memoryTarget} />
                  <p className="text-[11px] text-muted-foreground">
                    Kỷ niệm tự lưu trên thiết bị này, không cần bấm Lưu.
                  </p>
                </div>
              )}
              <div
                className={cn(
                  'flex-1 overflow-y-auto px-5 py-4 space-y-4',
                  memoryTarget && tab === 'memory' && 'hidden'
                )}
              >
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Tiêu đề *</Label>
                  <Input
                    id="title"
                    placeholder="Tên sự kiện"
                    aria-required="true"
                    name={titleField.name}
                    onChange={titleField.onChange}
                    onBlur={titleField.onBlur}
                    ref={(el) => {
                      titleField.ref(el);
                      titleInputRef.current = el;
                    }}
                  />
                  {errors.title && (
                    <p className="text-xs text-destructive">{errors.title.message}</p>
                  )}
                </div>

                {/* Calendar */}
                <div className="space-y-2">
                  <Label>Lịch *</Label>
                  <Controller
                    name="calendarId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          const cal = calendars.find((c) => c.id === v);
                          if (cal) setValue('color', cal.color);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn lịch" />
                        </SelectTrigger>
                        <SelectContent>
                          {calendars.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              <span className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                                {c.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.calendarId && (
                    <p className="text-xs text-destructive">{errors.calendarId.message}</p>
                  )}
                </div>

                {/* All day */}
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <Label htmlFor="isAllDay" className="cursor-pointer">Cả ngày</Label>
                  <Controller
                    name="isAllDay"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="isAllDay"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Ngày bắt đầu</Label>
                    <Input type="date" {...register('startDate')} />
                  </div>
                  {!isAllDay && (
                    <div className="space-y-2">
                      <Label>Giờ bắt đầu</Label>
                      <Input type="time" {...register('startTime')} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Ngày kết thúc</Label>
                    <Input type="date" {...register('endDate')} />
                    {errors.endDate && (
                      <p className="text-xs text-destructive">{errors.endDate.message}</p>
                    )}
                  </div>
                  {!isAllDay && (
                    <div className="space-y-2">
                      <Label>Giờ kết thúc</Label>
                      <Input type="time" {...register('endTime')} />
                    </div>
                  )}
                </div>

                {/* Colors */}
                <div className="space-y-2">
                  <Label>Màu sắc</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={cn(
                          'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                          color === c ? 'border-foreground ring-2 ring-offset-2 ring-primary' : 'border-transparent'
                        )}
                        style={{ background: c }}
                        onClick={() => setValue('color', c)}
                      />
                    ))}
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setValue('color', e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded border"
                      title="Màu tùy chỉnh"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Địa điểm</Label>
                  <Input id="location" placeholder="Địa chỉ, phòng họp..." {...register('location')} />
                  {location?.trim() && (
                    <a
                      href={googleMapsUrl(location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Xem trên Google Maps
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {/* AI & Weather Event Advisor */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>AI & Dự báo Thời tiết</span>
                    </div>
                    {eventWeatherForecast && (
                      <span className="font-semibold text-primary">
                        {eventWeatherForecast.condition.emoji} {eventWeatherForecast.tempMax}°C • Mưa: {eventWeatherForecast.precipitationProbMax}%
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    {eventWeatherForecast?.precipitationProbMax && eventWeatherForecast.precipitationProbMax >= 40
                      ? '☔ Dự báo có khả năng mưa! Nên mang theo ô gấp hoặc áo mưa.'
                      : '🌤️ Thời tiết thuận lợi cho các hoạt động sự kiện.'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1 font-semibold border-primary/30 text-primary hover:bg-primary/10"
                    onClick={handleAiSuggestNotes}
                  >
                    <Sparkles className="h-3 w-3" /> Tự động điền lưu ý chuẩn bị của AI vào mô tả
                  </Button>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <RichTextEditor value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>

                {/* Recurrence */}
                <div className="space-y-2">
                  <Label>Lặp lại</Label>
                  <Controller
                    name="recurrence"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Không</SelectItem>
                          <SelectItem value="daily">Hàng ngày</SelectItem>
                          <SelectItem value="weekly">Hàng tuần</SelectItem>
                          <SelectItem value="monthly">Hàng tháng</SelectItem>
                          <SelectItem value="yearly">Hàng năm</SelectItem>
                          <SelectItem value="lunarMonthly">Hàng tháng (âm lịch)</SelectItem>
                          <SelectItem value="lunarYearly">Hàng năm (âm lịch) — giỗ, sinh nhật âm</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {isLunarRecurrence(recurrence) && (
                    <LunarRecurrenceHelper
                      type={recurrence}
                      startDate={startDateValue}
                      onPickDate={(dateStr) => {
                        setValue('startDate', dateStr, { shouldDirty: true });
                        setValue('endDate', dateStr, { shouldDirty: true });
                      }}
                    />
                  )}
                </div>

                {recurrence !== 'none' && (
                  <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
                    <Label>Kết thúc chuỗi lặp</Label>
                    <Controller
                      name="recurrenceEndMode"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">Không bao giờ</SelectItem>
                            <SelectItem value="date">Vào ngày</SelectItem>
                            <SelectItem value="count">Sau số lần</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {recurrenceEndMode === 'date' && (
                      <Input type="date" {...register('recurrenceEndDate')} />
                    )}
                    {recurrenceEndMode === 'count' && (
                      <Input
                        type="number"
                        min={1}
                        max={999}
                        placeholder="Số lần lặp"
                        {...register('recurrenceCount', { valueAsNumber: true })}
                      />
                    )}
                  </div>
                )}

                {/* Reminder */}
                <div className="space-y-2">
                  <Label>Nhắc nhở</Label>
                  <Controller
                    name="reminder"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Không</SelectItem>
                          <SelectItem value="5">5 phút trước</SelectItem>
                          <SelectItem value="15">15 phút trước</SelectItem>
                          <SelectItem value="30">30 phút trước</SelectItem>
                          <SelectItem value="60">1 giờ trước</SelectItem>
                          <SelectItem value="1440">1 ngày trước</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="flex shrink-0 gap-2 border-t px-5 py-4 bg-background">
                {editingEventId && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="mr-auto"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    Xóa
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={closeEventModal}>
                  Hủy
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </div>
            </form>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
