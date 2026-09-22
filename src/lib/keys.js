"use client";

// Client-only. privateKey en IndexedDB, nunca sale del dispositivo.
import { generateKeypair, publicKeyFromPrivate } from "./crypto";

const DB_NAME = "amigo-invisible";
const STORE_NAME = "keys";
const KEY_NAME = "privateKey";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getPrivateKey(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(KEY_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function putPrivateKey(db, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, KEY_NAME);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadPrivateKey() {
  const db = await openDb();
  return getPrivateKey(db);
}

// Devuelve { privateKey, publicKey, isNew }.
// Carga la clave existente o genera un keypair nuevo y lo guarda.
export async function ensureKeys() {
  const privateKey = await loadPrivateKey();
  if (privateKey) {
    const publicKey = await publicKeyFromPrivate(privateKey);
    return { privateKey, publicKey, isNew: false };
  }
  const keypair = await generateKeypair();
  const db = await openDb();
  await putPrivateKey(db, keypair.privateKey);
  return {
    privateKey: keypair.privateKey,
    publicKey: keypair.publicKey,
    isNew: true,
  };
}
