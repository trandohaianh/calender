import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type CityLocation,
  type CurrentWeatherReport,
  POPULAR_LOCATIONS,
  fetchLiveWeather,
} from '@/services/weatherService';

export interface ChecklistItem {
  id: string;
  label: string;
  category: 'essential' | 'weather' | 'event' | 'personal';
  checked: boolean;
  isEssential?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  suggestions?: string[];
}

interface WeatherState {
  currentLocation: CityLocation;
  weatherReport: CurrentWeatherReport | null;
  isLoading: boolean;
  error: string | null;
  isModalOpen: boolean;
  activeTab: 'overview' | 'outfit' | 'checklist' | 'chat';
  unit: 'C' | 'F';
  checklistItems: ChecklistItem[];
  chatMessages: ChatMessage[];

  setLocation: (loc: CityLocation) => Promise<void>;
  fetchWeather: () => Promise<void>;
  detectCurrentLocation: () => Promise<void>;
  openModal: (tab?: 'overview' | 'outfit' | 'checklist' | 'chat') => void;
  closeModal: () => void;
  setActiveTab: (tab: 'overview' | 'outfit' | 'checklist' | 'chat') => void;
  toggleUnit: () => void;
  toggleChecklistItem: (id: string) => void;
  addChecklistItem: (label: string) => void;
  setChecklistItems: (items: ChecklistItem[]) => void;
  resetChecklist: () => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'time'>) => void;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 'item-umbrella', label: 'Ô gấp gọn / Áo mưa di động', category: 'weather', checked: false, isEssential: true },
  { id: 'item-sunscreen', label: 'Kem chống nắng & Kính râm', category: 'weather', checked: false },
  { id: 'item-laptop', label: 'Laptop & Bộ sạc công việc', category: 'event', checked: false, isEssential: true },
  { id: 'item-powerbank', label: 'Sạc dự phòng điện thoại', category: 'essential', checked: false },
  { id: 'item-jacket', label: 'Áo khoác gió nhẹ', category: 'weather', checked: false },
  { id: 'item-water', label: 'Bình nước cá nhân', category: 'personal', checked: false },
  { id: 'item-docs', label: 'Hồ sơ tài liệu cuộc hẹn', category: 'event', checked: false },
  { id: 'item-keys', label: 'Chìa khóa & Thẻ xe / Thẻ căn cước', category: 'essential', checked: true, isEssential: true },
];

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'ai-msg-1',
    sender: 'ai',
    text: 'Xin chào! Tôi là Trợ lý Thời tiết & Lịch trình AI 🤖. Hôm nay tôi đã phân tích thời tiết và các sự kiện trong lịch của bạn. Bạn muốn tôi tư vấn trang phục, gợi ý đồ cần mang hay dự báo khả năng mưa?',
    time: 'Bây giờ',
    suggestions: [
      'Hôm nay đi gặp khách hàng nên mặc gì?',
      'Chiều nay có mưa không, cần lưu ý gì?',
      'Checklist đồ cần mang hôm nay?',
      'Thời tiết cuối tuần này thế nào?',
    ],
  },
];

export const useWeatherStore = create<WeatherState>()(
  persist(
    (set, get) => ({
      currentLocation: POPULAR_LOCATIONS[0], // Hanoi
      weatherReport: null,
      isLoading: false,
      error: null,
      isModalOpen: false,
      activeTab: 'overview',
      unit: 'C',
      checklistItems: DEFAULT_CHECKLIST,
      chatMessages: INITIAL_CHAT,

      setLocation: async (loc) => {
        set({ currentLocation: loc, isLoading: true, error: null });
        try {
          const report = await fetchLiveWeather(loc);
          set({ weatherReport: report, isLoading: false });
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : 'Không thể tải thời tiết',
            isLoading: false,
          });
        }
      },

      fetchWeather: async () => {
        const loc = get().currentLocation;
        set({ isLoading: true, error: null });
        try {
          const report = await fetchLiveWeather(loc);
          set({ weatherReport: report, isLoading: false });
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : 'Không thể cập nhật thời tiết',
            isLoading: false,
          });
        }
      },

      detectCurrentLocation: async () => {
        if (!navigator.geolocation) {
          throw new Error('Trình duyệt không hỗ trợ định vị');
        }
        set({ isLoading: true });
        return new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const geoLoc: CityLocation = {
                id: 'gps-location',
                name: 'Vị trí hiện tại của bạn',
                country: 'GPS',
                lat: Number(pos.coords.latitude.toFixed(4)),
                lon: Number(pos.coords.longitude.toFixed(4)),
              };
              set({ currentLocation: geoLoc });
              try {
                const report = await fetchLiveWeather(geoLoc);
                set({ weatherReport: report, isLoading: false });
                resolve();
              } catch (e) {
                set({ isLoading: false });
                reject(e);
              }
            },
            (err) => {
              set({ isLoading: false, error: 'Không thể lấy vị trí GPS' });
              reject(err);
            },
            { timeout: 8000 }
          );
        });
      },

      openModal: (tab = 'overview') => set({ isModalOpen: true, activeTab: tab }),
      closeModal: () => set({ isModalOpen: false }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      toggleUnit: () => {
        set({ unit: get().unit === 'C' ? 'F' : 'C' });
      },

      toggleChecklistItem: (id) => {
        set((state) => ({
          checklistItems: state.checklistItems.map((item) =>
            item.id === id ? { ...item, checked: !item.checked } : item
          ),
        }));
      },

      addChecklistItem: (label) => {
        if (!label.trim()) return;
        const newItem: ChecklistItem = {
          id: `item-${Date.now()}`,
          label: label.trim(),
          category: 'personal',
          checked: false,
        };
        set((state) => ({
          checklistItems: [newItem, ...state.checklistItems],
        }));
      },

      setChecklistItems: (items) => set({ checklistItems: items }),

      resetChecklist: () => set({ checklistItems: DEFAULT_CHECKLIST }),

      addChatMessage: (msg) => {
        const fullMsg: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          ...msg,
        };
        set((state) => ({
          chatMessages: [...state.chatMessages, fullMsg],
        }));
      },
    }),
    {
      name: 'mycalendar-weather-store',
      partialize: (s) => ({
        currentLocation: s.currentLocation,
        unit: s.unit,
        checklistItems: s.checklistItems,
      }),
    }
  )
);
