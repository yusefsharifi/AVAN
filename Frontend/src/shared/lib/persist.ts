// Thin wrapper so all module stores persist the same way, and so we have
// one place to implement "Export Data" / "Import Data" across modules.

export const STORAGE_PREFIX = "idop";

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}:${key}`, JSON.stringify(value));
  } catch {
    // localStorage can throw in private-browsing / quota-exceeded cases;
    // the app should keep working in-memory even if persistence fails.
  }
}

// Zustand v4 persist() "storage" adapter backed by the helpers above.
export const zustandLocalStorage = {
  getItem: (name: string) => {
    const value = localStorage.getItem(`${STORAGE_PREFIX}:${name}`);
    return value;
  },
  setItem: (name: string, value: string) => {
    localStorage.setItem(`${STORAGE_PREFIX}:${name}`, value);
  },
  removeItem: (name: string) => {
    localStorage.removeItem(`${STORAGE_PREFIX}:${name}`);
  },
};

// Dumps every module's persisted slice into one JSON file the user can save,
// and restores from that same shape. Keys must match each store's
// persist({ name: ... }) name.
const KNOWN_STORE_KEYS = ["hr-store", "finance-store", "inventory-store", "production-store", "procurement-store"];

export function exportAllData(): string {
  const dump: Record<string, unknown> = {};
  for (const key of KNOWN_STORE_KEYS) {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
    if (raw) dump[key] = JSON.parse(raw);
  }
  return JSON.stringify(dump, null, 2);
}

export function importAllData(json: string): void {
  const parsed = JSON.parse(json) as Record<string, unknown>;
  for (const key of KNOWN_STORE_KEYS) {
    if (parsed[key] !== undefined) {
      localStorage.setItem(`${STORAGE_PREFIX}:${key}`, JSON.stringify(parsed[key]));
    }
  }
}
