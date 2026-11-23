import { useCalendarStore } from '@/store/calendarStore';
import { useSocialStore } from '@/store/socialStore';
import { isVirtualEventId, VIRTUAL_PREFIX } from './socialEvents';

/** Bấm vào sinh nhật / kỷ niệm của bạn thân trên lịch. Trả về true nếu đã xử lý. */
export function openVirtualEvent(id: string): boolean {
  if (!isVirtualEventId(id)) return false;
  if (id.startsWith(VIRTUAL_PREFIX.shared)) {
    useSocialStore.getState().openShared(id.slice(VIRTUAL_PREFIX.shared.length));
  } else {
    useCalendarStore.getState().setCurrentView('friends');
  }
  return true;
}
