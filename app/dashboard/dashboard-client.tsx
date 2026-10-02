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
import type { IScannerControls } from '@zxing/browser';
import {
  CalendarDays,
  Archive,
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
import { currentSite, eventSite } from '@/lib/event-site';
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
const blank = {
  site: currentSite,
  title: '',
  slug: '',
  category: 'Singles & Social',
  eyebrow: '',
  description: '',
  experienceTitle: '',
  experienceDescription: '',
  schedule: '',
  hostName: '',
  hostDescription: '',
  goodToKnow: '',
  refundPolicy: '',
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
  const [siteFilter, setSiteFilter] = useState<string>(currentSite);
  const visibleEvents = events.filter(
    (event) => siteFilter === 'all' || eventSite(event) === siteFilter,
  );

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
      site: eventSite(event) || currentSite,
      title: event.title,
      slug: event.slug,
      category: event.category,
      eyebrow: event.eyebrow,
      description: event.description,
      experienceTitle: event.experienceTitle || '',
      experienceDescription: event.experienceDescription || '',
      schedule: event.schedule || '',
      hostName: event.hostName || '',
      hostDescription: event.hostDescription || '',
      goodToKnow: event.goodToKnow || '',
      refundPolicy: event.refundPolicy || '',
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
    if (!response.ok) return setMessage(payload.error || 'Could not save.');
    setSiteFilter(form.site);
    setForm(blank);
    setEditingId(null);
    setView('events');
    setMessage('Event saved.');
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
    setMessage(response.ok ? 'Check-in completed.' : payload.error);
    if (response.ok && selected) await openDetail(selected.event.id);
  }

  async function logout() {
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.replace('/dashboard/login');
    router.refresh();
  }
  async function archiveEvent(event: EventRecord) {
    if (
      !window.confirm(
        `Archive “${event.title}”? It will be hidden from the website.`,
      )
    )
      return;
    setBusy(true);
    const response = await fetch(`/api/admin/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    });
    const payload = await response.json();
    setBusy(false);
    setMessage(response.ok ? 'Event archived.' : payload.error);
    if (response.ok) {
      setSelected(null);
      setView('events');
      await loadEvents();
    }
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
            Events
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
            Log out
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
                  ? 'Edit event'
                  : 'New event'
                : view === 'detail'
                  ? 'Event details'
                  : view === 'scanner'
                    ? 'Ticket check-in'
                    : 'Events'}
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
              Create event
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
            <label className="admin-site-filter">
              Website
              <select
                aria-label="Filter events by website"
                value={siteFilter}
                onChange={(event) => setSiteFilter(event.target.value)}
              >
                <option value="all">All websites</option>
                <option value="scanevent">ScanEvent</option>
                <option value="n8up">n8up</option>
              </select>
            </label>
            {visibleEvents.length === 0 ? (
              <div className="admin-empty">
                <CalendarDays />
                <h2>No events yet</h2>
                <p>Create and publish your first event.</p>
              </div>
            ) : (
              visibleEvents.map((event) => (
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
                    <p>{eventSite(event) === 'n8up' ? 'n8up' : 'ScanEvent'}</p>
                    <h2>{event.title}</h2>
                    <p>
                      {event.date} · {event.venue}
                    </p>
                  </div>
                  <div className="admin-capacity">
                    <strong>
                      {event.soldCount}/{event.capacity}
                    </strong>
                    <span>sold</span>
                  </div>
                  <button
                    className="icon-button"
                    onClick={() => editEvent(event)}
                    aria-label="Edit"
                  >
                    <Edit3 />
                  </button>
                  {event.status !== 'archived' && (
                    <button
                      className="icon-button"
                      onClick={() => archiveEvent(event)}
                      aria-label="Archive"
                    >
                      <Archive />
                    </button>
                  )}
                  <button
                    className="icon-button"
                    onClick={() => openDetail(event.id)}
                    aria-label="Details"
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
              ← Back to events
            </button>
            <div className="admin-metrics">
              <div>
                <Ticket />
                <strong>{selected.event.soldCount}</strong>
                <span>Tickets sold</span>
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
                <span>Remaining</span>
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
                Edit
              </button>
              {selected.event.status !== 'archived' && (
                <button onClick={() => archiveEvent(selected.event)}>
                  <Archive />
                  Archive
                </button>
              )}
            </div>
            <div className="admin-search">
              <Search />
              <input
                placeholder="Search name, email or ticket code"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>Attendee</th>
                    <th>Ticket</th>
                    <th>Status</th>
                    <th>
                      <span className="sr-only">Action</span>
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
                <p className="table-empty">No attendees found.</p>
              )}
            </div>
          </section>
        )}
        {view === 'scanner' && <Scanner onMessage={setMessage} />}
        {busy && (
          <div className="admin-loading">
            <RefreshCw />
            Processing…
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
        <label>
          Website
          <select value={form.site} onChange={set('site')}>
            <option value="scanevent">ScanEvent</option>
            <option value="n8up">n8up</option>
          </select>
        </label>
        <label className="wide">
          Event name
          <input value={form.title} onChange={set('title')} required />
        </label>
        <label>
          URL slug
          <input
            value={form.slug}
            onChange={set('slug')}
            placeholder="generated-automatically-if-empty"
          />
        </label>
        <label>
          Category
          <select value={form.category} onChange={set('category')}>
            <option>Singles & Social</option>
            <option>Pop-ups & Experiences</option>
            <option>Corporate & Community</option>
            <option>Private Events</option>
          </select>
        </label>
        <label className="wide">
          Eyebrow
          <input
            value={form.eyebrow}
            onChange={set('eyebrow')}
            placeholder="SIGNATURE NIGHT · 25–38"
          />
        </label>
        <label className="wide">
          Short description
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={5}
          />
        </label>
        <label className="wide">
          Experience title
          <input
            value={form.experienceTitle}
            onChange={set('experienceTitle')}
            placeholder="What guests can expect"
          />
        </label>
        <label className="wide">
          Experience details
          <textarea
            value={form.experienceDescription}
            onChange={set('experienceDescription')}
            rows={5}
          />
        </label>
        <label className="wide">
          Schedule
          <textarea
            value={form.schedule}
            onChange={set('schedule')}
            rows={4}
            placeholder={'8:00 PM — Doors open\n8:30 PM — Welcome'}
          />
        </label>
        <label>
          Host name
          <input value={form.hostName} onChange={set('hostName')} />
        </label>
        <label className="wide">
          Host details
          <textarea
            value={form.hostDescription}
            onChange={set('hostDescription')}
            rows={3}
          />
        </label>
        <label className="wide">
          Good to know
          <textarea
            value={form.goodToKnow}
            onChange={set('goodToKnow')}
            rows={4}
          />
        </label>
        <label className="wide">
          Refund policy
          <textarea
            value={form.refundPolicy}
            onChange={set('refundPolicy')}
            rows={3}
          />
        </label>
        <label>
          Date
          <input
            type="date"
            value={form.date}
            onChange={set('date')}
            required
          />
        </label>
        <label>
          Start time
          <input
            type="time"
            value={form.startTime}
            onChange={set('startTime')}
            required
          />
        </label>
        <label>
          End time
          <input type="time" value={form.endTime} onChange={set('endTime')} />
        </label>
        <label>
          Venue
          <input value={form.venue} onChange={set('venue')} required />
        </label>
        <label>
          Area
          <input value={form.area} onChange={set('area')} />
        </label>
        <label className="wide">
          Address
          <input value={form.address} onChange={set('address')} />
        </label>
        <label>
          Price (CAD)
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
          Capacity
          <input
            type="number"
            min="1"
            value={form.capacity}
            onChange={set('capacity')}
            required
          />
        </label>
        <label>
          Status
          <select value={form.status} onChange={set('status')}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="paused">Sales paused</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="wide image-upload">
          <span>Event image</span>
          {form.imageUrl && (
            <Image
              src={form.imageUrl}
              alt="Uploaded event"
              width={220}
              height={120}
              unoptimized
            />
          )}
          <span className="upload-button">
            <Upload />
            Upload image
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
          Cancel
        </button>
        <button className="admin-primary" disabled={busy}>
          Save
        </button>
      </footer>
    </form>
  );
}

function Scanner({ onMessage }: { onMessage: (value: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const processing = useRef(false);
  const mounted = useRef(true);
  const lastScan = useRef<{ value: string; at: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manual, setManual] = useState('');
  const [result, setResult] = useState<{
    ticket: TicketRecord;
    event: EventRecord;
  } | null>(null);
  const stopCamera = useCallback(() => {
    controls.current?.stop();
    controls.current = null;
    const stream = video.current?.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (video.current) video.current.srcObject = null;
    setRunning(false);
  }, []);

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
      stopCamera();
    },
    [onMessage, stopCamera],
  );

  function cameraErrorMessage(error: unknown) {
    const name = error instanceof DOMException ? error.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError')
      return 'Camera access was denied. Allow camera access for this site in iPhone Settings or Safari website settings, then try again.';
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError')
      return 'No camera was found on this device. You can enter the QR link or token manually below.';
    if (name === 'NotReadableError' || name === 'TrackStartError')
      return 'The camera is being used by another app or could not be started. Close other camera apps and try again.';
    if (name === 'OverconstrainedError')
      return 'The rear camera could not be selected. Check the device camera settings and try again.';
    return 'This browser could not start QR scanning. Update iOS or use Safari, or enter the code manually below.';
  }

  async function start() {
    setCameraError('');
    setResult(null);
    if (!window.isSecureContext) {
      setCameraError(
        'Camera scanning requires a secure HTTPS connection. Open the Vercel or production HTTPS address, or enter the code manually.',
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'This browser does not provide camera access. Update iOS or use Safari, or enter the code manually below.',
      );
      return;
    }
    if (!video.current) return;
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      setRunning(true);
      const reader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 200,
        delayBetweenScanSuccess: 1000,
      });
      const scannerControls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        video.current,
        (scanResult, _error, scannerControls) => {
          if (!scanResult || processing.current) return;
          const value = scanResult.getText().trim();
          const now = Date.now();
          if (
            !value ||
            (lastScan.current?.value === value &&
              now - lastScan.current.at < 3000)
          )
            return;
          lastScan.current = { value, at: now };
          processing.current = true;
          scannerControls.stop();
          setRunning(false);
          void lookup(value).finally(() => {
            processing.current = false;
          });
        },
      );
      if (!mounted.current) {
        scannerControls.stop();
        return;
      }
      controls.current = scannerControls;
    } catch (error) {
      stopCamera();
      setCameraError(cameraErrorMessage(error));
    }
  }
  useEffect(
    () => () => {
      mounted.current = false;
      controls.current?.stop();
      const stream = video.current?.srcObject;
      if (stream instanceof MediaStream)
        stream.getTracks().forEach((track) => track.stop());
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
    onMessage(response.ok ? 'Check-in completed.' : payload.error);
    if (response.ok) setResult(null);
  }
  return (
    <section className={`scanner ${result ? 'has-result' : ''}`}>
      <div className="scanner-window">
        <video ref={video} playsInline muted aria-label="Live camera preview" />
        {!running && (
          <button type="button" onClick={start}>
            <Camera />
            Open camera
          </button>
        )}
      </div>
      {cameraError && (
        <p className="scanner-error" role="alert">
          {cameraError}
        </p>
      )}
      {result && (
        <div className={`scan-result ${result.ticket.status}`}>
          <span>
            {result.ticket.status === 'valid'
              ? 'VALID TICKET'
              : 'INVALID TICKET'}
          </span>
          <h2>{result.ticket.attendeeName}</h2>
          <p>
            {result.event.title} · {result.ticket.shortCode}
          </p>
          {result.ticket.status === 'valid' && (
            <button type="button" onClick={confirm}>
              <Check />
              Confirm check-in
            </button>
          )}
        </div>
      )}
      <div className="manual-scan">
        <label htmlFor="manual-ticket-code">
          QR link or token
          <input
            id="manual-ticket-code"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Paste the code here"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </label>
        <button type="button" onClick={() => void lookup(manual)}>
          Check
        </button>
      </div>
    </section>
  );
}
