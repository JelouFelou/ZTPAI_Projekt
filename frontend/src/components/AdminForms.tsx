import { useState } from "react";
import type { FormEvent } from "react";
import type { Category, Game, GameCopy } from "../api";

type Shared = { busy: boolean; cancel: () => void };

export function CategoryForm({
  item,
  busy,
  cancel,
  save,
}: Shared & {
  item: Category | null;
  save: (body: { name: string; description: string | null }) => Promise<void>;
}) {
  return (
    <form
      className="admin-form"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        void save({
          name: String(values.get("name")).trim(),
          description: String(values.get("description")).trim() || null,
        });
      }}
    >
      <h2>{item ? "Edytuj kategorię" : "Nowa kategoria"}</h2>
      <label>
        Nazwa
        <input
          name="name"
          required
          minLength={2}
          maxLength={100}
          defaultValue={item?.name ?? ""}
        />
      </label>
      <label>
        Opis
        <textarea
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={item?.description ?? ""}
        />
      </label>
      <div className="admin-form__actions">
        <button className="button button-primary" disabled={busy}>
          {busy ? "Zapisywanie…" : item ? "Zapisz zmiany" : "Dodaj kategorię"}
        </button>
        {item && (
          <button
            className="button button-secondary"
            type="button"
            onClick={cancel}
            disabled={busy}
          >
            Anuluj
          </button>
        )}
      </div>
    </form>
  );
}

export function GameForm({
  item,
  categories,
  busy,
  cancel,
  save,
}: Shared & {
  item: Game | null;
  categories: Category[];
  save: (body: {
    title: string;
    description: string | null;
    minPlayers: number;
    maxPlayers: number;
    recommendedAge: number;
    durationMinutes: number;
    categoryId: string;
  }) => Promise<void>;
}) {
  const [validation, setValidation] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const minPlayers = Number(values.get("minPlayers"));
    const maxPlayers = Number(values.get("maxPlayers"));
    if (minPlayers > maxPlayers) {
      setValidation(
        "Minimalna liczba graczy nie może być większa od maksymalnej.",
      );
      return;
    }
    setValidation("");
    void save({
      title: String(values.get("title")).trim(),
      description: String(values.get("description")).trim() || null,
      minPlayers,
      maxPlayers,
      recommendedAge: Number(values.get("recommendedAge")),
      durationMinutes: Number(values.get("durationMinutes")),
      categoryId: String(values.get("categoryId")),
    });
  }
  return (
    <form className="admin-form" onSubmit={submit}>
      <h2>{item ? "Edytuj grę" : "Nowa gra"}</h2>
      <label>
        Tytuł
        <input
          name="title"
          required
          maxLength={200}
          defaultValue={item?.title ?? ""}
        />
      </label>
      <label>
        Opis
        <textarea
          name="description"
          rows={4}
          maxLength={5000}
          defaultValue={item?.description ?? ""}
        />
      </label>
      <label>
        Kategoria
        <select
          name="categoryId"
          required
          defaultValue={item?.categoryId ?? ""}
        >
          <option value="" disabled>
            Wybierz kategorię
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <div className="admin-form__grid">
        <label>
          Min. graczy
          <input
            name="minPlayers"
            type="number"
            required
            min={1}
            max={100}
            defaultValue={item?.minPlayers ?? 1}
          />
        </label>
        <label>
          Maks. graczy
          <input
            name="maxPlayers"
            type="number"
            required
            min={1}
            max={100}
            defaultValue={item?.maxPlayers ?? 4}
          />
        </label>
        <label>
          Wiek od
          <input
            name="recommendedAge"
            type="number"
            required
            min={0}
            max={100}
            defaultValue={item?.recommendedAge ?? 8}
          />
        </label>
        <label>
          Czas (min)
          <input
            name="durationMinutes"
            type="number"
            required
            min={1}
            max={1440}
            defaultValue={item?.durationMinutes ?? 30}
          />
        </label>
      </div>
      {validation && (
        <p className="form-error" role="alert">
          {validation}
        </p>
      )}
      {!categories.length && (
        <p className="admin-hint">
          Najpierw dodaj kategorię w zakładce Kategorie.
        </p>
      )}
      <div className="admin-form__actions">
        <button
          className="button button-primary"
          disabled={busy || !categories.length}
        >
          {busy ? "Zapisywanie…" : item ? "Zapisz zmiany" : "Dodaj grę"}
        </button>
        {item && (
          <button
            className="button button-secondary"
            type="button"
            onClick={cancel}
            disabled={busy}
          >
            Anuluj
          </button>
        )}
      </div>
    </form>
  );
}

export function CopyForm({
  item,
  games,
  busy,
  cancel,
  save,
}: Shared & {
  item: GameCopy | null;
  games: Game[];
  save: (body: {
    inventoryCode: string;
    gameId: string;
    status: GameCopy["status"];
  }) => Promise<void>;
}) {
  return (
    <form
      className="admin-form"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        void save({
          inventoryCode: String(values.get("inventoryCode")).trim(),
          gameId: String(values.get("gameId")),
          status: String(values.get("status")) as GameCopy["status"],
        });
      }}
    >
      <h2>{item ? "Edytuj egzemplarz" : "Nowy egzemplarz"}</h2>
      <label>
        Kod egzemplarza
        <input
          name="inventoryCode"
          required
          maxLength={64}
          defaultValue={item?.inventoryCode ?? ""}
        />
      </label>
      <label>
        Gra
        <select name="gameId" required defaultValue={item?.gameId ?? ""}>
          <option value="" disabled>
            Wybierz grę
          </option>
          {games.map((game) => (
            <option key={game.id} value={game.id}>
              {game.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Stan
        <select name="status" defaultValue={item?.status ?? "AVAILABLE"}>
          <option value="AVAILABLE">Dostępny</option>
          <option value="MAINTENANCE">W naprawie</option>
          <option value="RETIRED">Wycofany</option>
        </select>
      </label>
      {item && (
        <p className="admin-hint">
          Nie można przypisać egzemplarza do innej gry, jeśli ma historię
          wypożyczeń.
        </p>
      )}
      {!games.length && (
        <p className="admin-hint">Najpierw dodaj grę w zakładce Gry.</p>
      )}
      <div className="admin-form__actions">
        <button
          className="button button-primary"
          disabled={busy || !games.length}
        >
          {busy ? "Zapisywanie…" : item ? "Zapisz zmiany" : "Dodaj egzemplarz"}
        </button>
        {item && (
          <button
            className="button button-secondary"
            type="button"
            onClick={cancel}
            disabled={busy}
          >
            Anuluj
          </button>
        )}
      </div>
    </form>
  );
}
