import type { PublicUser } from '@sams/shared';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'sams_auth_token';
const USER_KEY = 'sams_auth_user';

// In-memory fallback for web or environments where SecureStore is unavailable
const memoryStore: Record<string, string> = {};

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {
      memoryStore[key] = value;
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    memoryStore[key] = value;
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStore[key] ?? null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return memoryStore[key] ?? null;
  }
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {
      delete memoryStore[key];
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    delete memoryStore[key];
  }
}

export async function saveAuthToken(token: string): Promise<void> {
  await setItem(TOKEN_KEY, token);
}

export async function getAuthToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function removeAuthToken(): Promise<void> {
  await deleteItem(TOKEN_KEY);
}

export async function saveStoredUser(user: PublicUser): Promise<void> {
  await setItem(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser(): Promise<PublicUser | null> {
  const json = await getItem(USER_KEY);
  if (!json) return null;
  try {
    return JSON.parse(json) as PublicUser;
  } catch {
    return null;
  }
}

export async function removeStoredUser(): Promise<void> {
  await deleteItem(USER_KEY);
}
