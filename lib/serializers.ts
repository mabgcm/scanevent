import type { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';

function serializeValue(input: unknown): unknown {
  if (
    input &&
    typeof input === 'object' &&
    'toDate' in input &&
    typeof input.toDate === 'function'
  ) {
    return input.toDate().toISOString();
  }
  if (Array.isArray(input)) return input.map(serializeValue);
  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, nested]) => [
        key,
        serializeValue(nested),
      ]),
    );
  }
  return input;
}

export function serializeDoc(snapshot: DocumentSnapshot<DocumentData>) {
  return {
    id: snapshot.id,
    ...(serializeValue(snapshot.data() || {}) as Record<string, unknown>),
  };
}
