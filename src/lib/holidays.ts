import { solarToLunar, lunarToSolar, type LunarDate } from '@/lib/lunar';

export interface Holiday {
  name: string;
  /** Ngày nghỉ lễ chính thức theo Bộ luật Lao động */
  isDayOff: boolean;
  lunar: boolean;
}

/** Ngày lễ dương lịch — key "M-D" */
const SOLAR_HOLIDAYS: Record<string, Omit<Holiday, 'lunar'>> = {
  '1-1': { name: 'Tết Dương lịch', isDayOff: true },
  '2-3': { name: 'Thành lập Đảng CSVN', isDayOff: false },
  '2-14': { name: 'Lễ Tình nhân', isDayOff: false },
  '2-27': { name: 'Ngày Thầy thuốc VN', isDayOff: false },
  '3-8': { name: 'Quốc tế Phụ nữ', isDayOff: false },
  '3-26': { name: 'Thành lập Đoàn TNCS', isDayOff: false },
  '4-30': { name: 'Giải phóng miền Nam', isDayOff: true },
  '5-1': { name: 'Quốc tế Lao động', isDayOff: true },
  '5-19': { name: 'Sinh nhật Bác Hồ', isDayOff: false },
  '6-1': { name: 'Quốc tế Thiếu nhi', isDayOff: false },
  '6-28': { name: 'Ngày Gia đình VN', isDayOff: false },
  '7-27': { name: 'Thương binh Liệt sĩ', isDayOff: false },
  '9-2': { name: 'Quốc khánh', isDayOff: true },
  '10-10': { name: 'Giải phóng Thủ đô', isDayOff: false },
  '10-20': { name: 'Phụ nữ Việt Nam', isDayOff: false },
  '11-20': { name: 'Nhà giáo Việt Nam', isDayOff: false },
  '12-22': { name: 'Thành lập QĐND', isDayOff: false },
  '12-24': { name: 'Đêm Giáng sinh', isDayOff: false },
  '12-25': { name: 'Giáng sinh', isDayOff: false },
};

/** Ngày lễ âm lịch — key "M-D" (âm) */
const LUNAR_HOLIDAYS: Record<string, Omit<Holiday, 'lunar'>> = {
  '1-1': { name: 'Tết Nguyên Đán', isDayOff: true },
  '1-2': { name: 'Mùng 2 Tết', isDayOff: true },
  '1-3': { name: 'Mùng 3 Tết', isDayOff: true },
  '1-15': { name: 'Rằm tháng Giêng', isDayOff: false },
  '3-3': { name: 'Tết Hàn thực', isDayOff: false },
  '3-10': { name: 'Giỗ Tổ Hùng Vương', isDayOff: true },
  '4-15': { name: 'Lễ Phật Đản', isDayOff: false },
  '5-5': { name: 'Tết Đoan Ngọ', isDayOff: false },
  '7-15': { name: 'Vu Lan', isDayOff: false },
  '8-15': { name: 'Tết Trung Thu', isDayOff: false },
  '9-9': { name: 'Tết Trùng Cửu', isDayOff: false },
  '10-10': { name: 'Tết Thường Tân', isDayOff: false },
  '12-23': { name: 'Ông Công Ông Táo', isDayOff: false },
};

function isLunarNewYearEve(date: Date, lunar: LunarDate): boolean {
  if (lunar.month !== 12 || lunar.leap) return false;
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  const l = solarToLunar(next);
  return l.month === 1 && l.day === 1 && !l.leap;
}

/** Danh sách ngày lễ rơi vào một ngày dương lịch */
export function getHolidays(date: Date): Holiday[] {
  const out: Holiday[] = [];
  const solar = SOLAR_HOLIDAYS[`${date.getMonth() + 1}-${date.getDate()}`];
  if (solar) out.push({ ...solar, lunar: false });

  const lunar = solarToLunar(date);
  if (!lunar.leap) {
    const lh = LUNAR_HOLIDAYS[`${lunar.month}-${lunar.day}`];
    if (lh) out.push({ ...lh, lunar: true });
  }
  if (isLunarNewYearEve(date, lunar)) {
    out.push({ name: 'Giao thừa', isDayOff: true, lunar: true });
  }
  return out;
}

/** Ngày Tết Nguyên Đán của một năm dương lịch */
export function getTetDate(year: number): Date | null {
  return lunarToSolar(1, 1, year);
}
