import { useState, type FormEvent } from "react";
import { ApiError } from "@/api/client";
import logo from "@/assets/logo-hri.png";
import { Button, Field } from "@/components/ui";
import { COMPANY_NAME } from "@/config/text";
import { useAuth } from "@/context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valid, setValid] = useState<Record<string, string>>({});
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setValid({});
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(
        err instanceof ApiError && err.hasFieldErrors
          ? null
          : err instanceof Error
            ? err.message
            : "Gagal masuk.",
      );
      if (err instanceof ApiError) setValid(err.valid);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="login">
      <form className="login__card" onSubmit={submit} noValidate>
        <img src={logo} alt="Logo HRI" className="login__logo" />
        <strong className="login__title">Admin · {COMPANY_NAME}</strong>
        <p className="text-muted">
          Masuk untuk mengelola data dan memantau absensi.
        </p>
        <Field label="EMAIL">
          <input
            type="email"
            autoComplete="username"
            className="control control--large"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            aria-invalid={!!valid.email}
          />
          {valid.email && <small className="text-error">{valid.email}</small>}
        </Field>
        <Field label="PASSWORD">
          <input
            type="password"
            autoComplete="current-password"
            className="control control--large"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!valid.password}
          />
          {valid.password && (
            <small className="text-error">{valid.password}</small>
          )}
        </Field>
        {error && (
          <p className="text-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" loading={submitting}>
          Masuk
        </Button>
      </form>
    </div>
  );
}
