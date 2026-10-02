export type EventSite = 'scanevent' | 'n8up';

export const currentSite: EventSite = 'scanevent';

export function isEventSite(value: unknown): value is EventSite {
  return value === 'scanevent' || value === 'n8up';
}

// Records created before the sites were separated belong to ScanEvent.
export function eventSite(record?: { site?: unknown }): EventSite | null {
  if (record?.site == null) return 'scanevent';
  return isEventSite(record.site) ? record.site : null;
}

export function belongsToCurrentSite(record?: { site?: unknown }): boolean {
  return eventSite(record) === currentSite;
}
