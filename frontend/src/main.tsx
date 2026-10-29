import React, { createContext, useContext, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CalendarDays,
  ShoppingBasket,
  BookOpen,
  Sparkles,
  Users,
  Utensils,
  LogOut,
  Leaf,
  ArrowRight,
  WifiOff,
} from "lucide-react";
import { api, ApiError } from "./api";
import { Loading, ErrorMessage } from "./ui";
import type { Account } from "./types";
import { WeekPage } from "./pages/Week";
import { RecipesPage, RecipeDetail, AddToMenu } from "./pages/Recipes";
import { ShoppingPage } from "./pages/Shopping";
import { DecidePage } from "./pages/Decide";
import { FamilyPage } from "./pages/Family";
import { Recovery } from "./pages/Recovery";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) =>
        !(
          error instanceof ApiError && [401, 403, 404].includes(error.status)
        ) && count < 1,
      refetchOnWindowFocus: true,
      staleTime: 10000,
    },
  },
});
const UserContext = createContext<Account | null>(null);
export function useUser() {
  return useContext(UserContext)!;
}
const AppContext = createContext<{
  openRecipe: (id: string) => void;
  addToMenu: (id: string) => void;
  refresh: () => Promise<void>;
}>({ openRecipe: () => {}, addToMenu: () => {}, refresh: async () => {} });
export function useApp() {
  return useContext(AppContext);
}
function Auth() {
  const [register, setRegister] = useState(false),
    [error, setError] = useState<unknown>(),
    [pending, setPending] = useState(false);
  const query = useQueryClient();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const account = await api<Account>(
        `/auth/${register ? "register" : "login"}`,
        "POST",
        data,
      );
      query.setQueryData(["me"], account);
    } catch (error) {
      setError(error);
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <a className="brand" href="/">
          <span className="brand-icon">
            <Utensils size={24} />
          </span>
          nosso menu<span className="brand-dot">.</span>
        </a>
        <div>
          <span className="pill light">
            <Leaf size={14} /> À mesa, em família
          </span>
          <h1>
            Menos “o que
            <br />
            vamos comer?”.
            <br />
            <em>Mais tempo juntos.</em>
          </h1>
          <p>
            Uma semana organizada.
            <br />
            Receitas de todos. Compras em conjunto.
          </p>
          <div className="auth-plates" aria-hidden="true">
            🥗<span>🍝</span>🍋
          </div>
        </div>
        <small>Feito para a vida real, à volta da mesa.</small>
      </section>
      <section className="auth-form">
        <span className="eyebrow">BEM-VINDO À NOSSA MESA</span>
        <h2>{register ? "Vamos começar?" : "Que bom ter-te de volta."}</h2>
        <p>
          {register
            ? "Cria a tua conta e o espaço da tua família."
            : "Entra para organizar mais uma semana."}
        </p>
        <form onSubmit={submit}>
          {register && (
            <>
              <label>
                O teu nome
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                />
              </label>
              <label>
                Nome da família
                <input
                  name="familyName"
                  placeholder="A nossa família"
                  maxLength={100}
                />
              </label>
            </>
          )}
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
          <label>
            Palavra-passe
            <input
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              minLength={10}
              maxLength={72}
              required
              placeholder="Pelo menos 10 caracteres"
            />
          </label>
          <ErrorMessage error={error} />
          <button className="button primary full" disabled={pending}>
            {pending ? "A entrar…" : register ? "Criar conta" : "Entrar"}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Já tens conta?" : "Ainda não tens conta?"}{" "}
          <button
            className="text-button"
            onClick={() => {
              setRegister(!register);
              setError(null);
            }}
          >
            {register ? "Entrar" : "Criar conta"}
          </button>
        </p>
        <a href="/recuperar" className="text-button recovery-link">
          Esqueceste-te da palavra-passe?
        </a>
        <small>Os teus menus e compras guardados, para toda a família.</small>
      </section>
    </main>
  );
}
const nav = [
  { to: "/", label: "Semana", icon: CalendarDays },
  { to: "/compras", label: "Compras", icon: ShoppingBasket },
  { to: "/receitas", label: "Receitas", icon: BookOpen },
  { to: "/decidir", label: "Decidir", icon: Sparkles },
  { to: "/familia", label: "Família", icon: Users },
];
function Shell({ account }: { account: Account }) {
  const [recipe, setRecipe] = useState<string | null>(null),
    [add, setAdd] = useState<string | null>(null),
    [online, setOnline] = useState(navigator.onLine),
    [connected, setConnected] = useState(false),
    [logoutError, setLogoutError] = useState<unknown>();
  const query = useQueryClient();
  const navigate = useNavigate();
  const refresh = async () => {
    await query.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "me" });
  };
  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onopen = () => setConnected(true);
    source.addEventListener("changed", () => {
      void refresh();
    });
    source.onerror = () => setConnected(false);
    const up = () => setOnline(true),
      down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      source.close();
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, [account.familyId]);
  async function logout() {
    try {
      await api("/auth/logout", "POST");
      query.clear();
      query.setQueryData(["me"], null);
      navigate("/");
    } catch (e) {
      setLogoutError(e);
    }
  }
  return (
    <UserContext.Provider value={account}>
      <AppContext.Provider
        value={{ openRecipe: setRecipe, addToMenu: setAdd, refresh }}
      >
        <div className="app-shell">
          <aside className="sidebar">
            <NavLink to="/" className="brand">
              <span className="brand-icon">
                <Utensils size={23} />
              </span>
              nosso menu<span className="brand-dot">.</span>
            </NavLink>
            <div className="sidebar-caption">À MESA, EM FAMÍLIA</div>
            <nav>
              {nav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "active" : ""}`
                  }
                >
                  <Icon size={20} />
                  <span>{label}</span>
                  {to === "/decidir" && <span className="nav-new">IDEIAS</span>}
                </NavLink>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <div className="sidebar-note">
                <Leaf size={22} />
                <p>
                  Uma coisa a menos
                  <br />
                  para pensar hoje.
                </p>
              </div>
              <div className="user">
                <span className="avatar">{account.name[0].toUpperCase()}</span>
                <div>
                  <strong>{account.name}</strong>
                  <small>O teu espaço familiar</small>
                </div>
                <button
                  className="icon-button"
                  onClick={logout}
                  aria-label="Terminar sessão"
                >
                  <LogOut size={17} />
                </button>
              </div>
            </div>
          </aside>
          <div className="main-shell">
            <header className="topbar">
              <span>
                <span className={`status-dot ${connected ? "" : "waiting"}`} />
                {connected ? "Em família, sempre em dia" : "A ligar à família…"}
              </span>
              <NavLink to="/familia">
                <Users size={16} />
                <span>A nossa família</span>
                <span className="mini-avatar">{account.name[0]}</span>
              </NavLink>
            </header>
            {!online && (
              <div className="connection-error" role="alert">
                <WifiOff size={17} /> Sem ligação. É necessário estar online
                para guardar alterações.
              </div>
            )}
            <ErrorMessage error={logoutError} />
            <main className="page">
              <Routes>
                <Route path="/" element={<WeekPage />} />
                <Route path="/compras" element={<ShoppingPage />} />
                <Route path="/receitas" element={<RecipesPage />} />
                <Route path="/decidir" element={<DecidePage />} />
                <Route path="/familia" element={<FamilyPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
              <footer className="page-footer">
                <span>nosso menu.</span> Menos decisões. Mais momentos à mesa.
                <Leaf size={14} />
              </footer>
            </main>
          </div>
          <nav className="mobile-nav">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === "/"}>
                <Icon size={21} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        {recipe && <RecipeDetail id={recipe} onClose={() => setRecipe(null)} />}{" "}
        {add && <AddToMenu recipeId={add} onClose={() => setAdd(null)} />}
      </AppContext.Provider>
    </UserContext.Provider>
  );
}
function App() {
  if (window.location.pathname === "/recuperar") return <Recovery />;
  return <AuthenticatedApp />;
}
function AuthenticatedApp() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
    retry: false,
  });
  if (me.isPending) return <Loading />;
  if (me.error && !(me.error instanceof ApiError && me.error.status === 401))
    return (
      <main className="startup-error">
        <ErrorMessage error={me.error} />
        <button className="button primary" onClick={() => me.refetch()}>
          Tentar novamente
        </button>
      </main>
    );
  return me.data ? <Shell account={me.data} /> : <Auth />;
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
if ("serviceWorker" in navigator && import.meta.env.PROD)
  navigator.serviceWorker.register("/sw.js").catch(() => {});
