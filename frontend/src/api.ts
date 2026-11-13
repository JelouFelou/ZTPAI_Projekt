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
  game: { id: string; title: string };
  status: "AVAILABLE" | "MAINTENANCE" | "RETIRED";
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
  readonly code: string | null;
  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(
  /\/$/,
  "",
);

function errorMessage(
  status: number,
  path: string,
  method: string,
  body: unknown,
  hasToken: boolean,
): string {
  const envelope = body as {
    error?: { message?: string; details?: string[] };
  } | null;
  const serverMessage = envelope?.error?.message;
  if (status === 401)
    return hasToken
      ? "Sesja wygasła. Zaloguj się ponownie."
      : "Nieprawidłowy adres e-mail lub hasło.";
  if (status === 403) return "Nie masz uprawnień do wykonania tej operacji.";
  if (status === 404)
    return path.startsWith("/games/") && method === "GET"
      ? "Nie znaleziono wskazanej gry."
      : "Nie znaleziono wpisu. Odśwież dane i spróbuj ponownie.";
  if (status === 409) {
    if (path === "/auth/register")
      return "Konto z tym adresem e-mail już istnieje.";
    if (path === "/loans")
      return "Nie można wypożyczyć gry. Sprawdź swoje aktywne wypożyczenia i dostępność egzemplarza.";
    if (path.endsWith("/return"))
      return "To wypożyczenie zostało już zwrócone.";
    if (method === "DELETE")
      return "Nie można usunąć wpisu, ponieważ jest używany przez inne dane (np. gry, egzemplarze lub historię wypożyczeń).";
    if (serverMessage === "Cannot change the game of a copy with loan history")
      return "Nie można przypisać egzemplarza do innej gry, ponieważ ma historię wypożyczeń.";
    return "Wpis o tej nazwie lub kodzie już istnieje. Sprawdź dane i spróbuj ponownie.";
  }
  if (status === 400) {
    if (serverMessage === "minPlayers must not exceed maxPlayers")
      return "Minimalna liczba graczy nie może być większa od maksymalnej.";
    return "Sprawdź poprawność pól formularza i spróbuj ponownie.";
  }
  if (status >= 500) return "Serwer chwilowo nie odpowiada. Spróbuj ponownie.";
  return typeof serverMessage === "string"
    ? serverMessage
    : "Nie udało się wykonać operacji.";
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
  const method = options.method ?? "GET";
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
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
  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const envelope = body as { error?: { code?: string } } | null;
    throw new ApiError(
      errorMessage(response.status, path, method, body, Boolean(options.token)),
      response.status,
      envelope?.error?.code ?? null,
    );
  }
  if (body === null)
    throw new ApiError(
      "Serwer zwrócił nieprawidłową odpowiedź.",
      response.status,
    );
  return body as T;
}

export const getCategories = (signal: AbortSignal) =>
  apiRequest<Category[]>("/categories", { signal });
export const getGames = (search: string, signal: AbortSignal) =>
  apiRequest<PaginatedGames>(`/games${search}`, { signal });
export const getGame = (id: string, signal: AbortSignal) =>
  apiRequest<Game>(`/games/${encodeURIComponent(id)}`, { signal });

export const getGameCopies = (signal: AbortSignal) =>
  apiRequest<GameCopy[]>("/game-copies", { signal });

export async function getAllGames(signal: AbortSignal): Promise<Game[]> {
  const first = await getGames("?page=1&limit=100", signal);
  const all = [...first.data];
  for (let page = 2; page <= first.pagination.totalPages; page++) {
    const next = await getGames(`?page=${page}&limit=100`, signal);
    all.push(...next.data);
  }
  return all;
}
