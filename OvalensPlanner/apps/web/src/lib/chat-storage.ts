/**
 * Chat localStorage key prefix. Used by useChat for persistence and by
 * clearAllChatStorage on sign out so the next login gets a fresh chat.
 */
export const CHAT_STORAGE_PREFIX = "helio:chat:";

/**
 * Clears all chat-related localStorage so the next login gets a fresh chat.
 * Called on sign out (and when auth state becomes null in other tabs).
 *
 * Edge cases:
 * - SSR / no window: no-op.
 * - localStorage disabled (private mode, quota): no-op (try/catch).
 * - Safe to call multiple times (idempotent).
 */
export function clearAllChatStorage(): void {
  try {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CHAT_STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Private mode, quota, or security error — avoid breaking sign-out flow
  }
}
