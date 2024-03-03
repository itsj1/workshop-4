import { webcrypto } from "crypto";

// Function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

// Function to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  var buff = Buffer.from(base64, "base64");
  return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
}

// ################
// ### RSA keys ###
// ################

// Generates a pair of private / public RSA keys
type GenerateRsaKeyPair = {
  publicKey: webcrypto.CryptoKey;
  privateKey: webcrypto.CryptoKey;
};





export async function generateRsaKeyPair(): Promise<GenerateRsaKeyPair> {
  const keys = await webcrypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: { name: "SHA-256" },
    },
    true,
    ["encrypt", "decrypt"]
  );

  return {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
  };
}

// Export a crypto public key to a base64 string format
export async function exportPubKey(key: webcrypto.CryptoKey): Promise<string> {
  const exportedKey = await webcrypto.subtle.exportKey("spki", key);
  const exportedKeyBuffer = new Uint8Array(exportedKey);
  const exportedKeyBase64 = arrayBufferToBase64(exportedKeyBuffer);
  return exportedKeyBase64;
}

// Export a crypto private key to a base64 string format
export async function exportPrvKey(
  key: webcrypto.CryptoKey | null
): Promise<string | null> {
  if (!key) return null;
  const exportedKey = await webcrypto.subtle.exportKey("pkcs8", key);
  const exportedKeyBuffer = new Uint8Array(exportedKey);
  const exportedKeyBase64 = arrayBufferToBase64(exportedKeyBuffer);
  return exportedKeyBase64;
}

// Import a base64 string public key to its native format
export async function importPubKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  const importedKey = await webcrypto.subtle.importKey(
    "spki",
    keyBuffer,
    {
      name: "RSA-OAEP",
      hash: { name: "SHA-256" },
    },
    true,
    ["encrypt"]
  );
  return importedKey;
}


// Import a base64 string private key to its native format
export async function importPrvKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  const importedKey = await webcrypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    {
      name: "RSA-OAEP",
      hash: { name: "SHA-256" },
    },
    true,
    ["decrypt"]
  );
  return importedKey;
}

// Encrypt a message using an RSA public key
export async function rsaEncrypt(
  b64Data: string,
  strPublicKey: string
): Promise<string> {
  const publicKey = await importPubKey(strPublicKey);
  const dataBuffer = base64ToArrayBuffer(b64Data);
  const encryptedData = await webcrypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    dataBuffer
  );
  const encryptedDataB64 = arrayBufferToBase64(new Uint8Array(encryptedData));
  return encryptedDataB64;
}

// Decrypts a message using an RSA private key
export async function rsaDecrypt(
  data: string,
  privateKey: webcrypto.CryptoKey
): Promise<string> {
  const encryptedDataBuffer = base64ToArrayBuffer(data);
  const decryptedData = await webcrypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    encryptedDataBuffer
  );
  const decryptedDataB64 = arrayBufferToBase64(new Uint8Array(decryptedData));
  return decryptedDataB64;
}

// ######################
// ### Symmetric keys ###
// ######################

// Generates a random symmetric key
export async function createRandomSymmetricKey(): Promise<webcrypto.CryptoKey> {
  const key = await webcrypto.subtle.generateKey(
    {
      name: "AES-CBC",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );

  return key;
}

// Export a crypto symmetric key to a base64 string format
export async function exportSymKey(key: webcrypto.CryptoKey): Promise<string> {
  const exportedKey = await webcrypto.subtle.exportKey("raw", key);
  const exportedKeyBuffer = new Uint8Array(exportedKey);
  const exportedKeyBase64 = arrayBufferToBase64(exportedKeyBuffer);
  return exportedKeyBase64;
}

// Import a base64 string format to its crypto native format
export async function importSymKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  const importedKey = await webcrypto.subtle.importKey(
    "raw",
    keyBuffer,
    {
      name: "AES-CBC",
    },
    true,
    ["encrypt", "decrypt"]
  );
  return importedKey;
}

// Encrypt a message using a symmetric key
export async function symEncrypt(
  key: webcrypto.CryptoKey,
  data: string
): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encryptedData = await webcrypto.subtle.encrypt(
    {
      name: "AES-CBC",
      iv: iv,
    },
    key,
    dataBuffer
  );
  const encryptedDataB64 = arrayBufferToBase64(new Uint8Array(encryptedData));
  return arrayBufferToBase64(iv) + encryptedDataB64;
}

// Decrypt a message using a symmetric key
export async function symDecrypt(
  strKey: string,
  encryptedData: string
): Promise<string> {
  const key = await importSymKey(strKey);
  const iv = base64ToArrayBuffer(encryptedData.slice(0, 24));
  const encryptedDataBuffer = base64ToArrayBuffer(encryptedData.slice(24));
  const decryptedData = await webcrypto.subtle.decrypt(
    {
      name: "AES-CBC",
      iv: iv,
    },
    key,
    encryptedDataBuffer
  );
  const decoder = new TextDecoder();
  const decryptedDataString = decoder.decode(decryptedData);
  return decryptedDataString;
}