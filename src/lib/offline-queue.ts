"use client";

const DB_NAME = "tpt-offline";
const DB_VERSION = 1;

type StoreName = "field-contacts" | "panics";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("field-contacts")) {
        db.createObjectStore("field-contacts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("panics")) {
        db.createObjectStore("panics", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function put(store: StoreName, record: object): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function getAll<T>(store: StoreName): Promise<T[]> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      }),
  );
}

function remove(store: StoreName, id: string): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export interface QueuedFieldContact {
  id: string;
  contactType: string;
  contactDate: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  subjectName?: string;
  subjectDob?: string;
  subjectIdNumber?: string;
  vehiclePlate?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  outcome?: string;
  notes?: string;
  queuedAt: number;
}

export interface QueuedPanic {
  id: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  queuedAt: number;
}

export const offlineQueue = {
  async addFieldContact(data: Omit<QueuedFieldContact, "id" | "queuedAt">) {
    const record: QueuedFieldContact = {
      ...data,
      id: crypto.randomUUID(),
      queuedAt: Date.now(),
    };
    await put("field-contacts", record);
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if ("sync" in reg) await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register("field-contact-sync");
    }
    return record.id;
  },

  async addPanic(data: Omit<QueuedPanic, "id" | "queuedAt">) {
    const record: QueuedPanic = {
      ...data,
      id: crypto.randomUUID(),
      queuedAt: Date.now(),
    };
    await put("panics", record);
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if ("sync" in reg) await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register("panic-sync");
    }
    return record.id;
  },

  getFieldContacts: () => getAll<QueuedFieldContact>("field-contacts"),
  getPanics: () => getAll<QueuedPanic>("panics"),
  removeFieldContact: (id: string) => remove("field-contacts", id),
  removePanic: (id: string) => remove("panics", id),
};
