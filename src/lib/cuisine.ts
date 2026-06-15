// Local cuisine preference per user + date (no DB column needed).

const key = (userId: string, date: string) => `cuisine:${userId}:${date}`;

export const getCuisine = (userId: string, date: string): string | null => {
  try {
    return localStorage.getItem(key(userId, date));
  } catch {
    return null;
  }
};

export const setCuisine = (userId: string, date: string, value: string | null) => {
  try {
    if (!value) localStorage.removeItem(key(userId, date));
    else localStorage.setItem(key(userId, date), value);
  } catch {
    // ignore
  }
  return value;
};
