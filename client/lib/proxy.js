/**
 * Proxy helpers — Next.js server → Express backend
 *
 * Required env vars on BOTH Netlify and Render:
 *   SESSION_SECRET  — shared secret used for server-to-server auth
 *   ADMIN_PASS      — fallback if SESSION_SECRET is not set
 *
 * The Authorization: Bearer header is used so the backend can verify
 * that every request originates from the trusted Next.js server, without
 * relying on per-request cookie HMAC forwarding.
 */

const BACKEND_URL = process.env.BACKEND_URL;
const INTERNAL_SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASS;

function buildServerHeaders(extra = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extra,
  };

  if (INTERNAL_SECRET) {
    headers['Authorization'] = `Bearer ${INTERNAL_SECRET}`;
  }

  return headers;
}

export async function proxyGET(endpoint, _requestHeaders = {}) {
  if (!BACKEND_URL) {
    throw new Error('BACKEND_URL environment variable is not set.');
  }

  const res = await fetch(`${BACKEND_URL}${endpoint}`, {
    headers: buildServerHeaders(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Backend error (${res.status}): ${error}`);
  }

  return res.json();
}

/**
 * Proxy POST / PUT / DELETE to Express backend
 */
export async function proxyRequest(method, endpoint, body = null, _requestHeaders = {}) {
  if (!BACKEND_URL) {
    throw new Error('BACKEND_URL environment variable is not set.');
  }

  const options = {
    method,
    headers: buildServerHeaders(),
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BACKEND_URL}${endpoint}`, options);

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Backend error (${res.status}): ${error}`);
  }

  return res.json();
}

export async function proxyFormData(endpoint, formData, _requestHeaders = {}) {
  if (!BACKEND_URL) {
    throw new Error('BACKEND_URL environment variable is not set.');
  }

  const headers = {};
  if (INTERNAL_SECRET) {
    headers['Authorization'] = `Bearer ${INTERNAL_SECRET}`;
  }

  const res = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
    headers,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Backend error (${res.status}): ${error}`);
  }

  return res.json();
}
