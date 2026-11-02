import { Product, StoreSettings } from '../types';
import { INITIAL_PRODUCTS, INITIAL_STORE_SETTINGS } from '../data/catalogData';

const LS_PRODUCTS_KEY = 'pz_studio_products_v1';
const LS_OVERRIDES_KEY = 'pz_studio_product_overrides_v2';
const LS_SETTINGS_KEY = 'pz_studio_settings_v1';
const IDB_NAME = 'pz_studio_catalog_db_v1';
const IDB_STORE = 'product_overrides';
const IDB_KEY = 'catalog_overrides_state';
const IDB_SETTINGS_KEY = 'store_settings_state';

export interface ProductOverridesState {
  byId: Record<string, Product>;
  deletedIds: string[];
  updatedAt: number;
}

// 1. Synchronous in-memory cache so signing out or switching pages never loses state
let memoryOverrides: ProductOverridesState | null = null;
let memorySettings: StoreSettings | null = null;

export function sanitizeProductData<T>(input: T): T {
  return JSON.parse(JSON.stringify(input)) as T;
}

function openCatalogDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function loadOverridesFromIndexedDB(): Promise<ProductOverridesState | null> {
  const db = await openCatalogDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const getReq = store.get(IDB_KEY);
      getReq.onsuccess = () => {
        const result = getReq.result as ProductOverridesState | undefined;
        if (result && result.byId && typeof result.byId === 'object') {
          if (!memoryOverrides || result.updatedAt >= memoryOverrides.updatedAt) {
            memoryOverrides = result;
          }
          resolve(result);
        } else {
          resolve(null);
        }
      };
      getReq.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveOverridesToIndexedDB(state: ProductOverridesState): Promise<void> {
  const db = await openCatalogDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(state, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadSettingsFromIndexedDB(): Promise<StoreSettings | null> {
  const db = await openCatalogDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const getReq = store.get(IDB_SETTINGS_KEY);
      getReq.onsuccess = () => {
        const result = getReq.result as StoreSettings | undefined;
        if (result && typeof result === 'object') {
          const merged: StoreSettings = {
            ...INITIAL_STORE_SETTINGS,
            ...result,
          };
          if (
            !memorySettings ||
            (merged.updatedAt || 0) >= (memorySettings.updatedAt || 0)
          ) {
            memorySettings = merged;
          }
          resolve(merged);
        } else {
          resolve(null);
        }
      };
      getReq.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveSettingsToIndexedDB(settings: StoreSettings): Promise<void> {
  const db = await openCatalogDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(settings, IDB_SETTINGS_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function loadInitialSettingsSync(): StoreSettings {
  if (memorySettings) {
    return memorySettings;
  }
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoreSettings>;
      const merged: StoreSettings = {
        ...INITIAL_STORE_SETTINGS,
        ...parsed,
      };
      memorySettings = merged;
      return merged;
    }
  } catch {
    // ignore
  }
  return { ...INITIAL_STORE_SETTINGS };
}

export function persistAdminSettingsChanges(nextSettings: StoreSettings): StoreSettings {
  const stamped: StoreSettings = sanitizeProductData({
    ...INITIAL_STORE_SETTINGS,
    ...nextSettings,
    updatedAt: Date.now(),
  });
  memorySettings = stamped;
  void saveSettingsToIndexedDB(stamped);
  try {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(stamped));
  } catch {
    try {
      localStorage.removeItem(LS_PRODUCTS_KEY);
      localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(stamped));
    } catch {
      // IndexedDB & memorySettings still preserve full settings
    }
  }
  return stamped;
}

export function mergeRemoteStoreSettings(remote: Partial<StoreSettings>): StoreSettings {
  const local = loadInitialSettingsSync();
  const remoteTs = typeof remote.updatedAt === 'number' ? remote.updatedAt : 0;
  const localTs = typeof local.updatedAt === 'number' ? local.updatedAt : 0;

  // If local settings were updated more recently by Admin, keep local edits priority
  const merged: StoreSettings =
    localTs > remoteTs
      ? { ...INITIAL_STORE_SETTINGS, ...remote, ...local }
      : { ...INITIAL_STORE_SETTINGS, ...local, ...remote };

  memorySettings = merged;
  void saveSettingsToIndexedDB(merged);
  try {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
  return merged;
}

export function loadProductOverridesSync(): ProductOverridesState {
  if (memoryOverrides) {
    return memoryOverrides;
  }
  try {
    const raw = localStorage.getItem(LS_OVERRIDES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProductOverridesState>;
      const loaded: ProductOverridesState = {
        byId: parsed.byId && typeof parsed.byId === 'object' ? parsed.byId : {},
        deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
      };
      memoryOverrides = loaded;
      return loaded;
    }
  } catch {
    // ignore
  }
  return { byId: {}, deletedIds: [], updatedAt: 0 };
}

export function registerRemoteProductOverrides(
  remoteById: Record<string, Product>
): ProductOverridesState {
  const current = loadProductOverridesSync();
  const mergedById: Record<string, Product> = {
    ...remoteById,
    ...current.byId,
  };
  const nextState: ProductOverridesState = {
    byId: mergedById,
    deletedIds: current.deletedIds,
    updatedAt: Math.max(current.updatedAt, Date.now()),
  };
  memoryOverrides = nextState;
  try {
    localStorage.setItem(LS_OVERRIDES_KEY, JSON.stringify(nextState));
  } catch {
    // ignore quota error
  }
  void saveOverridesToIndexedDB(nextState);
  return nextState;
}

export function persistAdminCatalogChanges(nextProducts: Product[]): ProductOverridesState {
  const cleanProducts = sanitizeProductData(nextProducts);
  const initialMap = new Map(INITIAL_PRODUCTS.map((p) => [p.id, p]));
  const nextIds = new Set(cleanProducts.map((p) => p.id));
  const deletedIds = INITIAL_PRODUCTS.filter((p) => !nextIds.has(p.id)).map((p) => p.id);
  const byId: Record<string, Product> = {};

  cleanProducts.forEach((p) => {
    const base = initialMap.get(p.id);
    if (
      !base ||
      (p.imageUrl || '') !== (base.imageUrl || '') ||
      p.name !== base.name ||
      p.basePrice !== base.basePrice ||
      p.minOrderQty !== base.minOrderQty ||
      p.inStock !== base.inStock ||
      p.featured !== base.featured
    ) {
      byId[p.id] = p;
    }
  });

  const nextState: ProductOverridesState = {
    byId,
    deletedIds,
    updatedAt: Date.now(),
  };

  // 1. Save in memory immediately
  memoryOverrides = nextState;

  // 2. Save in IndexedDB (no 5MB limit)
  void saveOverridesToIndexedDB(nextState);

  // 3. Save in localStorage (with automatic space recovery if near 5MB quota)
  try {
    localStorage.setItem(LS_OVERRIDES_KEY, JSON.stringify(nextState));
  } catch {
    try {
      // Free duplicate space from LS_PRODUCTS_KEY first so overrides always fit
      localStorage.removeItem(LS_PRODUCTS_KEY);
      localStorage.setItem(LS_OVERRIDES_KEY, JSON.stringify(nextState));
    } catch {
      // IndexedDB & memoryOverrides still hold the full data
    }
  }

  try {
    localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(cleanProducts));
  } catch {
    // If full catalog with images exceeds LS quota, store lightweight catalog in LS_PRODUCTS_KEY
    try {
      const lightweight = cleanProducts.map((item) => {
        if (item.imageUrl?.startsWith('data:')) {
          const copy = { ...item };
          delete copy.imageUrl;
          return copy;
        }
        return item;
      });
      localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(lightweight));
    } catch {
      // ignore
    }
  }

  return nextState;
}

export function buildCatalogWithOverrides(
  baseList: Product[],
  extraOverridesState?: ProductOverridesState | null
): Product[] {
  const localState = loadProductOverridesSync();
  const activeState =
    extraOverridesState && extraOverridesState.updatedAt >= localState.updatedAt
      ? {
          byId: { ...localState.byId, ...extraOverridesState.byId },
          deletedIds: extraOverridesState.deletedIds,
          updatedAt: extraOverridesState.updatedAt,
        }
      : {
          byId: { ...(extraOverridesState?.byId || {}), ...localState.byId },
          deletedIds: localState.deletedIds,
          updatedAt: localState.updatedAt,
        };

  const deletedSet = new Set(activeState.deletedIds);
  const combinedOverrides = activeState.byId;

  const seenIds = new Set<string>();
  const merged: Product[] = [];

  // 1. Prepend any newly created custom admin products first
  Object.values(combinedOverrides).forEach((customProd) => {
    const existsInBase = baseList.some((b) => b.id === customProd.id);
    if (!existsInBase && !deletedSet.has(customProd.id)) {
      seenIds.add(customProd.id);
      merged.push(customProd);
    }
  });

  // 2. Map base products and overlay any saved admin changes (like custom imageUrl)
  baseList.forEach((item) => {
    if (deletedSet.has(item.id) || seenIds.has(item.id)) return;
    seenIds.add(item.id);
    const override = combinedOverrides[item.id];
    if (override) {
      const nextItem: Product = {
        ...item,
        ...override,
      };
      if (!override.imageUrl) {
        delete nextItem.imageUrl;
      }
      merged.push(nextItem);
    } else {
      merged.push(item);
    }
  });

  return merged;
}

export function loadInitialCatalogSync(): Product[] {
  try {
    const raw = localStorage.getItem(LS_PRODUCTS_KEY);
    const parsed: Product[] = raw ? JSON.parse(raw) : INITIAL_PRODUCTS;
    const base = Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PRODUCTS;
    return buildCatalogWithOverrides(base);
  } catch {
    return buildCatalogWithOverrides(INITIAL_PRODUCTS);
  }
}
