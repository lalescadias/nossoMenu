let csrf = "";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  if (method !== "GET" && !csrf) {
    const response = await fetch("/api/auth/csrf", {
      credentials: "same-origin",
    });
    if (!response.ok)
      throw new Error("Não foi possível estabelecer uma ligação segura.");
    csrf = (await response.json()).token;
  }
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(method !== "GET" ? { "X-XSRF-TOKEN": csrf } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Sem ligação ao servidor. Verifique a sua ligação e tente novamente.",
    );
  }
  if (!response.ok) {
    if (response.status === 403) csrf = "";
    let message =
      response.status === 401
        ? "A sua sessão terminou. Entre novamente."
        : "Não foi possível concluir. Tente novamente.";
    try {
      const error = await response.json();
      message = error.message || message;
    } catch {}
    throw new ApiError(response.status, message);
  }
  if (path.startsWith("/auth/") && method !== "GET") csrf = "";
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function apiAll<T>(path: string, size = 100): Promise<T[]> {
  const result: T[] = [];
  for (let page = 0; ; page++) {
    const rows = await api<T[]>(
      `${path}${path.includes("?") ? "&" : "?"}page=${page}${path === "/activity" ? "" : `&size=${size}`}`,
    );
    result.push(...rows);
    if (rows.length < size) return result;
  }
}
