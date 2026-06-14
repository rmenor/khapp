
const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-for-development-only-1914';

export async function signSession(expireTime: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SESSION_SECRET);
  const dataData = encoder.encode(expireTime);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, dataData);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${expireTime}.${signatureHex}`;
}

export async function verifySession(cookieValue?: string): Promise<boolean> {
  if (!cookieValue) return false;
  const parts = cookieValue.split('.');
  if (parts.length !== 2) return false;
  const [expireTime, signatureHex] = parts;
  
  const expireNum = parseInt(expireTime);
  if (isNaN(expireNum) || expireNum < Date.now()) return false;
  
  const expectedSignature = await signSession(expireTime);
  return expectedSignature === cookieValue;
}
