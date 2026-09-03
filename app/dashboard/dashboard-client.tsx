'use client';

import {
  SyntheticEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Edit3,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  Upload,
  Users,
  X,
} from 'lucide-react';
import type { EventRecord, TicketRecord } from '@/lib/types';

type Order = {
  id: string;
  buyerName: string;
  buyerEmail: string;
  quantity: number;
  amountTotal: number;
  currency: string;
  status: string;
};
type EventDetail = {
  event: EventRecord;
  tickets: TicketRecord[];
  orders: Order[];
};
type BarcodeDetectorLike = {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
};
type BarcodeDetectorConstructor = new (options: {
  formats: string[];
}) => BarcodeDetectorLike;

const blank = {
  title: '',
  slug: '',
  category: 'Singles & Social',
  eyebrow: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  venue: '',
  area: '',
  address: '',
  imageUrl: '',
  price: '',
  capacity: '',
  status: 'draft',
};

export default function DashboardClient({ email }: { email: string }) {
  const router = useRouter();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selected, setSelected] = useState<EventDetail | null>(null);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<'events' | 'editor' | 'detail' | 'scanner'>(
    'events',
  );
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');

  const loadEvents = useCallback(async () => {
    const response = await fetch('/api/admin/events', { cache: 'no-store' });
    if (response.status === 401) {
      router.replace('/dashboard/login');
      return;
    }
    const payload = await response.json();
    setEvents(payload.events || []);
  }, [router]);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadEvents(), 0);
    return () => window.clearTimeout(timer);
  }, [loadEvents]);

  async function openDetail(id: string) {
    setBusy(true);
    const response = await fetch(`/api/admin/events/${id}`, {
      cache: 'no-store',
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.error);
    setSelected(payload);
    setView('detail');
  }

  function editEvent(event: EventRecord) {
    setEditingId(event.id);
    setForm({
      title: event.title,
      slug: event.slug,
      category: event.category,
      eyebrow: event.eyebrow,
      description: event.description,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      venue: event.venue,
      area: event.area,
      address: event.address,
      imageUrl: event.imageUrl,
      price: (event.priceCents / 100).toFixed(2),
      capacity: String(event.capacity),
      status: event.status,
    });
    setView('editor');
  }

  async function saveEvent(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const body = {
      ...form,
      priceCents: Math.round(Number(form.price) * 100),
      capacity: Number(form.capacity),
      currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || 'CAD',
    };
    const response = await fetch(
      editingId ? `/api/admin/events/${editingId}` : '/api/admin/events',
      {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.error || 'Kaydedilemedi.');
    setForm(blank);
    setEditingId(null);
    setView('events');
    setMessage('Etkinlik kaydedildi.');
    await loadEvents();
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    setBusy(true);
    const data = new FormData();
    data.append('image', file);
    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      body: data,
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.error);
    setForm((current) => ({ ...current, imageUrl: payload.url }));
  }

  async function checkIn(ticketId: string) {
    const response = await fetch(`/api/admin/tickets/${ticketId}/check-in`, {
      method: 'POST',
    });
    const payload = await response.json();
    setMessage(response.ok ? 'Check-in tamamlandı.' : payload.error);
    if (response.ok && selected) await openDetail(selected.event.id);
  }

  async function logout() {
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.replace('/dashboard/login');
    router.refresh();
  }
  const filteredTickets =
    selected?.tickets.filter((ticket) =>
      `${ticket.attendeeName} ${ticket.attendeeEmail} ${ticket.shortCode}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ) || [];

  return (
    <div className="admin-shell">
      <aside>
        <div className="admin-brand">
          <Image
            src="/images/logo/SE_logo_D.png"
            alt=""
            width={38}
            height={38}
          />
          <strong>SCANΔDMIN</strong>
        </div>
        <nav>
          <button
            className={view === 'events' ? 'active' : ''}
            onClick={() => setView('events')}
          >
            <CalendarDays />
            Etkinlikler
          </button>
          <button
            className={view === 'scanner' ? 'active' : ''}
            onClick={() => setView('scanner')}
          >
            <Camera />
            Check-in
          </button>
        </nav>
        <div className="admin-user">
          <small>{email}</small>
          <button onClick={logout}>
            <LogOut />
            Çıkış
          </button>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <span>OPERATIONS</span>
            <h1>
              {view === 'editor'
                ? editingId
                  ? 'Etkinliği düzenle'
                  : 'Yeni etkinlik'
                : view === 'detail'
                  ? 'Etkinlik detayı'
                  : view === 'scanner'
                    ? 'Bilet kontrolü'
                    : 'Etkinlikler'}
            </h1>
          </div>
          {view === 'events' && (
            <button
              className="admin-primary"
              onClick={() => {
                setForm(blank);
                setEditingId(null);
                setView('editor');
              }}
            >
              <Plus />
              Etkinlik oluştur
            </button>
          )}
        </header>
        {message && (
          <button
            type="button"
            className="admin-message"
            onClick={() => setMessage('')}
          >
            {message}
            <X />
          </button>
        )}
        {view === 'events' && (
          <section className="admin-events">
            {events.length === 0 ? (
              <div className="admin-empty">
                <CalendarDays />
                <h2>Henüz etkinlik yok</h2>
                <p>İlk etkinliğinizi oluşturup yayınlayın.</p>
              </div>
            ) : (
              events.map((event) => (
                <article key={event.id}>
                  <div className="admin-event-image">
                    {event.imageUrl ? (
                      <Image
                        src={event.imageUrl}
                        alt=""
                        fill
                        sizes="160px"
                        unoptimized
                      />
                    ) : (
                      <CalendarDays />
                    )}
                  </div>
                  <div>
                    <span className={`admin-status ${event.status}`}>
                      {event.status}
                    </span>
                    <h2>{event.title}</h2>
                    <p>
                      {event.date} · {event.venue}
                    </p>
                  </div>
                  <div className="admin-capacity">
                    <strong>
                      {event.soldCount}/{event.capacity}
                    </strong>
                    <span>satılan</span>
                  </div>
                  <button
                    className="icon-button"
                    onClick={() => editEvent(event)}
                    aria-label="Düzenle"
                  >
                    <Edit3 />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => openDetail(event.id)}
                    aria-label="Detay"
                  >
                    <ChevronRight />
                  </button>
                </article>
              ))
            )}
          </section>
        )}
        {view === 'editor' && (
          <EventForm
            form={form}
            setForm={setForm}
            save={saveEvent}
            upload={uploadImage}
            busy={busy}
            cancel={() => setView('events')}
          />
        )}
        {view === 'detail' && selected && (
          <section className="admin-detail">
            <button className="admin-back" onClick={() => setView('events')}>
              ← Etkinliklere dön
            </button>
            <div className="admin-metrics">
              <div>
                <Ticket />
                <strong>{selected.event.soldCount}</strong>
                <span>Satılan bilet</span>
              </div>
              <div>
                <Users />
                <strong>
                  {
                    selected.tickets.filter((t) => t.status === 'checked_in')
                      .length
                  }
                </strong>
                <span>Check-in</span>
              </div>
              <div>
                <CalendarDays />
                <strong>
                  {selected.event.capacity -
                    selected.event.soldCount -
                    selected.event.reservedCount}
                </strong>
                <span>Kalan</span>
              </div>
            </div>
            <div className="admin-detail-head">
              <div>
                <span className={`admin-status ${selected.event.status}`}>
                  {selected.event.status}
                </span>
                <h2>{selected.event.title}</h2>
              </div>
              <button onClick={() => editEvent(selected.event)}>
                <Edit3 />
                Düzenle
              </button>
            </div>
            <div className="admin-search">
              <Search />
              <input
                placeholder="İsim, e-posta veya bilet kodu ara"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>Katılımcı</th>
                    <th>Bilet</th>
                    <th>Durum</th>
                    <th>
                      <span className="sr-only">İşlem</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <strong>{ticket.attendeeName}</strong>
                        <small>{ticket.attendeeEmail}</small>
                      </td>
                      <td>{ticket.shortCode}</td>
                      <td>
                        <span className={`ticket-pill ${ticket.status}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td>
                        {ticket.status === 'valid' && (
                          <button onClick={() => checkIn(ticket.id)}>
                            <Check />
                            Check-in
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTickets.length === 0 && (
                <p className="table-empty">Katılımcı bulunamadı.</p>
              )}
            </div>
          </section>
        )}
        {view === 'scanner' && <Scanner onMessage={setMessage} />}
        {busy && (
          <div className="admin-loading">
            <RefreshCw />
            İşleniyor…
          </div>
        )}
      </main>
    </div>
  );
}

function EventForm({
  form,
  setForm,
  save,
  upload,
  busy,
  cancel,
}: {
  form: typeof blank;
  setForm: React.Dispatch<React.SetStateAction<typeof blank>>;
  save: (e: SyntheticEvent<HTMLFormElement>) => void;
  upload: (f?: File) => void;
  busy: boolean;
  cancel: () => void;
}) {
  const set =
    (key: keyof typeof blank) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));
  return (
    <form className="admin-form" onSubmit={save}>
      <div className="admin-form-grid">
        <label className="wide">
          Etkinlik adı
          <input value={form.title} onChange={set('title')} required />
        </label>
        <label>
          URL adı
          <input
            value={form.slug}
            onChange={set('slug')}
            placeholder="bos-birakirsan-otomatik"
          />
        </label>
        <label>
          Kategori
          <select value={form.category} onChange={set('category')}>
            <option>Singles & Social</option>
            <option>Pop-ups & Experiences</option>
            <option>Corporate & Community</option>
            <option>Private Events</option>
          </select>
        </label>
        <label className="wide">
          Üst başlık
          <input
            value={form.eyebrow}
            onChange={set('eyebrow')}
            placeholder="SIGNATURE NIGHT · 25–38"
          />
        </label>
        <label className="wide">
          Açıklama
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={5}
          />
        </label>
        <label>
          Tarih
          <input
            type="date"
            value={form.date}
            onChange={set('date')}
            required
          />
        </label>
        <label>
          Başlangıç
          <input
            type="time"
            value={form.startTime}
            onChange={set('startTime')}
            required
          />
        </label>
        <label>
          Bitiş
          <input type="time" value={form.endTime} onChange={set('endTime')} />
        </label>
        <label>
          Mekân
          <input value={form.venue} onChange={set('venue')} required />
        </label>
        <label>
          Bölge
          <input value={form.area} onChange={set('area')} />
        </label>
        <label className="wide">
          Adres
          <input value={form.address} onChange={set('address')} />
        </label>
        <label>
          Fiyat (CAD)
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={set('price')}
            required
          />
        </label>
        <label>
          Kapasite
          <input
            type="number"
            min="1"
            value={form.capacity}
            onChange={set('capacity')}
            required
          />
        </label>
        <label>
          Durum
          <select value={form.status} onChange={set('status')}>
            <option value="draft">Taslak</option>
            <option value="published">Yayında</option>
            <option value="paused">Satış durdu</option>
            <option value="cancelled">İptal</option>
            <option value="completed">Tamamlandı</option>
          </select>
        </label>
        <label className="wide image-upload">
          <span>Etkinlik görseli</span>
          {form.imageUrl && (
            <Image
              src={form.imageUrl}
              alt="Yüklenen görsel"
              width={220}
              height={120}
              unoptimized
            />
          )}
          <span className="upload-button">
            <Upload />
            Görsel yükle
            <input
              type="file"
              accept="image/*"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </span>
        </label>
      </div>
      <footer>
        <button type="button" onClick={cancel}>
          Vazgeç
        </button>
        <button className="admin-primary" disabled={busy}>
          Kaydet
        </button>
      </footer>
    </form>
  );
}

function Scanner({ onMessage }: { onMessage: (value: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [running, setRunning] = useState(false);
  const [manual, setManual] = useState('');
  const [result, setResult] = useState<{
    ticket: TicketRecord;
    event: EventRecord;
  } | null>(null);
  const lookup = useCallback(
    async (raw: string) => {
      let token = raw.trim();
      try {
        const url = new URL(token);
        token = decodeURIComponent(
          url.pathname.split('/').filter(Boolean).pop() || '',
        );
      } catch {}
      if (!token) return;
      const response = await fetch('/api/admin/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const payload = await response.json();
      if (!response.ok) return onMessage(payload.error);
      setResult(payload);
      setRunning(false);
      if (video.current?.srcObject)
        (video.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
    },
    [onMessage],
  );
  async function start() {
    const Detector = (
      window as typeof window & { BarcodeDetector?: BarcodeDetectorConstructor }
    ).BarcodeDetector;
    if (!Detector)
      return onMessage(
        'Bu tarayıcı kamera ile QR okumayı desteklemiyor. Kodu elle girin.',
      );
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (!video.current) return;
      video.current.srcObject = stream;
      await video.current.play();
      setRunning(true);
      const detector = new Detector({ formats: ['qr_code'] });
      const scan = async () => {
        if (!video.current) return;
        const codes = await detector.detect(video.current).catch(() => []);
        if (codes[0]) return lookup(codes[0].rawValue);
        timer.current = window.setTimeout(scan, 250);
      };
      void scan();
    } catch {
      onMessage('Kamera açılamadı. Tarayıcı iznini kontrol edin.');
    }
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (video.current?.srcObject)
        (video.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
    },
    [],
  );
  async function confirm() {
    if (!result) return;
    const response = await fetch(
      `/api/admin/tickets/${result.ticket.id}/check-in`,
      { method: 'POST' },
    );
    const payload = await response.json();
    onMessage(response.ok ? 'Check-in tamamlandı.' : payload.error);
    if (response.ok) setResult(null);
  }
  return (
    <section className="scanner">
      <div className="scanner-window">
        <video ref={video} playsInline muted />
        {!running && (
          <button onClick={start}>
            <Camera />
            Kamerayı aç
          </button>
        )}
      </div>
      <div className="manual-scan">
        <label>
          QR bağlantısı veya token
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Kodu buraya yapıştırın"
          />
        </label>
        <button onClick={() => lookup(manual)}>Kontrol et</button>
      </div>
      {result && (
        <div className={`scan-result ${result.ticket.status}`}>
          <span>
            {result.ticket.status === 'valid'
              ? 'GEÇERLİ BİLET'
              : 'BİLET GEÇERLİ DEĞİL'}
          </span>
          <h2>{result.ticket.attendeeName}</h2>
          <p>
            {result.event.title} · {result.ticket.shortCode}
          </p>
          {result.ticket.status === 'valid' && (
            <button onClick={confirm}>
              <Check />
              Girişi onayla
            </button>
          )}
        </div>
      )}
    </section>
  );
}
