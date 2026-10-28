const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const EXPIRE_KEY = 'expiresAt';

export function saveLogin(data) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  localStorage.setItem(EXPIRE_KEY, String(data.expiresAt));
}

export function clearLogin() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRE_KEY);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(EXPIRE_KEY) || 0);
  if (!token || expiresAt < Date.now()) {
    clearLogin();
    return false;
  }
  return true;
}

export async function request(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch('/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    clearLogin();
    location.href = '/login';
    throw new Error('请先登录');
  }
  if (!res.ok) throw new Error(data.message || '请求失败');

  return data;
}
