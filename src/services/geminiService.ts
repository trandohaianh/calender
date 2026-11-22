import type { CurrentWeatherReport } from './weatherService';
import type { CalendarEvent } from '@/types';
import { toDateKey } from '@/lib/utils';

const MODEL = 'gemini-2.5-flash';

export function isGeminiConfigured(): boolean {
  return !!import.meta.env.VITE_GEMINI_API_KEY;
}

function buildContext(weather: CurrentWeatherReport | null, events: CalendarEvent[]): string {
  const today = toDateKey(new Date());
  const todayEvents = events.filter((e) => {
    try {
      return toDateKey(e.startDate.toDate()) === today;
    } catch {
      return false;
    }
  });

  const weatherLine = weather
    ? `${weather.temperature}°C, ${weather.condition.label}, xác suất mưa ${weather.precipitationProb}%, UV ${weather.uvIndex}, tại ${weather.location.name}`
    : 'không có dữ liệu thời tiết';

  const forecastLine = weather?.daily?.length
    ? weather.daily
        .map((d) => `${d.dayName}: ${d.condition.label}, ${d.tempMin}–${d.tempMax}°C, mưa ${d.precipitationProbMax}%`)
        .join(' | ')
    : 'không có dữ liệu dự báo nhiều ngày';

  const eventsLine =
    todayEvents.length > 0
      ? todayEvents.map((e) => `- ${e.title}`).join('\n')
      : 'không có sự kiện nào hôm nay';

  return `Thời tiết hôm nay: ${weatherLine}.\nDự báo 7 ngày tới (hôm nay → +6 ngày): ${forecastLine}.\nLịch trình hôm nay:\n${eventsLine}`;
}

/**
 * Gọi Gemini để trả lời tự do dựa trên thời tiết + lịch trình thật.
 * Ném lỗi nếu chưa cấu hình key hoặc gọi API thất bại — bên gọi (WeatherAiModal)
 * tự bắt lỗi này để rơi về `askAiAssistant` (rule-based) làm phương án dự phòng.
 */
export async function askGemini(
  prompt: string,
  weather: CurrentWeatherReport | null,
  events: CalendarEvent[]
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Chưa cấu hình VITE_GEMINI_API_KEY');

  const context = buildContext(weather, events);
  const systemInstruction =
    'Bạn là trợ lý thời tiết & lịch trình cá nhân trong app MyCalendar. ' +
    'Trả lời ngắn gọn, thân thiện, bằng tiếng Việt, dựa trên đúng dữ liệu thời tiết ' +
    'và lịch trình được cung cấp — không bịa thêm số liệu. Nếu người dùng hỏi ngoài ' +
    'phạm vi thời tiết/trang phục/lịch trình, vẫn có thể trả lời bình thường nhưng ngắn gọn.';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [
        {
          role: 'user',
          parts: [{ text: `${context}\n\nCâu hỏi của người dùng: ${prompt}` }],
        },
      ],
      generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini API lỗi ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini không trả về nội dung');

  return text.trim();
}
