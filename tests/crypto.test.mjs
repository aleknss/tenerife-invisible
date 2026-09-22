import test from "node:test";
import assert from "node:assert/strict";
import {
  generateKeypair,
  publicKeyFromPrivate,
  encodePublicKey,
  decodePublicKey,
  sealString,
  openString,
} from "../src/lib/crypto.js";

test("generateKeypair: claves de 32 bytes", async () => {
  const { publicKey, privateKey } = await generateKeypair();
  assert.ok(publicKey instanceof Uint8Array);
  assert.ok(privateKey instanceof Uint8Array);
  assert.equal(publicKey.length, 32);
  assert.equal(privateKey.length, 32);
});

test("publicKeyFromPrivate deriva la misma pública", async () => {
  const { publicKey, privateKey } = await generateKeypair();
  const derived = await publicKeyFromPrivate(privateKey);
  assert.deepEqual(derived, publicKey);
});

test("encode/decode de la pública: base64 32 bytes roundtrip", async () => {
  const { publicKey } = await generateKeypair();
  const b64 = await encodePublicKey(publicKey);
  assert.match(b64, /^[A-Za-z0-9+/]+={0,2}$/);
  assert.equal(Buffer.from(b64, "base64").length, 32);
  const back = await decodePublicKey(b64);
  assert.deepEqual(back, publicKey);
});

test("seal/open roundtrip con la clave correcta", async () => {
  const { publicKey, privateKey } = await generateKeypair();
  const msg = "550e8400-e29b-41d4-a716-446655440000";
  const ct = await sealString(msg, publicKey);
  const out = await openString(ct, publicKey, privateKey);
  assert.equal(out, msg);
});

test("roundtrip con acentos y unicode", async () => {
  const { publicKey, privateKey } = await generateKeypair();
  const msg = "José Ángel · Ñoño · 🎁";
  const ct = await sealString(msg, publicKey);
  assert.equal(await openString(ct, publicKey, privateKey), msg);
});

test("ciphertext = mensaje + 48 bytes (SEALBYTES)", async () => {
  const { publicKey } = await generateKeypair();
  const msg = "hola";
  const ct = await sealString(msg, publicKey);
  const raw = Buffer.from(ct, "base64");
  assert.equal(raw.length, Buffer.byteLength(msg) + 48);
});

test("seal es no determinista (clave efímera por mensaje)", async () => {
  const { publicKey } = await generateKeypair();
  const a = await sealString("mismo", publicKey);
  const b = await sealString("mismo", publicKey);
  assert.notEqual(a, b);
});

test("open falla con clave privada ajena", async () => {
  const alice = await generateKeypair();
  const bob = await generateKeypair();
  const ct = await sealString("secreto", alice.publicKey);
  await assert.rejects(openString(ct, bob.publicKey, bob.privateKey));
});

test("open falla con ciphertext corrupto", async () => {
  const { publicKey, privateKey } = await generateKeypair();
  const ct = await sealString("secreto", publicKey);
  const corrupt = Buffer.from(ct, "base64");
  corrupt[0] ^= 0xff;
  await assert.rejects(
    openString(corrupt.toString("base64"), publicKey, privateKey),
  );
});
