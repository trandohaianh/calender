import type { CurrentWeatherReport } from './weatherService';
import type { CalendarEvent } from '@/types';
import type { ChecklistItem } from '@/store/weatherStore';
import { toDateKey } from '@/lib/utils';

export interface AiWeatherAlert {
  id: string;
  type: 'rain' | 'uv' | 'heat' | 'cold' | 'event' | 'good';
  level: 'urgent' | 'warning' | 'info' | 'good';
  title: string;
  description: string;
  iconEmoji: string;
  actionTip?: string;
}

export interface AiOutfitAdvice {
  summary: string;
  top: string;
  bottom: string;
  outerwear?: string;
  footwear: string;
  accessories: string[];
  colorVibe: string;
}

export interface DayAnalysisResult {
  alerts: AiWeatherAlert[];
  outfit: AiOutfitAdvice;
  smartItems: ChecklistItem[];
  commuteTip: string;
  highlightSummary: string;
}

export function analyzeDayWeatherAndEvents(
  weather: CurrentWeatherReport | null,
  events: CalendarEvent[],
  targetDate: Date = new Date()
): DayAnalysisResult {
  const alerts: AiWeatherAlert[] = [];
  const smartItems: ChecklistItem[] = [
    { id: 'item-keys', label: 'Chìa khóa & Giấy tờ tùy thân', category: 'essential', checked: true, isEssential: true },
    { id: 'item-phone', label: 'Điện thoại & Ví tiền', category: 'essential', checked: true, isEssential: true },
  ];

  if (!weather) {
    return {
      alerts: [
        {
          id: 'alt-default',
          type: 'good',
          level: 'good',
          title: 'Thời tiết thuận lợi',
          description: 'Hôm nay trời đẹp để làm việc và ra ngoài.',
          iconEmoji: '🌤️',
        },
      ],
      outfit: {
        summary: 'Trang phục công sở năng động hoặc thường ngày thoải mái.',
        top: 'Áo sơ mi hoặc áo thun cotton',
        bottom: 'Quần tây hoặc jeans',
        footwear: 'Giày sneaker hoặc giày da',
        accessories: ['Đồng hồ', 'Bình nước'],
        colorVibe: 'Tông màu thanh lịch (Xanh navy, Trắng, Be)',
      },
      smartItems,
      commuteTip: 'Giao thông bình thường, xuất phát đúng giờ.',
      highlightSummary: 'Ngày làm việc tràn đầy năng lượng!',
    };
  }

  const temp = weather.temperature;
  const rainProb = weather.precipitationProb;
  const isRain = weather.condition.isRain || rainProb >= 40;
  const uv = weather.uvIndex;

  // 1. Weather Alerts
  if (weather.condition.isStorm) {
    alerts.push({
      id: 'alt-storm',
      type: 'rain',
      level: 'urgent',
      title: 'Cảnh báo Dông Sét & Mưa Lớn',
      description: 'Dự báo có dông bão giật mạnh. Hạn chế di chuyển xa và bảo quản thiết bị công nghệ kỹ lưỡng.',
      iconEmoji: '⛈️',
      actionTip: 'Nên ở trong nhà hoặc chuẩn bị áo mưa chuyên dụng',
    });
    smartItems.push({
      id: 'item-raincoat',
      label: 'Áo mưa cánh dơi & Bọc chống nước điện thoại',
      category: 'weather',
      checked: false,
      isEssential: true,
    });
  } else if (isRain) {
    alerts.push({
      id: 'alt-rain',
      type: 'rain',
      level: 'warning',
      title: `Khả năng mưa ${rainProb}% - Nhớ mang ô / áo mưa`,
      description: 'Trời có thể xuất hiện mưa rào rải rác trong ngày. Hãy luôn để sẵn một chiếc ô gấp trong balo.',
      iconEmoji: '☔',
      actionTip: 'Mang theo ô gấp hoặc áo mưa bỏ cốp xe',
    });
    smartItems.push({
      id: 'item-umbrella',
      label: 'Ô gấp gọn chống gió',
      category: 'weather',
      checked: false,
      isEssential: true,
    });
  }

  if (uv >= 6.5) {
    alerts.push({
      id: 'alt-uv',
      type: 'uv',
      level: uv >= 8.5 ? 'urgent' : 'warning',
      title: `Chỉ số UV cao (${uv}) - Cần chống nắng`,
      description: 'Tia cực tím mạnh gây hại cho da từ 10h00 đến 15h30. Hãy thoa kem chống nắng và đeo kính râm.',
      iconEmoji: '🧴',
      actionTip: 'Thoa kem chống nắng SPF 50+ & Kính râm',
    });
    smartItems.push({
      id: 'item-sunscreen',
      label: 'Kem chống nắng & Kính râm chống tia UV',
      category: 'weather',
      checked: false,
    });
  }

  if (temp >= 33) {
    alerts.push({
      id: 'alt-heat',
      type: 'heat',
      level: 'warning',
      title: `Nắng nóng oi bức (${temp}°C)`,
      description: 'Nhiệt độ ngoài trời rất cao. Bổ sung nước thường xuyên và tránh phơi nắng lâu.',
      iconEmoji: '☀️',
      actionTip: 'Uống nhiều nước & chọn trang phục cotton mát mẻ',
    });
    smartItems.push({
      id: 'item-water',
      label: 'Bình nước mát cá nhân (ít nhất 1L)',
      category: 'personal',
      checked: false,
    });
  } else if (temp <= 18) {
    alerts.push({
      id: 'alt-cold',
      type: 'cold',
      level: 'info',
      title: `Thời tiết se lạnh (${temp}°C)`,
      description: 'Gió mùa hoặc nhiệt độ xuống thấp vào sáng sớm và tối muộn. Giữ ấm cổ và ngực.',
      iconEmoji: '🧥',
      actionTip: 'Mặc áo khoác ấm & Khăn choàng nhẹ',
    });
    smartItems.push({
      id: 'item-jacket',
      label: 'Áo khoác giữ nhiệt / Áo gió',
      category: 'weather',
      checked: false,
      isEssential: true,
    });
  }

  // 2. Event Correlations
  const todayStr = toDateKey(targetDate);
  const dayEvents = events.filter((e) => {
    try {
      const d = e.startDate.toDate();
      return toDateKey(d) === todayStr;
    } catch {
      return false;
    }
  });

  const hasMeeting = dayEvents.some((e) => /họp|gặp|đối tác|khách hàng|phỏng vấn|báo cáo/i.test(e.title));
  const hasOutdoor = dayEvents.some((e) => /dã ngoại|chạy|thể thao|gym|cắm trại|ngoài trời|sinh nhật|ăn tối/i.test(e.title));

  if (hasMeeting) {
    alerts.push({
      id: 'alt-meeting',
      type: 'event',
      level: 'info',
      title: 'Lịch trình có cuộc họp quan trọng',
      description: 'Đảm bảo chuẩn bị đủ laptop, tài liệu và sạc dự phòng trước khi xuất phát.',
      iconEmoji: '💼',
    });
    smartItems.push(
      { id: 'item-laptop', label: 'Laptop & Củ sạc công việc', category: 'event', checked: false, isEssential: true },
      { id: 'item-powerbank', label: 'Sạc dự phòng', category: 'essential', checked: false }
    );
  }

  if (hasOutdoor && isRain) {
    alerts.push({
      id: 'alt-outdoor-rain',
      type: 'event',
      level: 'urgent',
      title: 'Sự kiện ngoài trời có nguy cơ dính mưa!',
      description: 'Sự kiện vận động/ngoài trời hôm nay có khả năng gặp mưa. Nên mang khăn lau, túi bọc đồ và dự phòng phương án trong nhà.',
      iconEmoji: '⚠️',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'alt-perfect',
      type: 'good',
      level: 'good',
      title: 'Thời tiết lý tưởng hôm nay!',
      description: 'Trời mát mẻ, không mưa, rất thích hợp cho mọi hoạt động ngoài trời và công việc.',
      iconEmoji: '🎉',
    });
  }

  // 3. Outfit recommendation
  let outfit: AiOutfitAdvice;
  if (temp < 18) {
    outfit = {
      summary: 'Trang phục nhiều lớp ấm áp, phong cách thanh lịch chống gió.',
      top: 'Áo len dệt kim mỏng hoặc áo thun dài tay cổ lọ',
      bottom: 'Quần âu dạ hoặc quần jeans dày',
      outerwear: 'Áo trench coat, blazer dạ hoặc áo phao lông vũ',
      footwear: 'Boots cổ ngắn hoặc giày da kín mũi',
      accessories: ['Khăn choàng cổ mỏng', 'Tất ấm'],
      colorVibe: 'Tông trầm ấm (Nâu camel, Be, Xám ghi, Đen)',
    };
  } else if (temp >= 18 && temp <= 25) {
    outfit = {
      summary: hasMeeting
        ? 'Phong cách Smart-Casual lịch thiệp, dễ chịu suốt ngày dài.'
        : 'Trang phục trẻ trung, thoáng nhẹ kết hợp áo khoác mỏng.',
      top: hasMeeting ? 'Áo sơ mi oxford hoặc polo cao cấp' : 'Áo thun cotton thoáng khí',
      bottom: hasMeeting ? 'Quần tây phom đứng / Chân váy bút chì' : 'Quần kaki hoặc jeans mềm',
      outerwear: 'Cardigan mỏng hoặc áo blazer nhẹ',
      footwear: 'Giày lười da (Loafer) hoặc sneaker tối giản',
      accessories: ['Đồng hồ đeo tay', 'Túi xách da chống nước'],
      colorVibe: 'Tông màu pastel hoặc trung tính hiện đại (Trắng, Xanh olive, Xám)',
    };
  } else {
    outfit = {
      summary: 'Trang phục mát mẻ tối đa, chất liệu thấm hút mồ hôi tốt.',
      top: 'Áo thun cotton / Áo sơ mi linen đũi thoáng mát',
      bottom: 'Quần short vải đũi hoặc quần culottes mỏng',
      outerwear: isRain ? 'Áo khoác dù chống nước mỏng' : 'Áo chống nắng nhẹ',
      footwear: 'Sneaker vải êm chân hoặc sandal quai hậu',
      accessories: ['Kính râm phân cực', 'Mũ lưỡi trai / nón rộng vành', 'Bình nước giữ nhiệt'],
      colorVibe: 'Tông sáng mát mắt (Trắng sữa, Xanh ngọc, Xanh biển nhạt)',
    };
  }

  // 4. Commute tip
  let commuteTip = 'Thời tiết ổn định, bạn có thể di chuyển bằng phương tiện cá nhân bình thường.';
  if (isRain) {
    commuteTip = 'Đường có thể trơn trượt và ùn ứ vào giờ cao điểm (17h - 18h30). Nên xuất phát sớm hơn 15 phút.';
  } else if (temp >= 34) {
    commuteTip = 'Trưa nắng gắt, ưu tiên đi xe ô tô/taxi hoặc mặc áo giáp chống nắng kín khi đi xe máy.';
  }

  // 5. Highlight
  const highlightSummary = isRain
    ? `Dự báo có mưa (${rainProb}%) • Nhiệt độ ${temp}°C • Nhớ mang ô`
    : `Thời tiết ${weather.condition.label.toLowerCase()} • ${temp}°C • Thích hợp ra ngoài`;

  return {
    alerts,
    outfit,
    smartItems,
    commuteTip,
    highlightSummary,
  };
}

// ─── Tạo lịch hẹn bằng ngôn ngữ tự nhiên trong khung chat ────────────────

export interface ParsedEventIntent {
  title: string;
  dateStr: string; // YYYY-MM-DD (local)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location?: string;
}

export type EventIntentResult =
  | { kind: 'none' }
  | { kind: 'needsTime' }
  | { kind: 'parsed'; event: ParsedEventIntent };

// "đặt" bắt đầu bằng "đ" có dấu nên không dùng \b phía trước (xem giải
// thích trong parseEventLocation) — thay bằng (?:^|\s).
const CREATE_VERBS_RE = /(?:^|\s)(tạo|thêm|đặt|lên lịch|book)\b/i;
const EVENT_NOUNS_RE = /(lịch hẹn|cuộc hẹn|sự kiện|cuộc họp|nhắc nhở|\blịch\b|\bhẹn\b)/i;

function looksLikeCreateEventRequest(text: string): boolean {
  return CREATE_VERBS_RE.test(text) && EVENT_NOUNS_RE.test(text);
}

const PERIOD_RE = /(sáng|trưa|chiều|tối|khuya)/i;

/**
 * Đọc giờ trong câu: "15:30", "3h chiều", "3 giờ rưỡi chiều" và cả khi buổi
 * đứng TRƯỚC giờ như "chiều mai 3h", "tối nay lúc 8 giờ".
 *
 * Lỗi cũ: chỉ bắt buổi đứng ngay SAU giờ, nên "chiều mai 3h" bị hiểu là
 * 03:00 sáng.
 */
function parseTimeOfDay(text: string): { hour: number; minute: number } | null {
  const m = text.match(/(\d{1,2})\s*(?:[:h]|giờ)\s*(\d{1,2}|rưỡi)?(?:\s*(?:phút|p))?\s*(sáng|trưa|chiều|tối|khuya)?/i);
  if (!m || m.index === undefined) return null;
  let hour = parseInt(m[1], 10);
  const minute = !m[2] ? 0 : m[2].toLowerCase() === 'rưỡi' ? 30 : parseInt(m[2], 10);
  if (Number.isNaN(hour) || hour > 23 || minute > 59) return null;

  // Buổi đứng sau giờ ("3h chiều") được ưu tiên; nếu không có thì lấy buổi
  // gần nhất đứng trước giờ ("chiều mai 3h").
  let period: string | undefined = m[3]?.toLowerCase();
  if (!period) {
    const before = text.slice(0, m.index).toLowerCase();
    const all = before.match(new RegExp(PERIOD_RE.source, 'gi'));
    period = all ? all[all.length - 1] : undefined;
  }

  if (period === 'sáng') {
    if (hour === 12) hour = 0;
  } else if (period === 'khuya') {
    // "1h khuya" là 01:00, "11h khuya" là 23:00
    if (hour >= 6 && hour < 12) hour += 12;
  } else if (period === 'trưa') {
    // "trưa 12h" là 12:00, "trưa 1h" là 13:00, "11h trưa" vẫn là 11:00
    if (hour < 6) hour += 12;
  } else if (period && hour < 12) {
    hour += 12; // chiều, tối
  }
  return { hour, minute };
}

function parseEventDateStr(text: string, now: Date): string {
  const lower = text.toLowerCase();

  const explicit = text.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (explicit) {
    const day = parseInt(explicit[1], 10);
    const month = parseInt(explicit[2], 10);
    let year = explicit[3] ? parseInt(explicit[3], 10) : now.getFullYear();
    if (year < 100) year += 2000;
    return toDateKey(new Date(year, month - 1, day));
  }

  if (/\bngày kia\b|\bmốt\b/.test(lower)) {
    return toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2));
  }
  if (/\bngày mai\b|\bmai\b/.test(lower)) {
    return toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  }

  const weekdayMatch = lower.match(/\bthứ\s*([2-7])\b|\bchủ nhật\b/);
  if (weekdayMatch) {
    const targetDow = /chủ nhật/.test(weekdayMatch[0]) ? 0 : parseInt(weekdayMatch[1], 10) - 1;
    let diff = targetDow - now.getDay();
    if (diff < 0) diff += 7;
    return toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff));
  }

  return toDateKey(now); // mặc định: hôm nay
}

function parseEventLocation(text: string): string | undefined {
  // Không dùng \b ngay trước/sau "ở"/"nhé" — đây là ký tự có dấu tiếng
  // Việt, \b của JS chỉ nhận biết [A-Za-z0-9_] nên "coi" ký tự có dấu là
  // "không phải chữ", khiến \b không tìm được biên và cả cụm không khớp.
  // Dùng (?:^|\s) / lookahead khoảng trắng-hoặc-hết-chuỗi thay thế.
  const m = text.match(/(?:^|\s)(?:tại|ở)\s+(.+?)(?:\s+(?:lúc|vào|ngày|nhé|nha)(?=\s|$|[.,!?])|[.,!?]|$)/i);
  const loc = m?.[1]?.trim();
  return loc && loc.length > 0 ? loc : undefined;
}

function parseEventTitle(text: string, location: string | undefined): string {
  const quoted = text.match(/["“]([^"”]{2,80})["”]/);
  if (quoted) return quoted[1].trim();
  if (location) return `Hẹn tại ${location}`;
  return 'Lịch hẹn mới';
}

/** "hôm nay" / "ngày mai" / "20/08" — nhãn ngắn cho tin nhắn xác nhận */
export function formatShortDateLabel(dateStr: string, now: Date = new Date()): string {
  const today = toDateKey(now);
  const tomorrow = toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  if (dateStr === today) return 'hôm nay';
  if (dateStr === tomorrow) return 'ngày mai';
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

/**
 * Nhận diện yêu cầu "tạo lịch hẹn" trong câu chat tự do (vd: "tạo cho t 1
 * lịch hẹn lúc 20h tại nhà bà ngoại") và tách ra tiêu đề/ngày/giờ/địa điểm.
 * Chỉ là nhận diện theo mẫu câu (không phải LLM thật) nên chỉ bắt được các
 * cách diễn đạt phổ biến — không hiểu được câu quá phức tạp.
 */
export function detectEventIntent(rawText: string, now: Date = new Date()): EventIntentResult {
  if (!looksLikeCreateEventRequest(rawText)) return { kind: 'none' };

  const time = parseTimeOfDay(rawText);
  if (!time) return { kind: 'needsTime' };

  const dateStr = parseEventDateStr(rawText, now);
  const location = parseEventLocation(rawText);
  const title = parseEventTitle(rawText, location);
  const startTime = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
  const endTime = `${String((time.hour + 1) % 24).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;

  return { kind: 'parsed', event: { title, dateStr, startTime, endTime, location } };
}

export async function askAiAssistant(
  prompt: string,
  weather: CurrentWeatherReport | null,
  events: CalendarEvent[]
): Promise<{ text: string; suggestions?: string[] }> {
  // So khớp theo mẫu câu (không phải LLM thật) — thứ tự ưu tiên đi từ ý
  // định cụ thể/kết hợp nhiều từ khóa xuống ý định chung chung, để câu như
  // "thời tiết cuối tuần" không bị nuốt bởi nhánh "thời tiết hôm nay" ở dưới.
  const lower = prompt.toLowerCase();
  const temp = weather?.temperature ?? 28;
  const isRain = weather ? (weather.condition.isRain || weather.precipitationProb >= 40) : false;
  const rainProb = weather?.precipitationProb ?? 30;

  const asksOutfit = /mặc|quần áo|trang phục|phối đồ/.test(lower);
  const asksWaterproof = /chống nước|chống mưa|không thấm nước/.test(lower);
  const asksWeekend = /cuối tuần|thứ\s*7|chủ nhật/.test(lower);
  const asksOuting = /dã ngoại|đi chơi|cắm trại/.test(lower);

  // 1) Trang phục — luôn xét yếu tố mưa/chống nước trước khi xét nhiệt độ
  if (asksOutfit) {
    if (asksWaterproof || isRain) {
      return {
        text: `☔ **Trang phục chống nước hôm nay (${temp}°C, khả năng mưa ${rainProb}%):**\n\n- **Áo khoác:** Áo khoác dù/gió lớp chống thấm, hoặc mang theo áo mưa cánh dơi gọn nhẹ.\n- **Giày dép:** Ưu tiên sandal/giày chống nước hoặc bọc giày; tránh giày da, vải dễ thấm.\n- **Chất liệu:** Ưu tiên polyester/nylon nhanh khô, hạn chế cotton dày dễ ngấm nước và lâu khô.\n- **Phụ kiện:** Túi/bọc chống nước cho điện thoại, laptop; luôn mang ô gấp gọn.`,
        suggestions: ['Checklist đồ cần mang?', 'Chiều nay có mưa không?'],
      };
    }
    if (temp >= 30) {
      return {
        text: `🔥 **Gợi ý trang phục hôm nay (${temp}°C, trời khá nóng):**\n\n- **Áo:** Bạn nên chọn áo sơ mi đũi (linen) hoặc áo thun cotton 100% thoáng khí, màu sáng để hạn chế hấp thụ nhiệt.\n- **Quần:** Quần tây mỏng hoặc kaki co giãn.\n- **Phụ kiện:** Đừng quên kính râm và thoa kem chống nắng vì chỉ số UV đang ở mức ${weather?.uvIndex ?? 6.5}!`,
        suggestions: ['Chiều nay có mưa không?', 'Checklist đồ cần mang?', 'Gợi ý lịch trình hôm nay'],
      };
    } else if (temp < 20) {
      return {
        text: `❄️ **Gợi ý trang phục hôm nay (${temp}°C, trời se lạnh):**\n\n- **Phong cách nhiều lớp (Layering):** Áo thun/sơ mi bên trong + áo len dệt kim hoặc blazer dạ bên ngoài.\n- **Quần:** Quần âu dạ hoặc jeans ống suông.\n- **Giày:** Giày da boots hoặc sneaker kín mũi.\n- **Phụ kiện:** Khăn quàng mỏng giữ ấm cổ khi đi xe máy buổi sáng/tối.`,
        suggestions: ['Thời tiết cuối tuần thế nào?', 'Checklist đồ cần mang?'],
      };
    } else {
      return {
        text: `✨ **Gợi ý phối đồ hôm nay (${temp}°C, thời tiết rất dễ chịu):**\n\n- **Công sở / Gặp gỡ:** Áo sơ mi phom thoải mái kết hợp quần tây xám/kem, giày loafer thanh lịch.\n- **Đi chơi / Thường ngày:** Áo thun trơn kèm áo khoác sơ mi mỏng khoác ngoài + quần jeans.\n- **Màu sắc gợi ý:** Trắng, xanh baby, be hoặc xám tro.`,
        suggestions: ['Tôi có cần mang ô không?', 'Xem lịch trình hôm nay'],
      };
    }
  }

  // 2) Cuối tuần / dã ngoại — dùng đúng dự báo 7 ngày thật, không bịa số liệu
  if (asksWeekend || asksOuting) {
    const weekendDays = weather?.daily?.filter((d) => d.dayName === 'T7' || d.dayName === 'CN') ?? [];
    if (weekendDays.length > 0) {
      const lines = weekendDays
        .map(
          (d) =>
            `- **${d.dayName === 'T7' ? 'Thứ 7' : 'Chủ nhật'}:** ${d.condition.label}, ${d.tempMin}–${d.tempMax}°C, khả năng mưa ${d.precipitationProbMax}%`
        )
        .join('\n');
      const weekendRain = weekendDays.some((d) => d.condition.isRain || d.precipitationProbMax >= 40);
      return {
        text: `🏕️ **Dự báo cuối tuần:**\n\n${lines}\n\n${weekendRain ? '⚠️ Cuối tuần có khả năng mưa — nên chuẩn bị phương án trong nhà hoặc mang ô/áo mưa cho hoạt động ngoài trời.' : '✅ Thời tiết cuối tuần khá thuận lợi cho dã ngoại, cắm trại hay tụ tập ngoài trời.'}`,
        suggestions: weekendRain ? ['Checklist đồ cần mang?', 'Mặc gì chống nước tốt?'] : ['Checklist đồ dã ngoại', 'Thêm sự kiện cuối tuần'],
      };
    }
    return {
      text: `🏕️ Tôi chỉ có dữ liệu dự báo 7 ngày tới nên chưa chắc đã phủ tới cuối tuần này — bạn kiểm tra lại ở tab **"Dự báo Thời tiết"** phần 7 ngày tới nhé.`,
      suggestions: ['Thời tiết hôm nay thế nào?'],
    };
  }

  // 3) Checklist đồ mang theo
  if (lower.includes('chuẩn bị') || lower.includes('checklist') || /mang (gì|theo|đồ)/.test(lower)) {
    const list = [
      '📱 Điện thoại + Cáp/Sạc dự phòng',
      '🔑 Chìa khóa & Thẻ xe/Thẻ thang máy',
      '💳 Ví tiền & CCCD',
    ];
    if (isRain) list.push('☔ Ô gấp gọn / Áo mưa');
    if (temp >= 28) list.push('🧴 Kem chống nắng & Kính râm', '💧 Bình nước cá nhân');
    if (events.length > 0) list.push('💻 Laptop và tài liệu sự kiện');

    return {
      text: `🎒 **Checklist đồ đạc thông minh hôm nay:**\n\n${list.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}\n\n*Bạn có thể chuyển sang tab **"Smart Checklist"** để tích chọn trực tiếp khi sắp xếp đồ!*`,
      suggestions: ['Mặc gì hôm nay?', 'Chiều nay có mưa không?'],
    };
  }

  // 4) Mưa / thời tiết chung — nhánh bắt rộng nhất, xét sau cùng
  if (lower.includes('mưa') || lower.includes('ô') || lower.includes('áo mưa') || lower.includes('thời tiết')) {
    if (isRain) {
      return {
        text: `☔ **Cảnh báo mưa:** Khả năng mưa hôm nay lên tới **${rainProb}%** (đặc biệt vào khung giờ chiều tối).\n\n📌 **Lời khuyên của AI:**\n1. **Nhất định phải mang ô gấp hoặc áo mưa** trong cốp/balo.\n2. Bọc chống nước cho laptop và giấy tờ quan trọng.\n3. Đường phố có thể ngập nhẹ hoặc tắc đường lúc tan tầm, bạn nên chủ động xuất phát sớm hơn 15-20 phút nhé!`,
        suggestions: ['Checklist đồ cần mang', 'Mặc gì chống nước tốt?'],
      };
    } else {
      return {
        text: `☀️ **Thời tiết rất thuận lợi:** Hôm nay xác suất mưa chỉ khoảng **${rainProb}%**, trời ${weather?.condition.label.toLowerCase() || 'nắng ráo'}, nhiệt độ khoảng **${temp}°C**.\n\nBạn có thể thoải mái lên lịch các hoạt động ngoài trời hay hẹn hò cà phê mà không lo bị ướt!`,
        suggestions: ['Gợi ý trang phục mát mẻ', 'Các sự kiện hôm nay của tôi'],
      };
    }
  }

  // General fallback generative answer
  return {
    text: `🤖 Dựa trên thời tiết hiện tại ở **${weather?.location.name || 'khu vực của bạn'}** (${temp}°C, ${weather?.condition.label || 'nắng ráo'}) và **${events.length} sự kiện** trong lịch trình:\n\n- ${isRain ? '⚠️ Hãy nhớ mang ô khi ra ngoài vì có nguy cơ mưa.' : '✅ Thời tiết đang rất thuận lợi cho mọi kế hoạch di chuyển.'}\n- Trang phục đề xuất: Phong cách nhẹ nhàng, thoáng mát.\n- Bạn cần tôi hỗ trợ thêm về trang phục cụ thể hay lời khuyên di chuyển không?`,
    suggestions: [
      'Hôm nay đi gặp khách hàng nên mặc gì?',
      'Chiều nay có mưa không?',
      'Checklist đồ cần mang hôm nay?',
    ],
  };
}
