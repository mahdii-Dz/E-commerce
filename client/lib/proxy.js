// src/lib/proxy.js
const BACKEND_URL = process.env.BACKEND_URL;


export async function proxyGET(endpoint) {
  const url = `${BACKEND_URL}${endpoint}`;
  console.log(url);
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Backend error: ${error}`);
  }
  
  return res.json();
}

/**
 * Proxy POST/PUT/DELETE to Express backend
 */
export async function proxyRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
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

export async function proxyFormData(endpoint, formData) {
  const url = `${BACKEND_URL}${endpoint}`;
  console.log(url);
  
  
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    // No headers! FormData sets its own Content-Type with boundary
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Backend error: ${error}`);
  }
  
  return res.json();
}