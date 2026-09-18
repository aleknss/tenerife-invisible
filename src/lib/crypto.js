// Client-only. libsodium: keypair X25519 + sealed box.
import _sodium from "libsodium-wrappers-sumo";

let sodiumPromise;

function getSodium() {
  if (!sodiumPromise) {
    sodiumPromise = _sodium.ready.then(() => _sodium);
  }
  return sodiumPromise;
}

export async function generateKeypair() {
  const sodium = await getSodium();
  return sodium.crypto_box_keypair(); // { publicKey, privateKey, keyType }
}

export async function publicKeyFromPrivate(privateKey) {
  const sodium = await getSodium();
  return sodium.crypto_scalarmult_base(privateKey);
}

export async function encodePublicKey(publicKey) {
  const sodium = await getSodium();
  return sodium.to_base64(publicKey, sodium.base64_variants.ORIGINAL);
}

export async function decodePublicKey(publicKeyB64) {
  const sodium = await getSodium();
  return sodium.from_base64(publicKeyB64, sodium.base64_variants.ORIGINAL);
}

// message: string. recipientPublicKey: Uint8Array. Devuelve ciphertext en base64.
export async function sealString(message, recipientPublicKey) {
  const sodium = await getSodium();
  const msg = sodium.from_string(message);
  const ciphertext = sodium.crypto_box_seal(msg, recipientPublicKey);
  return sodium.to_base64(ciphertext, sodium.base64_variants.ORIGINAL);
}

// ciphertextB64: base64. publicKey/privateKey: Uint8Array. Devuelve string.
export async function openString(ciphertextB64, publicKey, privateKey) {
  const sodium = await getSodium();
  const ciphertext = sodium.from_base64(
    ciphertextB64,
    sodium.base64_variants.ORIGINAL,
  );
  const message = sodium.crypto_box_seal_open(ciphertext, publicKey, privateKey);
  return sodium.to_string(message);
}
