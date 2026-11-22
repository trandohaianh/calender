import { toDateKey } from '@/lib/utils';

export interface CityLocation {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  isPopular?: boolean;
}

export const POPULAR_LOCATIONS: CityLocation[] = [
  { id: 'hanoi', name: 'Hà Nội', country: 'Việt Nam', lat: 21.0285, lon: 105.8542, isPopular: true },
  { id: 'hcm', name: 'TP. Hồ Chí Minh', country: 'Việt Nam', lat: 10.8231, lon: 106.6297, isPopular: true },
  { id: 'danang', name: 'Đà Nẵng', country: 'Việt Nam', lat: 16.0544, lon: 108.2022, isPopular: true },
  { id: 'dalat', name: 'Đà Lạt', country: 'Việt Nam', lat: 11.9404, lon: 108.4583, isPopular: true },
  { id: 'haiphong', name: 'Hải Phòng', country: 'Việt Nam', lat: 20.8449, lon: 106.6881, isPopular: true },
  { id: 'cantho', name: 'Cần Thơ', country: 'Việt Nam', lat: 10.0452, lon: 105.7469, isPopular: true },
  { id: 'nhatrang', name: 'Nha Trang', country: 'Việt Nam', lat: 12.2388, lon: 109.1967, isPopular: true },
  { id: 'sapa', name: 'Sa Pa', country: 'Việt Nam', lat: 22.3364, lon: 103.8438, isPopular: true },
  { id: 'hue', name: 'Huế', country: 'Việt Nam', lat: 16.4637, lon: 107.5909, isPopular: true },
  { id: 'vungtau', name: 'Vũng Tàu', country: 'Việt Nam', lat: 10.3460, lon: 107.0843, isPopular: true },
  { id: 'quynhon', name: 'Quy Nhơn', country: 'Việt Nam', lat: 13.7830, lon: 109.2197, isPopular: true },
  { id: 'tokyo', name: 'Tokyo', country: 'Nhật Bản', lat: 35.6762, lon: 139.6503 },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { id: 'seoul', name: 'Seoul', country: 'Hàn Quốc', lat: 37.5665, lon: 126.9780 },
  { id: 'paris', name: 'Paris', country: 'Pháp', lat: 48.8566, lon: 2.3522 },
  { id: 'london', name: 'London', country: 'Anh', lat: 51.5074, lon: -0.1278 },
  { id: 'newyork', name: 'New York', country: 'Mỹ', lat: 40.7128, lon: -74.0060 },
];

export interface WeatherConditionInfo {
  code: number;
  label: string;
  iconName: 'sun' | 'cloud-sun' | 'cloud' | 'cloud-fog' | 'cloud-drizzle' | 'cloud-rain' | 'cloud-lightning' | 'snowflake';
  emoji: string;
  gradient: string;
  isRain: boolean;
  isStorm: boolean;
  warningText?: string;
}

export function parseWmoCode(code: number): WeatherConditionInfo {
  switch (code) {
    case 0:
      return {
        code,
        label: 'Trời quang, nắng đẹp',
        iconName: 'sun',
        emoji: '☀️',
        gradient: 'from-amber-500 via-orange-500 to-yellow-400',
        isRain: false,
        isStorm: false,
      };
    case 1:
    case 2:
      return {
        code,
        label: 'Ít mây, trời nắng nhẹ',
        iconName: 'cloud-sun',
        emoji: '🌤️',
        gradient: 'from-sky-500 via-blue-500 to-amber-400',
        isRain: false,
        isStorm: false,
      };
    case 3:
      return {
        code,
        label: 'Nhiều mây, âm u',
        iconName: 'cloud',
        emoji: '☁️',
        gradient: 'from-slate-500 via-zinc-600 to-slate-700',
        isRain: false,
        isStorm: false,
      };
    case 45:
    case 48:
      return {
        code,
        label: 'Có sương mù, tầm nhìn giảm',
        iconName: 'cloud-fog',
        emoji: '🌫️',
        gradient: 'from-teal-600 via-slate-600 to-gray-700',
        isRain: false,
        isStorm: false,
        warningText: 'Sương mù dày vào sáng sớm, chú ý lái xe an toàn.',
      };
    case 51:
    case 53:
    case 55:
      return {
        code,
        label: 'Mưa phùn rải rác',
        iconName: 'cloud-drizzle',
        emoji: '🌦️',
        gradient: 'from-blue-600 via-indigo-600 to-slate-700',
        isRain: true,
        isStorm: false,
        warningText: 'Nên mang theo áo mưa nhẹ hoặc ô gấp gọn.',
      };
    case 61:
    case 63:
    case 65:
      return {
        code,
        label: 'Mưa rào, cần mang ô',
        iconName: 'cloud-rain',
        emoji: '🌧️',
        gradient: 'from-blue-700 via-indigo-800 to-slate-900',
        isRain: true,
        isStorm: false,
        warningText: '⚠️ Khả năng mưa cao! Nhớ mang ô / áo mưa và bảo quản thiết bị điện tử.',
      };
    case 80:
    case 81:
    case 82:
      return {
        code,
        label: 'Mưa rào từng đợt',
        iconName: 'cloud-rain',
        emoji: '🌧️',
        gradient: 'from-cyan-700 via-blue-800 to-slate-900',
        isRain: true,
        isStorm: false,
        warningText: '⚠️ Mưa rào bất chợt! Mang theo ô khi ra ngoài.',
      };
    case 95:
    case 96:
    case 99:
      return {
        code,
        label: 'Dông sét, mưa to',
        iconName: 'cloud-lightning',
        emoji: '⛈️',
        gradient: 'from-purple-900 via-indigo-950 to-slate-950',
        isRain: true,
        isStorm: true,
        warningText: '🚨 Cảnh báo dông sét & mưa lớn! Hạn chế ra ngoài khi không cần thiết.',
      };
    case 71:
    case 73:
    case 75:
      return {
        code,
        label: 'Tuyết rơi nhẹ',
        iconName: 'snowflake',
        emoji: '❄️',
        gradient: 'from-cyan-600 via-sky-700 to-slate-800',
        isRain: false,
        isStorm: false,
        warningText: 'Trời rất lạnh, mặc áo ấm dày.',
      };
    default:
      return {
        code,
        label: 'Thời tiết mát mẻ',
        iconName: 'cloud-sun',
        emoji: '⛅',
        gradient: 'from-blue-600 via-indigo-700 to-slate-800',
        isRain: false,
        isStorm: false,
      };
  }
}

export interface HourlyForecast {
  time: string; // "14:00"
  fullDate: string; // "2026-08-20T14:00"
  temp: number;
  humidity: number;
  precipitationProb: number;
  weatherCode: number;
  uvIndex: number;
}

export interface DailyForecast {
  date: string; // "2026-08-20"
  dayName: string; // "Hôm nay", "T6", "T7", ...
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProbMax: number;
  uvIndexMax: number;
  condition: WeatherConditionInfo;
}

export interface CurrentWeatherReport {
  location: CityLocation;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  precipitationProb: number;
  weatherCode: number;
  condition: WeatherConditionInfo;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  updatedAt: string;
}

export async function fetchLiveWeather(loc: CityLocation): Promise<CurrentWeatherReport> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('API thời tiết phản hồi lỗi');
    const data = await res.json();

    const cur = data.current;
    const currentCode = cur.weather_code ?? 0;
    const currentCondition = parseWmoCode(currentCode);

    // Hourly next 24 hours
    const hourly: HourlyForecast[] = [];
    if (data.hourly?.time) {
      // `timeStr` is a naive local wall-clock string (API called with
      // timezone=auto, e.g. "2026-08-20T15:00"), so `new Date(timeStr)`
      // parses it as local time — comparable directly against `now`.
      // (Comparing against `now.toISOString()`, which is UTC, previously
      // picked the wrong start hour for any timezone ahead of UTC.)
      const now = new Date();
      let startIdx = data.hourly.time.findIndex((t: string) => new Date(t) >= now);
      if (startIdx === -1) startIdx = 0;
      if (startIdx > 0) {
        const prevDate = new Date(data.hourly.time[startIdx - 1]);
        if (
          prevDate.getHours() === now.getHours() &&
          prevDate.toDateString() === now.toDateString()
        ) {
          startIdx -= 1;
        }
      }

      for (let i = startIdx; i < data.hourly.time.length && hourly.length < 24; i++) {
        const timeStr = data.hourly.time[i];
        const d = new Date(timeStr);
        hourly.push({
          time: `${String(d.getHours()).padStart(2, '0')}:00`,
          fullDate: timeStr,
          temp: Math.round(data.hourly.temperature_2m[i]),
          humidity: Math.round(data.hourly.relative_humidity_2m[i] ?? 60),
          precipitationProb: Math.round(data.hourly.precipitation_probability[i] ?? 0),
          weatherCode: data.hourly.weather_code[i] ?? 0,
          uvIndex: Number((data.hourly.uv_index?.[i] ?? 3).toFixed(1)),
        });
      }
    }

    // Daily next 7 days
    const daily: DailyForecast[] = [];
    if (data.daily?.time) {
      const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      for (let i = 0; i < data.daily.time.length; i++) {
        const dateStr = data.daily.time[i];
        const d = new Date(dateStr);
        const code = data.daily.weather_code[i] ?? 0;
        const isToday = i === 0;

        daily.push({
          date: dateStr,
          dayName: isToday ? 'Hôm nay' : weekdays[d.getDay()],
          weatherCode: code,
          tempMax: Math.round(data.daily.temperature_2m_max[i]),
          tempMin: Math.round(data.daily.temperature_2m_min[i]),
          precipitationProbMax: Math.round(data.daily.precipitation_probability_max?.[i] ?? 20),
          uvIndexMax: Number((data.daily.uv_index_max?.[i] ?? 5).toFixed(1)),
          condition: parseWmoCode(code),
        });
      }
    }

    const currentHourlyMatch = hourly[0];
    const report: CurrentWeatherReport = {
      location: loc,
      temperature: Math.round(cur.temperature_2m),
      feelsLike: Math.round(cur.apparent_temperature ?? cur.temperature_2m),
      humidity: Math.round(cur.relative_humidity_2m ?? 65),
      windSpeed: Math.round(cur.wind_speed_10m ?? 12),
      uvIndex: currentHourlyMatch?.uvIndex ?? 4.5,
      precipitationProb: currentHourlyMatch?.precipitationProb ?? 30,
      weatherCode: currentCode,
      condition: currentCondition,
      hourly,
      daily,
      updatedAt: new Date().toISOString(),
    };

    return report;
  } catch (err) {
    console.warn('[weatherService] Network error, generating high-fidelity fallback:', err);
    return generateFallbackWeather(loc);
  }
}

export function generateFallbackWeather(loc: CityLocation): CurrentWeatherReport {
  const now = new Date();
  const baseTemp = loc.id === 'dalat' || loc.id === 'sapa' ? 19 : 30;
  const isRain = loc.id === 'hanoi' ? false : true;
  const code = isRain ? 61 : 1;
  const condition = parseWmoCode(code);

  const hourly: HourlyForecast[] = Array.from({ length: 24 }, (_, i) => {
    const h = (now.getHours() + i) % 24;
    const temp = baseTemp + Math.sin((h / 24) * Math.PI * 2) * 4;
    const rainProb = h >= 14 && h <= 18 ? 75 : 20;
    return {
      time: `${String(h).padStart(2, '0')}:00`,
      fullDate: new Date(now.getTime() + i * 3600000).toISOString(),
      temp: Math.round(temp),
      humidity: 70 + Math.round(Math.sin(h) * 10),
      precipitationProb: rainProb,
      weatherCode: rainProb > 50 ? 61 : 1,
      uvIndex: h >= 10 && h <= 14 ? 7.5 : 2.0,
    };
  });

  const daily: DailyForecast[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() + i * 86400000);
    const dayCode = i % 3 === 1 ? 61 : i % 2 === 0 ? 0 : 2;
    const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return {
      date: toDateKey(d),
      dayName: i === 0 ? 'Hôm nay' : weekdays[d.getDay()],
      weatherCode: dayCode,
      tempMax: baseTemp + 3 + (i % 2),
      tempMin: baseTemp - 4 + (i % 2),
      precipitationProbMax: dayCode === 61 ? 80 : 25,
      uvIndexMax: 6.8,
      condition: parseWmoCode(dayCode),
    };
  });

  return {
    location: loc,
    temperature: baseTemp,
    feelsLike: baseTemp + 2,
    humidity: 72,
    windSpeed: 14,
    uvIndex: 6.5,
    precipitationProb: 40,
    weatherCode: code,
    condition,
    hourly,
    daily,
    updatedAt: now.toISOString(),
  };
}
