import { useCallback, useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, MapPin, Loader2 } from 'lucide-react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Button } from '@/components/ui/button';
import { useWeatherStore } from '@/store/weatherStore';
import type { CityLocation } from '@/services/weatherService';
import { toastSuccess, toastError } from '@/store/toastStore';

// Leaflet's default marker icon references image paths that bundlers don't
// resolve automatically — point it at the Vite-processed asset URLs instead.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Picked {
  lat: number;
  lon: number;
  name: string;
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=vi`
    );
    if (!res.ok) throw new Error('reverse geocode failed');
    const data = await res.json();
    const addr = data.address ?? {};
    const city = addr.city || addr.town || addr.village || addr.county || addr.state;
    const country = addr.country;
    return [city, country].filter(Boolean).join(', ') || data.display_name || '';
  } catch {
    return '';
  }
}

interface LocationMapPickerProps {
  open: boolean;
  onClose: () => void;
}

export function LocationMapPicker({ open, onClose }: LocationMapPickerProps) {
  const currentLocation = useWeatherStore((s) => s.currentLocation);
  const setLocation = useWeatherStore((s) => s.setLocation);

  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  // Radix mounts the dialog's content (and this ref's div) on its own timing,
  // not necessarily in the same effect pass as `open` flipping to true — so a
  // plain useRef + useEffect(() => ..., [open]) can fire before the div
  // actually exists in the DOM. A callback ref fires exactly when React
  // attaches/detaches the real node, which is the signal we actually need.
  const initialLocationRef = useRef(currentLocation);
  initialLocationRef.current = currentLocation;

  const [picked, setPicked] = useState<Picked | null>(null);
  const [loadingName, setLoadingName] = useState(false);
  const [applying, setApplying] = useState(false);

  const mapContainerCallback = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      if (mapRef.current) return;
      const loc = initialLocationRef.current;
      const map = L.map(node).setView([loc.lat, loc.lon], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const marker = L.marker([loc.lat, loc.lon]).addTo(map);
      markerRef.current = marker;

      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setPicked({ lat, lon: lng, name: '' });
        setLoadingName(true);
        void reverseGeocode(lat, lng).then((name) => {
          setPicked({ lat, lon: lng, name });
          setLoadingName(false);
        });
      });

      mapRef.current = map;
      // Dialog's enter animation can leave Leaflet with a stale size reading.
      setTimeout(() => map.invalidateSize(), 150);
    } else {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setPicked(null);
      setLoadingName(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!picked) return;
    setApplying(true);
    const loc: CityLocation = {
      id: `custom-${picked.lat.toFixed(4)}-${picked.lon.toFixed(4)}`,
      name: picked.name || `Vị trí ${picked.lat.toFixed(3)}, ${picked.lon.toFixed(3)}`,
      country: '',
      lat: Number(picked.lat.toFixed(4)),
      lon: Number(picked.lon.toFixed(4)),
    };
    try {
      await setLocation(loc);
      toastSuccess(`Đã chuyển vị trí sang ${loc.name}`);
      onClose();
    } catch {
      toastError('Không thể lấy thời tiết cho vị trí này, thử lại nhé.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[60] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-card shadow-2xl duration-200 animate-in fade-in-0 zoom-in-95"
        >
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <div>
              <DialogPrimitive.Title className="flex items-center gap-1.5 text-sm font-bold">
                <MapPin className="h-4 w-4 text-primary" /> Chọn vị trí trên bản đồ
              </DialogPrimitive.Title>
              <p className="text-xs text-muted-foreground">
                Bấm vào bất kỳ đâu trên bản đồ để chọn vị trí xem thời tiết
              </p>
            </div>
            <DialogPrimitive.Close className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div ref={mapContainerCallback} className="h-[420px] w-full" />

          <div className="flex items-center justify-between gap-3 border-t p-4">
            <div className="min-w-0 flex-1 text-xs">
              {picked ? (
                loadingName ? (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Đang xác định tên vị trí...
                  </span>
                ) : (
                  <span className="font-semibold text-foreground">
                    📍 {picked.name || `${picked.lat.toFixed(3)}, ${picked.lon.toFixed(3)}`}
                  </span>
                )
              ) : (
                <span className="text-muted-foreground">Chưa chọn vị trí — bấm vào bản đồ</span>
              )}
            </div>
            <Button
              size="sm"
              disabled={!picked || loadingName || applying}
              onClick={handleConfirm}
              className="shrink-0"
            >
              {applying ? 'Đang áp dụng...' : 'Xác nhận vị trí này'}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
