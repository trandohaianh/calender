import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';

/** Auth + analytics — tải sau khi UI lịch đã hiện */
export default function FirebaseBootstrap() {
  useAuth();
  useAnalytics();
  return null;
}
