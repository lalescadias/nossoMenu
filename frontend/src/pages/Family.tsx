import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Mail,
  Copy,
  Check,
  UserPlus,
  Leaf,
  History,
  Trash2,
} from "lucide-react";
import { api, apiAll } from "../api";
import { useUser } from "../main";
import { useAction } from "../useAction";
import { Loading, ErrorMessage, Modal } from "../ui";
import type { Family, Account, Activity } from "../types";
export function FamilyPage() {
  const user = useUser(),
    action = useAction(),
    query = useQueryClient();
  const editBase = useRef<{ id: string; version: number } | null>(null);
  const [invite, setInvite] = useState(false),
    [token, setToken] = useState(""),
    [copied, setCopied] = useState(false),
    [saved, setSaved] = useState(false);
  const family = useQuery({
      queryKey: ["family"],
      queryFn: () => api<Family>("/families/current"),
    }),
    members = useQuery({
      queryKey: ["members"],
      queryFn: () => api<Account[]>("/families/current/members"),
    }),
    activity = useQuery({
      queryKey: ["activity"],
      queryFn: () => apiAll<Activity>("/activity", 50),
    });
  if (family.isPending) return <Loading />;
  const f = family.data;
  if (f && editBase.current?.id !== f.id)
    editBase.current = { id: f.id, version: f.version };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CADA FAMÍLIA TEM A SUA RECEITA</span>
          <h1>
            A nossa família<span className="heading-dot">.</span>
          </h1>
          <p>Um espaço de todos, à medida de cada um.</p>
        </div>
        <span className="pill">
          <Users size={16} />
          {members.data?.length ?? 1} membro
          {members.data?.length !== 1 ? "s" : ""}
        </span>
      </div>
      <ErrorMessage
        error={family.error || members.error || activity.error || action.error}
      />
      <div className="settings-layout">
        <section className="settings-card">
          <div className="section-title">
            <span className="card-icon">
              <Leaf size={21} />
            </span>
            <div>
              <h2>À nossa medida</h2>
              <p className="muted">
                Preferências para planear e calcular as compras.
              </p>
            </div>
          </div>
          {f && (
            <form
              key={f.id}
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                void action.run(
                  () =>
                    api<Family>("/families/current", "PUT", {
                      ...Object.fromEntries(data),
                      adults: Number(data.get("adults")),
                      children: Number(data.get("children")),
                      childEquivalent: Number(data.get("childEquivalent")),
                      maxMinutes: Number(data.get("maxMinutes")),
                      repeatDinner: data.get("repeatDinner") === "on",
                      version: editBase.current!.version,
                    }),
                  (result) => {
                    editBase.current = {
                      id: result.id,
                      version: result.version,
                    };
                    setSaved(true);
                    setTimeout(() => setSaved(false), 4000);
                  },
                );
              }}
            >
              <label>
                Nome da família
                <input
                  name="name"
                  defaultValue={f.name}
                  maxLength={100}
                  required
                />
              </label>
              <div className="form-grid">
                <label>
                  Adultos
                  <input
                    name="adults"
                    type="number"
                    min="1"
                    max="20"
                    defaultValue={f.adults}
                    required
                  />
                </label>
                <label>
                  Crianças
                  <input
                    name="children"
                    type="number"
                    min="0"
                    max="20"
                    defaultValue={f.children}
                    required
                  />
                </label>
              </div>
              <label>
                Porção de referência por criança
                <input
                  name="childEquivalent"
                  type="number"
                  min="0.01"
                  max="2"
                  step="0.01"
                  defaultValue={f.childEquivalent}
                  required
                />
                <small>
                  Uma proporção da porção de adulto. Ajusta às necessidades da
                  tua família; o valor inicial 0,5 é apenas uma configuração
                  editável.
                </small>
              </label>
              <label>
                Tempo preferido por receita
                <select name="maxMinutes" defaultValue={f.maxMinutes}>
                  {[15, 20, 30, 45, 60, 90, 120, 240].map((t) => (
                    <option key={t} value={t}>
                      {t} minutos
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cozinhas preferidas
                <select name="cuisines" defaultValue={f.cuisines}>
                  <option value="Portuguesa,Brasileira">
                    Portuguesa e brasileira
                  </option>
                  <option value="Portuguesa">Portuguesa</option>
                  <option value="Brasileira">Brasileira</option>
                  <option value="">Todas</option>
                </select>
              </label>
              <label className="check-label">
                <input
                  name="repeatDinner"
                  type="checkbox"
                  defaultChecked={f.repeatDinner}
                />
                Repetir a receita do almoço ao jantar por defeito
              </label>
              <div className="gentle-note">
                Estas preferências aplicam-se aos próximos menus. As refeições e
                listas já guardadas mantêm as suas quantidades.
              </div>
              <button className="button primary fit" disabled={action.pending}>
                {saved ? (
                  <>
                    <Check size={17} />
                    Guardado
                  </>
                ) : (
                  "Guardar preferências"
                )}
              </button>
            </form>
          )}
        </section>
        <div>
          <section className="settings-card">
            <div className="section-title">
              <Users size={21} />
              <h2>Quem se senta à mesa</h2>
            </div>
            {members.data?.map((m) => (
              <div className="member-row" key={m.id}>
                <span className="avatar">{m.name[0]}</span>
                <div>
                  <strong>
                    {m.name}
                    {m.id === user.id ? " (tu)" : ""}
                  </strong>
                  <small>{m.email}</small>
                  <small>{m.role === "OWNER" ? "Responsável" : "Membro"}</small>
                </div>
                {user.role === "OWNER" && m.role !== "OWNER" && (
                  <button
                    className="icon-button delete"
                    aria-label={`Remover ${m.name} da família`}
                    disabled={action.pending}
                    onClick={() => {
                      if (
                        window.confirm(`Remover ${m.name} do espaço familiar?`)
                      )
                        void action.run(() =>
                          api(`/families/current/members/${m.id}`, "DELETE"),
                        );
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {user.role === "OWNER" && (
              <button
                className="button secondary full"
                onClick={() => {
                  setInvite(true);
                  setToken("");
                }}
              >
                <UserPlus size={16} />
                Convidar para a família
              </button>
            )}
            <p className="muted small-text">
              Cada pessoa entra com a sua conta. Os menus, receitas e compras
              são partilhados.
            </p>
          </section>
          <section className="settings-card spaced">
            <h3>Recebeste um convite?</h3>
            <p className="muted">
              Entra com o email a que o convite foi dirigido. A tua família
              atual precisa de estar vazia.
            </p>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const token = new FormData(e.currentTarget).get("token");
                if (
                  window.confirm(
                    "Entrar na família do convite e deixar o espaço atual?",
                  )
                )
                  void action.run(
                    () =>
                      api<Account>("/invitations/accept", "POST", { token }),
                    async (account) => {
                      query.clear();
                      query.setQueryData(["me"], account);
                    },
                  );
              }}
            >
              <label>
                Código do convite
                <input name="token" required autoComplete="off" />
              </label>
              <button className="button secondary" disabled={action.pending}>
                Aceitar convite
              </button>
            </form>
          </section>
        </div>
      </div>
      <section className="settings-card spaced">
        <div className="section-title">
          <History size={20} />
          <h2>O que temos feito por aqui</h2>
        </div>
        <div className="activity-list">
          {activity.data?.map((event) => (
            <div className="activity-row" key={event.id}>
              <span className="activity-dot" />
              <div>
                <strong>{event.userName}</strong> · {event.summary}
                <small>
                  {new Date(event.createdAt).toLocaleString("pt-PT")}
                </small>
              </div>
            </div>
          ))}
          {!activity.data?.length && (
            <p className="muted">
              As próximas alterações da família aparecem aqui.
            </p>
          )}
        </div>
      </section>
      {invite && (
        <Modal
          title="Há lugar para mais um à mesa"
          onClose={() => setInvite(false)}
        >
          {token ? (
            <>
              <div className="gentle-note">
                Convite criado. Partilha este código com a pessoa convidada. É
                válido por 48 horas e só pode ser usado com o email indicado.
              </div>
              <label>
                Código de convite
                <input
                  readOnly
                  value={token}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <button
                className="button primary full"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(token);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
                {copied ? "Copiado" : "Copiar código"}
              </button>
              <small>
                Na conta da outra pessoa: Família → Recebeste um convite? →
                Aceitar convite.
              </small>
            </>
          ) : (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const email = new FormData(e.currentTarget).get("email");
                void action.run(
                  () =>
                    api<{ token: string }>(
                      "/families/current/invitations",
                      "POST",
                      { email },
                    ),
                  (r) => setToken(r.token),
                );
              }}
            >
              <p>
                O convite dá acesso aos menus, compras e receitas deste espaço
                familiar.
              </p>
              <label>
                Email da pessoa convidada
                <input name="email" type="email" required maxLength={254} />
              </label>
              <ErrorMessage error={action.error} />
              <button className="button primary" disabled={action.pending}>
                <Mail size={16} />
                Criar convite
              </button>
              <small>
                O código é partilhado manualmente; não é enviado email
                automaticamente.
              </small>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
