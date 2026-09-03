'use client';
import './photos.css';
import './checkout.css';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  Heart,
  MapPin,
  Menu,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import type { EventRecord } from '@/lib/types';

type EventItem = {
  id: string;
  category: string;
  eyebrow: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  area: string;
  price: string;
  status: string;
  spots: number;
  tone: string;
  symbol: string;
  description: string;
  experienceTitle?: string;
  experienceDescription?: string;
  schedule?: string;
  hostName?: string;
  hostDescription?: string;
  goodToKnow?: string;
  refundPolicy?: string;
  image?: string;
  demo?: boolean;
};
const fallbackEvents: EventItem[] = [
  {
    id: 'after-dark-social',
    category: 'Singles & Social',
    eyebrow: 'SIGNATURE NIGHT · 25–38',
    title: 'After Dark\nSocial',
    date: 'Fri, Sep 12',
    time: '8:00 PM – late',
    venue: 'Soluna',
    area: 'Queen West',
    price: '$34',
    status: 'Selling fast',
    spots: 18,
    tone: 'acid',
    symbol: '✦',
    description:
      'A no-pressure night for good people, great music and real-world chemistry—hosted with intention in one of Toronto’s best rooms.',
    image: '/images/scanevent-social-night.png',
    demo: true,
  },
  {
    id: 'patio-people',
    category: 'Singles & Social',
    eyebrow: 'SUNSET MIXER · 28–42',
    title: 'Patio People',
    date: 'Thu, Sep 18',
    time: '7:00 PM – 10:30 PM',
    venue: 'The Broadview Hotel',
    area: 'Riverside',
    price: '$28',
    status: 'Just added',
    spots: 32,
    tone: 'coral',
    symbol: '☼',
    description:
      'Golden hour, a skyline view and just enough structure to make meeting someone new feel easy.',
    demo: true,
  },
  {
    id: 'supper-club-vol-03',
    category: 'Pop-ups & Experiences',
    eyebrow: 'COMMUNAL DINNER · 30+',
    title: 'Supper Club\nVol. 03',
    date: 'Sat, Sep 27',
    time: '7:30 PM – 11:00 PM',
    venue: 'Secret location',
    area: 'West End',
    price: '$78',
    status: 'Waitlist open',
    spots: 0,
    tone: 'violet',
    symbol: '03',
    description:
      'A shared-table dinner for curious Torontonians, with an unreleased menu and thoughtfully mixed seating.',
    image: '/images/scanevent-supper-club.png',
    demo: true,
  },
  {
    id: 'creative-collision',
    category: 'Corporate & Community',
    eyebrow: 'COMMUNITY NIGHT · ALL WELCOME',
    title: 'Creative\nCollision',
    date: 'Wed, Oct 01',
    time: '6:30 PM – 9:30 PM',
    venue: 'Waterworks',
    area: 'King West',
    price: '$22',
    status: 'New',
    spots: 46,
    tone: 'blue',
    symbol: 'CC',
    description:
      'Designers, founders, musicians and makers meet through playful prompts—not another stack of business cards.',
    image: '/images/scanevent-social-night.png',
    demo: true,
  },
];
const categories = [
  'All events',
  'Singles & Social',
  'Pop-ups & Experiences',
  'Corporate & Community',
];

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <button
      className="brand"
      onClick={
        onClick || (() => window.scrollTo({ top: 0, behavior: 'smooth' }))
      }
      aria-label="ScanEvent home"
    >
      <span className="brand-logo-crop">
        <Image
          src="/images/logo/SE_logo_light.png"
          alt="ScanEvent"
          width={180}
          height={48}
          priority
        />
      </span>
    </button>
  );
}
function EventArt({
  event,
  large = false,
}: {
  event: EventItem;
  large?: boolean;
}) {
  return (
    <div
      className={`event-art ${event.tone} ${event.image ? 'photo' : ''} ${large ? 'large' : ''}`}
      style={
        event.image
          ? {
              backgroundImage: `linear-gradient(180deg,transparent 20%,rgba(8,8,9,.86) 100%),url(${event.image})`,
            }
          : undefined
      }
    >
      <div className="grain" />
      <span className="art-symbol">{event.symbol}</span>
      <div className="art-lines">
        <i />
        <i />
        <i />
      </div>
      <div className="art-copy">
        <span>TORONTO · SCANEVENT</span>
        <strong>{event.title}</strong>
      </div>
    </div>
  );
}
function Header({
  onExplore,
  onHome,
}: {
  onExplore: () => void;
  onHome: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <Brand onClick={onHome} />
      <nav className={open ? 'open' : ''}>
        <button
          onClick={() => {
            onExplore();
            setOpen(false);
          }}
        >
          Explore events
        </button>
        <a href="#why">Why ScanEvent</a>
        <a href="#host">Host with us</a>
        <a href="#about">About</a>
      </nav>
      <button className="header-cta" onClick={onExplore}>
        Find your night <ArrowRight size={17} />
      </button>
      <button
        className="menu-btn"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X /> : <Menu />}
      </button>
    </header>
  );
}

function Home({
  onExplore,
  onSelect,
  events,
}: {
  onExplore: () => void;
  onSelect: (e: EventItem) => void;
  events: EventItem[];
}) {
  return (
    <>
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-copy">
          <div className="kicker">
            <span>●</span> Toronto, meet your people
          </div>
          <h1>
            Plans worth
            <br />
            <em>showing up</em> for.
          </h1>
          <p>
            Curated social experiences for people who want more from going out.
            Come solo. Leave connected.
          </p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={onExplore}>
              Explore events <ArrowRight size={19} />
            </button>
            <a href="#why" className="text-link">
              See how it works <span>↓</span>
            </a>
          </div>
          <div className="trust-line">
            <span className="faces">
              <i>J</i>
              <i>M</i>
              <i>A</i>
              <i>+</i>
            </span>
            <span>
              <strong>4.9</strong> <Star size={12} fill="currentColor" /> from
              600+ guests
            </span>
          </div>
        </div>
        {events[0] && (
          <button className="hero-feature" onClick={() => onSelect(events[0])}>
            <EventArt event={events[0]} large />
            <div className="feature-meta">
              <span>Next up</span>
              <strong>
                {events[0].date} · {events[0].area}
              </strong>
              <i>
                <ArrowRight />
              </i>
            </div>
          </button>
        )}
        <div className="scroll-note">
          SCROLL TO DISCOVER <span>↘</span>
        </div>
      </section>
      <section className="marquee">
        <div>
          GOOD PEOPLE <b>✦</b> GREAT PLACES <b>✦</b> ZERO AWKWARD ENERGY{' '}
          <b>✦</b> TORONTO IRL <b>✦</b>
        </div>
      </section>
      <section className="upcoming" id="events">
        <div className="section-head">
          <div>
            <span className="section-num">01 / UPCOMING</span>
            <h2>
              Your next good
              <br />
              story starts here.
            </h2>
          </div>
          <button className="outline-btn" onClick={onExplore}>
            View all events <ArrowRight size={18} />
          </button>
        </div>
        <div className="event-row">
          {events.slice(0, 3).map((event) => (
            <button
              type="button"
              className="event-card"
              key={event.id}
              onClick={() => onSelect(event)}
            >
              <EventArt event={event} />
              <div className="card-top">
                <span>{event.category}</span>
                <span aria-hidden="true">
                  <Heart size={18} />
                </span>
              </div>
              <h3>{event.title.replace('\n', ' ')}</h3>
              <div className="card-info">
                <span>
                  <CalendarDays /> {event.date}
                </span>
                <span>
                  <MapPin /> {event.area}
                </span>
              </div>
              <div className="card-foot">
                <strong>{event.price}</strong>
                <span>
                  {event.status} <ArrowRight size={16} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="manifesto" id="why">
        <div className="manifesto-art manifesto-photo">
          <span>IRL</span>
          <ArrowUpRight className="manifesto-arrow" aria-hidden="true" />
          <small>
            43.6500° N<br />
            79.3800° W
          </small>
        </div>
        <div className="manifesto-copy">
          <span className="section-num">02 / THE SCANEVENT DIFFERENCE</span>
          <h2>
            Not networking.
            <br />
            Not swiping.
            <br />
            <em>Actually connecting.</em>
          </h2>
          <p>
            We design the room, the rhythm and the little moments that make
            connection feel natural. Every ScanEvent is hosted, considered and
            built for belonging.
          </p>
          <div className="proof-grid">
            <div>
              <ShieldCheck />
              <strong>Safe by design</strong>
              <span>
                Clear community standards, vetted venues and visible hosts.
              </span>
            </div>
            <div>
              <Users />
              <strong>Curated crowds</strong>
              <span>
                Balanced attendance and formats that welcome solo guests.
              </span>
            </div>
            <div>
              <Sparkles />
              <strong>Never generic</strong>
              <span>One-of-one concepts made for the city we call home.</span>
            </div>
          </div>
        </div>
      </section>
      <section className="categories">
        <span className="section-num">03 / MORE WAYS TO GATHER</span>
        <h2>
          One city. Many reasons
          <br />
          to get together.
        </h2>
        <div className="category-list">
          {[
            [
              'Singles & Social',
              'Mixers, shared tables & low-pressure connection',
              '01',
            ],
            ['Private Events', 'Milestones that feel entirely like you', '02'],
            [
              'Corporate & Community',
              'Bring teams, neighbourhoods and ideas together',
              '03',
            ],
            [
              'Pop-ups & Experiences',
              'Unexpected formats in exceptional spaces',
              '04',
            ],
          ].map(([t, d, n]) => (
            <button key={t} onClick={onExplore}>
              <small>{n}</small>
              <strong>{t}</strong>
              <span>{d}</span>
              <ArrowUpRight className="category-arrow" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
      <section className="quote">
        <div className="quote-mark">“</div>
        <blockquote>
          I came alone and within ten minutes it felt like I’d walked into the
          best house party in the city.
        </blockquote>
        <div>
          <span className="mini-avatar">S</span>
          <p>
            <strong>Sarah K.</strong>
            <br />
            After Dark Social guest
          </p>
          <span className="stars">★★★★★</span>
        </div>
      </section>
      <section className="host" id="host">
        <div>
          <span className="section-num">FOR VENUES, BRANDS & GOOD IDEAS</span>
          <h2>
            Have a space?
            <br />
            Let’s fill it with energy.
          </h2>
          <p>
            We partner with Toronto’s most interesting venues and people to
            build repeatable, memorable social experiences.
          </p>
          <button className="light-btn">
            Partner with us <ArrowRight />
          </button>
        </div>
        <div className="host-stamp">
          <span>
            HOST
            <br />
            WITH
            <br />
            US
          </span>
          <i>✦</i>
        </div>
      </section>
    </>
  );
}

function Explore({
  onSelect,
  events,
}: {
  onSelect: (e: EventItem) => void;
  events: EventItem[];
}) {
  const [active, setActive] = useState('All events');
  const filtered = useMemo(
    () =>
      active === 'All events'
        ? events
        : events.filter((e) => e.category === active),
    [active, events],
  );
  return (
    <main className="explore-page">
      <section className="explore-hero">
        <span className="section-num">TORONTO · FALL 2026</span>
        <h1>
          Find your
          <br />
          <em>next night out.</em>
        </h1>
        <p>
          From electric singles socials to intimate dinners and creative
          pop-ups. Pick your energy—we’ll handle the rest.
        </p>
      </section>
      <section className="filter-bar">
        <div className="filter-tabs">
          {categories.map((cat) => (
            <button
              className={active === cat ? 'active' : ''}
              key={cat}
              onClick={() => setActive(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <button className="date-filter">
          <CalendarDays size={17} /> Any date <ChevronDown size={16} />
        </button>
      </section>
      <section className="listing">
        <div className="listing-title">
          <strong>{filtered.length} experiences</strong>
          <span>Curated in Toronto</span>
        </div>
        <div className="listing-grid">
          {filtered.map((event) => (
            <button
              type="button"
              className="list-card"
              key={event.id}
              onClick={() => onSelect(event)}
            >
              <EventArt event={event} />
              <div className="list-content">
                <div>
                  <span className="event-label">{event.eyebrow}</span>
                  <h2>{event.title.replace('\n', ' ')}</h2>
                </div>
                <div className="list-facts">
                  <span>
                    <CalendarDays /> {event.date} · {event.time.split(' – ')[0]}
                  </span>
                  <span>
                    <MapPin /> {event.venue}, {event.area}
                  </span>
                </div>
                <div className="list-bottom">
                  <span>
                    <b>{event.price}</b> per person
                  </span>
                  <span className="list-ticket-link">
                    {event.spots
                      ? `${event.spots} spots left`
                      : 'Join waitlist'}{' '}
                    <ArrowRight />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="newsletter">
        <Sparkles />
        <h2>Good plans, delivered.</h2>
        <p>
          Be first to know about new drops, secret locations and last-minute
          tickets.
        </p>
        <form onSubmit={(e) => e.preventDefault()}>
          <input type="email" placeholder="you@email.com" required />
          <button>
            Join the list <ArrowRight />
          </button>
        </form>
      </section>
    </main>
  );
}

function Detail({ event, onBack }: { event: EventItem; onBack: () => void }) {
  return (
    <main className="detail-page">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft /> Back to events
      </button>
      <section className="detail-hero">
        <EventArt event={event} large />
        <div className="detail-intro">
          <span className="event-label">{event.eyebrow}</span>
          <h1>{event.title.replace('\n', ' ')}</h1>
          <p>{event.description}</p>
          <div className="detail-trust">
            <span>
              <ShieldCheck /> Hosted & facilitated
            </span>
            <span>
              <Users /> Come solo-friendly
            </span>
          </div>
        </div>
      </section>
      <section className="detail-body">
        <div className="detail-main">
          {(event.experienceTitle || event.experienceDescription) && (
            <div className="detail-section">
              <span className="section-num">THE EXPERIENCE</span>
              {event.experienceTitle && <h2>{event.experienceTitle}</h2>}
              {event.experienceDescription && (
                <p className="preserve-lines">{event.experienceDescription}</p>
              )}
              {event.schedule && (
                <div className="timeline preserve-lines">{event.schedule}</div>
              )}
            </div>
          )}
          {(event.hostName || event.hostDescription) && (
            <div className="detail-section">
              <span className="section-num">YOUR HOST</span>
              {event.hostName && <h2>{event.hostName}</h2>}
              {event.hostDescription && (
                <p className="preserve-lines">{event.hostDescription}</p>
              )}
            </div>
          )}
          {(event.goodToKnow || event.refundPolicy) && (
            <div className="detail-section">
              <span className="section-num">GOOD TO KNOW</span>
              {event.goodToKnow && (
                <p className="preserve-lines">{event.goodToKnow}</p>
              )}
              {event.refundPolicy && (
                <>
                  <h3>Refund policy</h3>
                  <p className="preserve-lines">{event.refundPolicy}</p>
                </>
              )}
            </div>
          )}
        </div>
        <aside className="ticket-panel">
          <span className="status-dot">● {event.status}</span>
          <div className="ticket-price">
            <strong>{event.price}</strong>
            <span>per person · all fees shown</span>
          </div>
          <div className="ticket-facts">
            <span>
              <CalendarDays />
              <b>{event.date}</b>
            </span>
            <span>
              <Clock3 />
              <b>{event.time}</b>
            </span>
            <span>
              <MapPin />
              <b>
                {event.venue}
                <small>{event.area}, Toronto</small>
              </b>
            </span>
          </div>
          <BuyButton event={event} />
          {event.spots > 0 && (
            <small className="spots">
              Only {event.spots} spots left · free cancellation for 24h
            </small>
          )}
          <div className="ticket-safe">
            <ShieldCheck />
            <span>
              <strong>Secure checkout</strong>Your ticket and QR code are sent
              to the email used at checkout.
            </span>
          </div>
        </aside>
      </section>
    </main>
  );
}

function BuyButton({ event }: { event: EventItem }) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function checkout() {
    if (!event.spots) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, quantity }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || 'Payment could not be started.');
      window.location.assign(payload.url);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Payment could not be started.',
      );
      setLoading(false);
    }
  }
  if (event.demo)
    return (
      <button className="primary-btn" disabled>
        Coming soon
      </button>
    );
  if (!event.spots)
    return (
      <button className="primary-btn" disabled>
        Sold out
      </button>
    );
  return (
    <>
      <div className="ticket-quantity">
        <label htmlFor="ticket-quantity">Tickets</label>
        <select
          id="ticket-quantity"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        >
          {Array.from({ length: Math.min(event.spots, 6) }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {index + 1}
            </option>
          ))}
        </select>
      </div>
      <button className="primary-btn" onClick={checkout} disabled={loading}>
        {loading ? (
          'Opening checkout…'
        ) : (
          <>
            Get tickets <Ticket />
          </>
        )}
      </button>
      {error && <small className="checkout-error">{error}</small>}
    </>
  );
}
function Footer() {
  return (
    <footer id="about">
      <div>
        <Brand />
        <p>
          Curated social experiences
          <br />
          made in Toronto.
        </p>
      </div>
      <div>
        <strong>Explore</strong>
        <a href="#events">Upcoming events</a>
        <a href="#why">Why ScanEvent</a>
        <a href="#host">Host with us</a>
      </div>
      <div>
        <strong>Community</strong>
        <a href="#about">Safety & conduct</a>
        <a href="#about">FAQs</a>
        <a href="#about" className="footer-external">
          Instagram <ArrowUpRight aria-hidden="true" />
        </a>
      </div>
      <div className="footer-city">
        TOR
        <br />
        <span>ON</span>TO
      </div>
      <small>© 2026 ScanEvent Inc. · Toronto, ON</small>
    </footer>
  );
}
export default function App() {
  const [events, setEvents] = useState<EventItem[]>(fallbackEvents);
  const [view, setView] = useState<'home' | 'explore' | 'detail'>('home');
  const [selected, setSelected] = useState<EventItem | null>(null);
  useEffect(() => {
    fetch('/api/events')
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => {
        if (!Array.isArray(payload.events)) return;
        const formatter = new Intl.DateTimeFormat('en-CA', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        });
        const tones = ['acid', 'coral', 'violet', 'blue'];
        setEvents(
          payload.events.map((event: EventRecord, index: number) => ({
            id: String(event.id),
            category: String(event.category || 'Social'),
            eyebrow: String(event.eyebrow || ''),
            title: String(event.title),
            date: formatter.format(new Date(`${String(event.date)}T12:00:00Z`)),
            time: `${String(event.startTime)}${event.endTime ? ` – ${String(event.endTime)}` : ''}`,
            venue: String(event.venue),
            area: String(event.area || ''),
            price: new Intl.NumberFormat('en-CA', {
              style: 'currency',
              currency: String(event.currency || 'CAD'),
            }).format(Number(event.priceCents || 0) / 100),
            status:
              Number(event.capacity) -
                Number(event.soldCount) -
                Number(event.reservedCount) >
              0
                ? 'Tickets available'
                : 'Sold out',
            spots: Math.max(
              0,
              Number(event.capacity) -
                Number(event.soldCount) -
                Number(event.reservedCount),
            ),
            tone: tones[index % tones.length],
            symbol: '✦',
            description: String(event.description || ''),
            experienceTitle: String(event.experienceTitle || ''),
            experienceDescription: String(event.experienceDescription || ''),
            schedule: String(event.schedule || ''),
            hostName: String(event.hostName || ''),
            hostDescription: String(event.hostDescription || ''),
            goodToKnow: String(event.goodToKnow || ''),
            refundPolicy: String(event.refundPolicy || ''),
            image: event.imageUrl ? String(event.imageUrl) : undefined,
          })),
        );
      })
      .catch(() => undefined);
  }, []);
  const go = (v: 'home' | 'explore' | 'detail') => {
    setView(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const select = (e: EventItem) => {
    setSelected(e);
    go('detail');
  };
  return (
    <div className="app-shell">
      <Header onHome={() => go('home')} onExplore={() => go('explore')} />
      {view === 'home' && (
        <Home
          onExplore={() => go('explore')}
          onSelect={select}
          events={events}
        />
      )}{' '}
      {view === 'explore' && <Explore onSelect={select} events={events} />}{' '}
      {view === 'detail' && selected && (
        <Detail event={selected} onBack={() => go('explore')} />
      )}
      <Footer />
    </div>
  );
}
