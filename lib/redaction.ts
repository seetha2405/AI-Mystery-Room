export function redactSpoiler(text: string, culpritName?: string) {
  if (!culpritName) {
    return text;
  }

  return text.replace(new RegExp(culpritName, 'gi'), '[REDACTED]');
}

export function ensureNoSpoilerInPublicFields<T extends Record<string, unknown>>(obj: T, culpritName?: string): T {
  if (!culpritName) {
    return obj;
  }

  const result = { ...obj } as Record<string, unknown>;

  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(walk);
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, walk(entry)]),
      );
    }

    if (typeof value === 'string') {
      return redactSpoiler(value, culpritName);
    }

    return value;
  };

  return walk(result) as T;
}
