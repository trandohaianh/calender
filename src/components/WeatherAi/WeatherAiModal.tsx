import { useState, useMemo, useRef, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  X,
  CloudSun,
  Sparkles,
  CheckSquare,
  MessageSquare,
  MapPin,
  Umbrella,
  Sun,
  Wind,
  Droplets,
  Shirt,
  Plus,
  RotateCcw,
  Send,
  Check,
  Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWeatherStore } from '@/store/weatherStore';
import { useCalendarStore } from '@/store/calendarStore';
import { useEvents } from '@/hooks/useEvents';
import { defaultFormValues } from '@/lib/eventAdapters';
import {
  analyzeDayWeatherAndEvents,
  askAiAssistant,
  detectEventIntent,
  formatShortDateLabel,
} from '@/services/aiAdvisorService';
import { askGemini, isGeminiConfigured } from '@/services/geminiService';
import { LocationMapPicker } from '@/components/WeatherAi/LocationMapPicker';
import { toastSuccess, toastError } from '@/store/toastStore';
import { cn } from '@/lib/utils';

/** Render **đậm** trong tin nhắn AI (chat chỉ dùng mỗi cú pháp này, không cần markdown đầy đủ) */
function renderChatText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function WeatherAiModal() {
  const isOpen = useWeatherStore((s) => s.isModalOpen);
  const activeTab = useWeatherStore((s) => s.activeTab);
  const closeModal = useWeatherStore((s) => s.closeModal);
  const setActiveTab = useWeatherStore((s) => s.setActiveTab);
  const weatherReport = useWeatherStore((s) => s.weatherReport);
  const currentLocation = useWeatherStore((s) => s.currentLocation);
  const detectCurrentLocation = useWeatherStore((s) => s.detectCurrentLocation);
  const checklistItems = useWeatherStore((s) => s.checklistItems);
  const toggleChecklistItem = useWeatherStore((s) => s.toggleChecklistItem);
  const addChecklistItem = useWeatherStore((s) => s.addChecklistItem);
  const resetChecklist = useWeatherStore((s) => s.resetChecklist);
  const chatMessages = useWeatherStore((s) => s.chatMessages);
  const addChatMessage = useWeatherStore((s) => s.addChatMessage);

  const events = useCalendarStore((s) => s.events);
  const calendars = useCalendarStore((s) => s.calendars);
  const { addEvent } = useEvents();

  const [newItemText, setNewItemText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isMapPickerOpen, setMapPickerOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Analyze weather and events
  const analysis = useMemo(() => {
    return analyzeDayWeatherAndEvents(weatherReport, events, new Date());
  }, [weatherReport, events]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  if (!isOpen) return null;

  const handleGpsDetect = async () => {
    try {
      await detectCurrentLocation();
      toastSuccess('Đã cập nhật vị trí GPS!');
    } catch {
      toastError('Không thể lấy vị trí GPS từ trình duyệt.');
    }
  };

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemText.trim()) {
      addChecklistItem(newItemText);
      setNewItemText('');
      toastSuccess('Đã thêm món đồ mới!');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || chatInput;
    if (!query.trim() || isAiThinking) return;

    addChatMessage({ sender: 'user', text: query.trim() });
    setChatInput('');
    setIsAiThinking(true);

    try {
      // Small simulated delay for organic feel
      await new Promise((r) => setTimeout(r, 600));

      const intent = detectEventIntent(query);
      if (intent.kind === 'needsTime') {
        addChatMessage({
          sender: 'ai',
          text: 'Bạn muốn hẹn lúc mấy giờ? Ví dụ: "tạo lịch hẹn lúc 20h tại nhà bà ngoại".',
        });
        return;
      }
      if (intent.kind === 'parsed') {
        const { event } = intent;
        const calendarId =
          calendars.find((c) => c.isDefault)?.id || calendars[0]?.id || 'cal-personal';
        await addEvent({
          ...defaultFormValues(),
          title: event.title,
          calendarId,
          startDate: event.dateStr,
          endDate: event.dateStr,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location || '',
        });
        const dateLabel = formatShortDateLabel(event.dateStr);
        addChatMessage({
          sender: 'ai',
          text: `✅ Đã tạo lịch hẹn "${event.title}" lúc ${event.startTime} ${dateLabel}${event.location ? ` tại ${event.location}` : ''}. Bạn có thể mở sự kiện trong lịch để sửa chi tiết nếu cần.`,
          suggestions: ['Chiều nay có mưa không?', 'Checklist đồ cần mang?'],
        });
        return;
      }

      if (isGeminiConfigured()) {
        try {
          const text = await askGemini(query, weatherReport, events);
          addChatMessage({ sender: 'ai', text });
          return;
        } catch (err) {
          console.warn('[Gemini] Lỗi, rơi về trả lời rule-based:', err);
        }
      }

      const res = await askAiAssistant(query, weatherReport, events);
      addChatMessage({
        sender: 'ai',
        text: res.text,
        suggestions: res.suggestions,
      });
    } catch (e) {
      addChatMessage({
        sender: 'ai',
        text: 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi này. Bạn hãy thử lại nhé!',
      });
    } finally {
      setIsAiThinking(false);
    }
  };

  const checkedCount = checklistItems.filter((i) => i.checked).length;
  const totalCount = checklistItems.length;
  const checklistProgress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex h-[90vh] max-h-[780px] w-full max-w-[800px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-card/95 shadow-2xl backdrop-blur-xl duration-200 animate-in fade-in-0 zoom-in-95'
          )}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b px-5 py-3.5 bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-sm">
                <CloudSun className="h-5 w-5" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-base font-bold flex items-center gap-1.5">
                  Thời tiết & Trợ lý Ra ngoài
                  <span className="flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-extrabold text-primary">
                    <Sparkles className="h-2.5 w-2.5 text-amber-400" /> AI LIVE
                  </span>
                </DialogPrimitive.Title>
                <p className="text-xs text-muted-foreground">
                  Dự báo khí tượng & Trợ lý thông minh chuẩn bị đồ đạc theo lịch trình
                </p>
              </div>
            </div>

            {/* City selector & Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                onClick={() => setMapPickerOpen(true)}
                title="Chọn vị trí trên bản đồ"
              >
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {currentLocation.name}
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleGpsDetect}
                title="Định vị GPS tự động"
              >
                <Navigation className="h-3.5 w-3.5" />
              </Button>

              <DialogPrimitive.Close className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>
          </div>

          <LocationMapPicker open={isMapPickerOpen} onClose={() => setMapPickerOpen(false)} />

          {/* Navigation Tabs */}
          <div className="flex shrink-0 border-b bg-muted/20 px-4 pt-2">
            {[
              { id: 'overview', label: 'Dự báo Thời tiết', icon: CloudSun },
              { id: 'outfit', label: 'AI Ra ngoài & Trang phục', icon: Shirt, badge: analysis.alerts.length > 0 },
              { id: 'checklist', label: `Checklist Đồ (${checkedCount}/${totalCount})`, icon: CheckSquare },
              { id: 'chat', label: 'Hỏi AI Trợ lý', icon: MessageSquare },
            ].map((tabItem) => {
              const Icon = tabItem.icon;
              const isActive = activeTab === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  type="button"
                  onClick={() => setActiveTab(tabItem.id as any)}
                  className={cn(
                    'relative flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tabItem.label}</span>
                  {tabItem.badge && (
                    <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && !weatherReport && (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <div className="flex h-10 w-10 animate-spin items-center justify-center rounded-full border-2 border-primary/30 border-t-primary" />
                <p className="text-xs font-medium">Đang tải dữ liệu thời tiết...</p>
              </div>
            )}
            {activeTab === 'overview' && weatherReport && (
              <div className="space-y-5">
                {/* Hero Weather Card */}
                <div
                  className={cn(
                    'relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-lg transition-all',
                    weatherReport.condition.gradient
                  )}
                >
                  <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-white/80" />
                        <span className="text-sm font-semibold text-white/90">
                          {currentLocation.name}, {currentLocation.country}
                        </span>
                      </div>
                      <div className="my-2 flex items-baseline gap-3">
                        <span className="text-5xl font-extrabold tracking-tight">
                          {weatherReport.temperature}°C
                        </span>
                        <span className="text-4xl">{weatherReport.condition.emoji}</span>
                      </div>
                      <p className="text-base font-medium text-white/95">
                        {weatherReport.condition.label}
                      </p>
                      <p className="text-xs text-white/80">
                        Cảm giác như {weatherReport.feelsLike}°C • {analysis.highlightSummary}
                      </p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-black/20 p-3.5 backdrop-blur-md">
                      <div className="flex items-center gap-2 text-xs">
                        <Droplets className="h-4 w-4 text-sky-300" />
                        <div>
                          <p className="text-[10px] text-white/70">Độ ẩm</p>
                          <p className="font-bold">{weatherReport.humidity}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Umbrella className="h-4 w-4 text-indigo-300" />
                        <div>
                          <p className="text-[10px] text-white/70">Xác suất mưa</p>
                          <p className="font-bold">{weatherReport.precipitationProb}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Sun className="h-4 w-4 text-yellow-300" />
                        <div>
                          <p className="text-[10px] text-white/70">Chỉ số UV</p>
                          <p className="font-bold">{weatherReport.uvIndex}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Wind className="h-4 w-4 text-teal-300" />
                        <div>
                          <p className="text-[10px] text-white/70">Gió</p>
                          <p className="font-bold">{weatherReport.windSpeed} km/h</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Glassmorphic decorative circles */}
                  <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                </div>

                {/* 24-Hour Forecast Scroll */}
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Dự báo 24 giờ tới
                  </h4>
                  <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                    {weatherReport.hourly.map((h, idx) => {
                      const isNow = idx === 0;
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'flex shrink-0 flex-col items-center justify-between rounded-xl border p-2.5 text-center transition-all min-w-[70px]',
                            isNow
                              ? 'border-primary bg-primary/10 font-bold'
                              : 'bg-card hover:border-primary/50'
                          )}
                        >
                          <span className="text-[11px] text-muted-foreground">
                            {isNow ? 'Hiện tại' : h.time}
                          </span>
                          <span className="my-1.5 text-lg">
                            {h.precipitationProb > 40 ? '🌧️' : h.temp > 30 ? '☀️' : '🌤️'}
                          </span>
                          <span className="text-xs font-bold">{h.temp}°</span>
                          {h.precipitationProb > 20 && (
                            <span className="mt-1 text-[10px] font-semibold text-blue-500">
                              💧{h.precipitationProb}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 7-Day Forecast */}
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Dự báo 7 ngày tới
                  </h4>
                  <div className="space-y-1.5">
                    {weatherReport.daily.map((d, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border bg-card/60 p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3 w-28">
                          <span className="text-lg">{d.condition.emoji}</span>
                          <span className="text-xs font-semibold">{d.dayName}</span>
                        </div>
                        <span className="hidden flex-1 truncate text-xs text-muted-foreground md:inline">
                          {d.condition.label}
                        </span>
                        <div className="flex items-center gap-3 text-xs">
                          {d.precipitationProbMax > 20 && (
                            <span className="font-semibold text-blue-500">
                              💧 {d.precipitationProbMax}%
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-foreground">{d.tempMax}°</span>
                            <span className="text-muted-foreground text-[11px]">/ {d.tempMin}°</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: AI OUTING & OUTFIT */}
            {activeTab === 'outfit' && (
              <div className="space-y-5">
                {/* AI Alerts List */}
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Cảnh báo & Nhắc nhở từ Trợ lý AI
                  </h4>
                  <div className="space-y-2.5">
                    {analysis.alerts.map((alt) => (
                      <div
                        key={alt.id}
                        className={cn(
                          'flex items-start gap-3.5 rounded-xl border p-4 shadow-xs transition-all',
                          alt.level === 'urgent' && 'border-red-500/40 bg-red-500/10 text-red-950 dark:text-red-200',
                          alt.level === 'warning' && 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200',
                          alt.level === 'info' && 'border-blue-500/40 bg-blue-500/10 text-blue-950 dark:text-blue-200',
                          alt.level === 'good' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200'
                        )}
                      >
                        <span className="text-2xl shrink-0">{alt.iconEmoji}</span>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-sm font-bold">{alt.title}</h5>
                          <p className="mt-0.5 text-xs opacity-90">{alt.description}</p>
                          {alt.actionTip && (
                            <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-[11px] font-semibold shadow-xs">
                              💡 Lời khuyên: {alt.actionTip}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Outfit Guide */}
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Gợi ý Phối đồ theo Thời tiết & Lịch trình
                  </h4>
                  <div className="rounded-2xl border bg-gradient-to-br from-card to-muted/40 p-4 shadow-xs">
                    <p className="mb-3 text-xs font-semibold text-primary">
                      ✨ {analysis.outfit.summary}
                    </p>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                      <div className="rounded-xl border bg-card p-3">
                        <span className="text-[11px] font-bold text-muted-foreground">👕 Áo (Top)</span>
                        <p className="mt-1 text-xs font-semibold">{analysis.outfit.top}</p>
                      </div>
                      <div className="rounded-xl border bg-card p-3">
                        <span className="text-[11px] font-bold text-muted-foreground">👖 Quần / Váy (Bottom)</span>
                        <p className="mt-1 text-xs font-semibold">{analysis.outfit.bottom}</p>
                      </div>
                      {analysis.outfit.outerwear && (
                        <div className="rounded-xl border bg-card p-3">
                          <span className="text-[11px] font-bold text-muted-foreground">🧥 Áo khoác ngoài</span>
                          <p className="mt-1 text-xs font-semibold">{analysis.outfit.outerwear}</p>
                        </div>
                      )}
                      <div className="rounded-xl border bg-card p-3">
                        <span className="text-[11px] font-bold text-muted-foreground">👟 Giày dép (Footwear)</span>
                        <p className="mt-1 text-xs font-semibold">{analysis.outfit.footwear}</p>
                      </div>
                      <div className="rounded-xl border bg-card p-3 sm:col-span-2">
                        <span className="text-[11px] font-bold text-muted-foreground">🕶️ Phụ kiện cần thiết</span>
                        <p className="mt-1 text-xs font-semibold">
                          {analysis.outfit.accessories.join(' • ')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-bold">Bảng màu gợi ý:</span>
                      <span>{analysis.outfit.colorVibe}</span>
                    </div>
                  </div>
                </div>

                {/* Commute Tip */}
                <div className="rounded-xl border bg-muted/40 p-3.5 text-xs">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <Navigation className="h-4 w-4 text-primary" />
                    <span>Lưu ý Di chuyển & Giao thông:</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{analysis.commuteTip}</p>
                </div>
              </div>
            )}

            {/* TAB 3: SMART CHECKLIST */}
            {activeTab === 'checklist' && (
              <div className="space-y-4">
                {/* Progress bar */}
                <div className="rounded-xl border bg-card p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold">Tiến độ chuẩn bị ra ngoài</span>
                    <span className="font-bold text-primary">
                      {checkedCount}/{totalCount} ({checklistProgress}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-300"
                      style={{ width: `${checklistProgress}%` }}
                    />
                  </div>
                  {checkedCount === totalCount && totalCount > 0 && (
                    <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      🎉 Tuyệt vời! Bạn đã chuẩn bị đầy đủ mọi thứ để tự tin ra ngoài!
                    </p>
                  )}
                </div>

                {/* Add Item Form */}
                <form onSubmit={handleAddChecklist} className="flex gap-2">
                  <Input
                    placeholder="Thêm món đồ cần mang..."
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    className="text-xs"
                  />
                  <Button type="submit" size="sm" className="shrink-0 gap-1 font-semibold">
                    <Plus className="h-4 w-4" /> Thêm
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetChecklist}
                    title="Đặt lại danh sách mặc định"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </form>

                {/* Checklist items */}
                <div className="space-y-2">
                  {checklistItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleChecklistItem(item.id)}
                      className={cn(
                        'flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all hover:bg-muted/60',
                        item.checked
                          ? 'border-emerald-500/30 bg-emerald-500/5 text-muted-foreground'
                          : 'bg-card'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-md border transition-all',
                            item.checked
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-muted-foreground/50'
                          )}
                        >
                          {item.checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                        <span className={cn('text-xs font-medium', item.checked && 'line-through')}>
                          {item.label}
                        </span>
                      </div>

                      {item.isEssential && (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          Quan trọng
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: CHAT WITH AI */}
            {activeTab === 'chat' && (
              <div className="flex h-[480px] flex-col">
                {/* Messages container */}
                <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-2.5 text-xs',
                        msg.sender === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {msg.sender === 'ai' && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-xs">
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                      )}

                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl p-3 shadow-xs',
                          msg.sender === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'border bg-card text-foreground whitespace-pre-wrap'
                        )}
                      >
                        <p>{renderChatText(msg.text)}</p>
                        <span className="mt-1 block text-[10px] opacity-70 text-right">
                          {msg.time}
                        </span>

                        {/* Suggested prompts buttons */}
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
                            {msg.suggestions.map((sug, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleSendMessage(sug)}
                                className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary transition-all hover:bg-primary/10 hover:scale-105"
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isAiThinking && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary animate-spin">
                        ✨
                      </div>
                      <span>AI đang suy nghĩ lời khuyên phù hợp nhất...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSendMessage();
                  }}
                  className="mt-3 flex gap-2 border-t pt-3"
                >
                  <Input
                    placeholder="Hỏi AI (vd: Chiều nay có mưa không? Nên mặc gì đi gặp khách?)..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isAiThinking}
                    className="text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isAiThinking || !chatInput.trim()}
                    className="gap-1 font-semibold"
                  >
                    <Send className="h-3.5 w-3.5" /> Gửi
                  </Button>
                </form>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
