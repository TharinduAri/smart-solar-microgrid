// Single place where the web client talks to the C# Web API.
// Every screen goes through this helper, so no page ever touches a database.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5205';
const TOKEN_KEY = 'ss_token';

// Reads the JWT saved at login so it can be attached to each request.
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Stores or clears the JWT when the user logs in or out.
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Performs the HTTP call and unwraps either the JSON body or the API error message.
async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return null;

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message ?? `Request failed with status ${response.status}`);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
