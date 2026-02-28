export type ApiFetchInit = RequestInit & {
  token?: string | null;
};

/**
 * Fetch the backend API. Uses relative /api/* so Next.js rewrites to the backend.
 * Adds Authorization: Bearer when token is provided.
 */
export async function apiFetch(
  path: string,
  init?: ApiFetchInit
): Promise<Response> {
  const { token, ...rest } = init ?? {};
  const headers = new Headers(rest?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(path, { ...rest, headers });
}
