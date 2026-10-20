// Shared, browser-safe helpers for BusMap Macapá.
export const MACAPA_CENTER: [number, number] = [0.0349, -51.0694];

export type LatLng = [number, number];

export type RouteRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  color: string;
  direction: string;
  origin_name: string | null;
  destination_name: string | null;
  geometry: LatLng[];
  distance_m: number | null;
  published: boolean;
  active: boolean;
  creation_method: "routed" | "manual";
  updated_at: string;
};

export type LivePosition = {
  public_id: string;
  route_id: string | null;
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  updated_at: string;
  started_at: string;
  validation: "pending" | "ok" | "suspect";
  contributor_kind: "member" | "visitor";
  tier: string;
  xp: number | null;
  valid_sessions: number | null;
  nickname: string | null;
};

type Tier = { label: string; title: string; short: string };
export const TIERS: Record<string, Tier> & { none: Tier } = {
  none: { label: "Sem medalha", title: "Novato", short: "–" },
  bronze: { label: "Bronze", title: "Iniciante", short: "B" },
  silver: { label: "Prata", title: "Colaborador", short: "P" },
  gold: { label: "Ouro", title: "Explorador", short: "O" },
  platinum: { label: "Platina", title: "Embaixador", short: "PL" },
};

export function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function polylineLength(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversine(points[i - 1]!, points[i]!);
  return total;
}

export function formatDistance(m: number | null | undefined): string {
  if (m == null) return "—";
  return m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${Math.round(m)} m`;
}

export type Freshness = "fresh" | "aging" | "stale";

/** Freshness of a shared position given the backend inactivity timeout. */
export function freshnessOf(updatedAt: string, now: number, timeoutSeconds: number): Freshness {
  const age = (now - new Date(updatedAt).getTime()) / 1000;
  if (age <= timeoutSeconds / 2) return "fresh";
  if (age <= timeoutSeconds) return "aging";
  return "stale";
}

export function ageLabel(updatedAt: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(updatedAt).getTime()) / 1000));
  if (s < 60) return `há ${s} s`;
  const m = Math.round(s / 60);
  return `há ${m} min`;
}

export function signalLabel(accuracy: number | null): { label: string; level: "good" | "fair" | "poor" } {
  if (accuracy == null) return { label: "Precisão desconhecida", level: "poor" };
  if (accuracy <= 25) return { label: `Boa (±${Math.round(accuracy)} m)`, level: "good" };
  if (accuracy <= 80) return { label: `Razoável (±${Math.round(accuracy)} m)`, level: "fair" };
  return { label: `Fraca (±${Math.round(accuracy)} m)`, level: "poor" };
}

export const VALIDATION_LABEL: Record<LivePosition["validation"], string> = {
  pending: "Em verificação automática",
  ok: "Passou nas verificações automáticas",
  suspect: "Dados inconsistentes detectados",
};

/** Random per-installation secret. Only its hash is stored by the backend. */
export function getDeviceSecret(): string {
  const KEY = "busmap.device_secret";
  try {
    let v = window.localStorage.getItem(KEY);
    if (!v || v.length < 32) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      v = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      window.localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    // Storage unavailable: per-tab secret (progress lost when tab closes).
    const w = window as unknown as { __busmapSecret?: string };
    if (!w.__busmapSecret) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      w.__busmapSecret = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    }
    return w.__busmapSecret;
  }
}

export const ERROR_MESSAGES: Record<string, string> = {
  route_unavailable: "Esta linha não está disponível no momento.",
  rate_limited: "Muitas sessões iniciadas em pouco tempo. Aguarde alguns minutos.",
  invalid_session: "A sessão de compartilhamento não é mais válida.",
  invalid_coordinates: "Coordenadas inválidas recebidas do GPS.",
  invalid_device: "Identificador do dispositivo inválido.",
  not_authenticated: "Você precisa entrar na sua conta.",
  forbidden: "Acesso não autorizado.",
};

export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  for (const k of Object.keys(ERROR_MESSAGES)) if (msg.includes(k)) return ERROR_MESSAGES[k]!;
  if (/fetch|network/i.test(msg)) return "Sem conexão com o servidor. Verifique sua internet.";
  return msg;
}
