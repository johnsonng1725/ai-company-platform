import * as SecureStore from 'expo-secure-store'

export const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://ai-company-platform.onrender.com'

export async function getToken(): Promise<string> {
  return (await SecureStore.getItemAsync('token')) ?? ''
}

export async function setToken(t: string) {
  await SecureStore.setItemAsync('token', t)
}

export async function clearToken() {
  await SecureStore.deleteItemAsync('token')
}

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await getToken()
  return fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...opts.headers,
    },
  })
}
