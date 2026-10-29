import { useState, type FormEvent } from "react";
import { ArrowLeft, KeyRound, Mail, Check } from "lucide-react";
import { api } from "../api";
import { ErrorMessage } from "../ui";
export function Recovery() {
  const [step, setStep] = useState<"email" | "code" | "done">("email"),
    [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(
        `/auth/${step === "email" ? "forgot-password" : "reset-password"}`,
        "POST",
        data,
      );
      setStep(step === "email" ? "code" : "done");
    } catch (e) {
      setError(e);
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="recovery-page">
      <a href="/" className="text-button">
        <ArrowLeft size={16} />
        Voltar a entrar
      </a>
      <div className="card-icon">
        <KeyRound size={22} />
      </div>
      <h1>Recuperar acesso</h1>
      {step === "done" ? (
        <>
          <div className="gentle-note">
            <Check size={17} /> Palavra-passe alterada. Todas as sessões
            anteriores terminaram.
          </div>
          <a href="/" className="button primary full">
            Entrar com a nova palavra-passe
          </a>
        </>
      ) : (
        <form className="form-stack" onSubmit={submit}>
          {step === "email" ? (
            <>
              <p>
                Enviaremos um código de recuperação se o email estiver
                registado.
              </p>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </label>
            </>
          ) : (
            <>
              <p>
                Introduz o código recebido por email. É válido por 30 minutos.
              </p>
              <label>
                Código de recuperação
                <input name="token" required autoComplete="one-time-code" />
              </label>
              <label>
                Nova palavra-passe
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={72}
                />
              </label>
            </>
          )}
          <ErrorMessage error={error} />
          <button className="button primary" disabled={pending}>
            {step === "email" ? (
              <>
                <Mail size={16} />
                Pedir código
              </>
            ) : (
              "Guardar nova palavra-passe"
            )}
          </button>
          {step === "email" && (
            <button
              className="text-button"
              type="button"
              onClick={() => setStep("code")}
            >
              Já tenho um código
            </button>
          )}
        </form>
      )}
    </main>
  );
}
