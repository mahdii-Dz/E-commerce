import crypto from 'crypto';

const BACKEND_URL = process.env.BACKEND_URL;
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASS;

/**
 * Sign a session token with HMAC for backend verification.
 */
function signSessionToken(token) {
  if (!token || !SESSION_SECRET) return token;
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(token)
    .digest('hex');
  return `${token}:${signature}`;
}

/**
 * Extract and sign the admin session cookie for backend verification.
 */
function getSignedSessionCookie(cookieHeader) {
  if (!cookieHeader || !SESSION_SECRET) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );

  const rawToken = cookies['admin_session'];
  if (!rawToken) return null;

  // Sign the token for backend verification
  const signedToken = signSessionToken(rawToken);
  return `admin_session=${signedToken}`;
}

export async function proxyGET(endpoint, requestHeaders = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };

  // Sign and forward admin session cookie if present
  const rawCookie = requestHeaders.cookie || requestHeaders.get?.('cookie');
  const signedCookie = getSignedSessionCookie(rawCookie);
  if (signedCookie) {
    headers['Cookie'] = signedCookie;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Backend error: ${error}`);
  }

  return res.json();
}

/**
 * Proxy POST/PUT/DELETE to Express backend
 */
export async function proxyRequest(method, endpoint, body = null, requestHeaders = {}) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Sign and forward admin session cookie if present
  const rawCookie = requestHeaders.cookie || requestHeaders.get?.('cookie');
  const signedCookie = getSignedSessionCookie(rawCookie);
  if (signedCookie) {
    options.headers['Cookie'] = signedCookie;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BACKEND_URL}${endpoint}`, options);

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Backend error: ${error}`);
  }

  return res.json();
}

export async function proxyFormData(endpoint, formData, requestHeaders = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  const headers = {};

  // Sign and forward admin session cookie if present
  const rawCookie = requestHeaders.cookie || requestHeaders.get?.('cookie');
  const signedCookie = getSignedSessionCookie(rawCookie);
  if (signedCookie) {
    headers['Cookie'] = signedCookie;
  }

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    headers,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Backend error: ${error}`);
  }

  return res.json();
}
