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

export const getCategories = (signal: AbortSignal) =>
  getJson<Category[]>("/categories", signal);
export const getGames = (search: string, signal: AbortSignal) =>
  getJson<PaginatedGames>(`/games${search}`, signal);
export const getGame = (id: string, signal: AbortSignal) =>
  getJson<Game>(`/games/${encodeURIComponent(id)}`, signal);
