import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../authContext";
import Link from "../components/Link";
import { navigate } from "../navigation";

export default function AuthPage({
  mode,
  next,
}: {
  mode: "login" | "register";
  next: string;
}) {
  const { user, login, register } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const destination =
    next.startsWith("/") && !next.startsWith("//") ? next : "/loans";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "register") await register(form);
      else await login(form.email, form.password);
      navigate(destination);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Nie udało się zalogować.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page container">
      <div className="auth-panel">
        <p className="eyebrow">TWOJE KONTO W BOARDRENT</p>
        <h1>{mode === "login" ? "Witaj ponownie." : "Dołącz do gry."}</h1>
        <p>
          {mode === "login"
            ? "Zaloguj się, aby wypożyczać gry i sprawdzać swoje wypożyczenia."
            : "Utwórz konto i zacznij odkrywać planszówki."}
        </p>
        {user ? (
          <div className="notice">
            Jesteś już zalogowany jako {user.firstName}.{" "}
            <Link href="/loans">Przejdź do wypożyczeń →</Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            {mode === "register" && (
              <div className="auth-form__row">
                <label>
                  Imię
                  <input
                    required
                    maxLength={100}
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                  />
                </label>
                <label>
                  Nazwisko
                  <input
                    required
                    maxLength={100}
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                  />
                </label>
              </div>
            )}
            <label>
              Adres e-mail
              <input
                required
                type="email"
                maxLength={320}
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Hasło
              <input
                required
                type="password"
                minLength={mode === "register" ? 12 : undefined}
                maxLength={128}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            {mode === "register" && (
              <small>Hasło musi mieć co najmniej 12 znaków.</small>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button button-primary"
              type="submit"
              disabled={busy}
            >
              {busy
                ? "Chwileczkę…"
                : mode === "login"
                  ? "Zaloguj się →"
                  : "Utwórz konto →"}
            </button>
          </form>
        )}
        <p className="auth-switch">
          {mode === "login" ? "Nie masz konta?" : "Masz już konto?"}{" "}
          <Link
            href={`${mode === "login" ? "/register" : "/login"}?next=${encodeURIComponent(destination)}`}
          >
            {mode === "login" ? "Zarejestruj się" : "Zaloguj się"}
          </Link>
        </p>
      </div>
    </main>
  );
}
