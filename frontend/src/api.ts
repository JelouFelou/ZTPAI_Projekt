export interface Category {
  id: string;
  name: string;
  description: string | null;
}

export interface Game {
  id: string;
  title: string;
  description: string | null;
  minPlayers: number;
  maxPlayers: number;
  recommendedAge: number;
  durationMinutes: number;
  categoryId: string;
  category: Category;
  availableCopies: number;
}

export interface PaginatedGames {
  data: Game[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "USER" | "ADMIN";
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

export interface GameCopy {
  id: string;
  inventoryCode: string;
  gameId: string;
  isAvailable: boolean;
}

export interface Loan {
  id: string;
  status: "ACTIVE" | "RETURNED";
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  gameCopy: {
    id: string;
    inventoryCode: string;
    game: { id: string; title: string };
  };
}

export interface PaginatedLoans {
  data: Loan[];
  pagination: PaginatedGames["pagination"];
}

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(
  /\/$/,
  "",
);

async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ApiError(
      "Nie można połączyć się z API. Sprawdź, czy backend jest uruchomiony.",
      0,
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      response.status === 404
        ? "Nie znaleziono wskazanej gry."
        : response.status >= 500
          ? "Serwer chwilowo nie odpowiada. Spróbuj ponownie."
          : typeof body?.error?.message === "string"
            ? body.error.message
            : "Nie udało się pobrać danych.";
    throw new ApiError(message, response.status);
  }
  if (body === null)
    throw new ApiError(
      "Serwer zwrócił nieprawidłową odpowiedź.",
      response.status,
    );
  return body as T;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      "Nie można połączyć się z API. Sprawdź, czy backend jest uruchomiony.",
      0,
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const details = body?.error?.details;
    const serverMessage = body?.error?.message;
    const message =
      response.status === 401
        ? options.token
          ? "Sesja wygasła. Zaloguj się ponownie."
          : "Nieprawidłowy adres e-mail lub hasło."
        : response.status === 409 && path === "/auth/register"
          ? "Konto z tym adresem e-mail już istnieje."
          : response.status === 409 && path === "/loans"
            ? "Nie można wypożyczyć gry. Sprawdź swoje aktywne wypożyczenia i dostępność egzemplarza."
            : response.status === 409 && path.endsWith("/return")
              ? "To wypożyczenie zostało już zwrócone."
              : response.status === 404 && path.startsWith("/loans")
                ? "Nie znaleziono wypożyczenia. Odśwież listę."
                : response.status >= 500
                  ? "Serwer chwilowo nie odpowiada. Spróbuj ponownie."
                  : Array.isArray(details)
                    ? `Sprawdź wprowadzone dane: ${details.join("; ")}`
                    : typeof serverMessage === "string"
                      ? serverMessage
                      : "Nie udało się wykonać operacji.";
    throw new ApiError(message, response.status);
  }
  if (body === null)
    throw new ApiError(
      "Serwer zwrócił nieprawidłową odpowiedź.",
      response.status,
    );
  return body as T;
}

export const getCategories = (signal: AbortSignal) =>
  getJson<Category[]>("/categories", signal);
export const getGames = (search: string, signal: AbortSignal) =>
  getJson<PaginatedGames>(`/games${search}`, signal);
export const getGame = (id: string, signal: AbortSignal) =>
  getJson<Game>(`/games/${encodeURIComponent(id)}`, signal);
