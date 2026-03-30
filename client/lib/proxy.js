const BACKEND_URL = process.env.BACKEND_URL;

/**
 * Extract the admin_session cookie and forward it as-is to the backend.
 *
 * The cookie now contains "token:signature" (HMAC-signed), which is exactly
 * the format the Express backend's verifySessionToken() expects.
 * No re-signing is required.
 */
function getAdminSessionCookie(cookieHeader) {
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );

  const signedToken = cookies['admin_session'];
  if (!signedToken) return null;

  return `admin_session=${signedToken}`;
}

export async function proxyGET(endpoint, requestHeaders = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };

  const rawCookie = requestHeaders.cookie || requestHeaders.get?.('cookie');
  const sessionCookie = getAdminSessionCookie(rawCookie);
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
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

  const rawCookie = requestHeaders.cookie || requestHeaders.get?.('cookie');
  const sessionCookie = getAdminSessionCookie(rawCookie);
  if (sessionCookie) {
    options.headers['Cookie'] = sessionCookie;
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

  const rawCookie = requestHeaders.cookie || requestHeaders.get?.('cookie');
  const sessionCookie = getAdminSessionCookie(rawCookie);
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
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
