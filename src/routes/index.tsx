import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bus, ChevronDown, ChevronUp, Crosshair, Loader2, MapPin, Radio, Signal, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { AdSlot } from "@/components/AdSlot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSharing } from "@/hooks/use-sharing";
import { useAuth } from "@/hooks/use-auth";
import {
  TIERS,
  VALIDATION_LABEL,
  ageLabel,
  formatDistance,
  freshnessOf,
  signalLabel,
  type LivePosition,
  type RouteRow,
} from "@/lib/busmap";
import { cn } from "@/lib/utils";

const PublicMap = lazy(() => import("@/components/map/PublicMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BusMap Macapá — Ônibus e rotas em tempo real" },
      {
        name: "description",
        content: "Consulte as linhas de ônibus de Macapá e veja posições compartilhadas por passageiros em tempo real. Sem cadastro.",
      },
      { property: "og:title", content: "BusMap Macapá — Ônibus e rotas em tempo real" },
      { property: "og:description", content: "Mapa colaborativo das linhas de ônibus de Macapá, AP." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<RouteRow[] | null>(null);
  const [positions, setPositions] = useState<LivePosition[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timeoutS, setTimeoutS] = useState(60);
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<Set<string> | null>(null);
  const [selRoute, setSelRoute] = useState<string | null>(null);
  const [selPos, setSelPos] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ at: [number, number]; zoom?: number; key: number } | null>(null);
  const [visitorPos, setVisitorPos] = useState<[number, number] | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const sharing = useSharing();

  // Initial load
  useEffect(() => {
    let alive = true;
    (async () => {
      const [r, p, s] = await Promise.all([
        supabase.from("routes").select("*").eq("published", true).eq("active", true).order("code"),
        supabase.from("live_positions").select("*"),
        supabase.from("app_settings").select("value").eq("key", "session_timeout_seconds").maybeSingle(),
      ]);
      if (!alive) return;
      if (r.error) setLoadError("Não foi possível carregar as rotas. Verifique sua conexão.");
      setRoutes((r.data ?? []) as unknown as RouteRow[]);
      setPositions((p.data ?? []) as LivePosition[]);
      if (s.data?.value) setTimeoutS(Number(s.data.value));
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("public-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_positions" }, (payload) => {
        setPositions((prev) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as Partial<LivePosition>).public_id;
            return prev.filter((x) => x.public_id !== id);
          }
          const row = payload.new as LivePosition;
          const i = prev.findIndex((x) => x.public_id === row.public_id);
          if (i === -1) return [...prev, row];
          const next = prev.slice();
          next[i] = row;
          return next;
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "routes" }, (payload) => {
        setRoutes((prev) => {
          const list = prev ?? [];
          if (payload.eventType === "DELETE") {
            const id = (payload.old as Partial<RouteRow>).id;
            return list.filter((x) => x.id !== id);
          }
          const row = payload.new as RouteRow;
          const rest = list.filter((x) => x.id !== row.id);
          return row.published && row.active ? [...rest, row].sort((a, b) => a.code.localeCompare(b.code)) : rest;
        });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  // Drop positions far beyond the timeout (server deletes them on expiry).
  const visiblePositions = useMemo(
    () => positions.filter((p) => now - new Date(p.updated_at).getTime() < 10 * 60 * 1000),
    [positions, now],
  );
  const activeCount = visiblePositions.filter((p) => freshnessOf(p.updated_at, now, timeoutS) !== "stale").length;
  const routeById = useMemo(() => new Map((routes ?? []).map((r) => [r.id, r])), [routes]);
  const selectedRoute = selRoute ? routeById.get(selRoute) ?? null : null;
  const selectedPos = selPos ? visiblePositions.find((p) => p.public_id === selPos) ?? null : null;

  useEffect(() => {
    if (sharing.lastResult) {
      const r = sharing.lastResult;
      if (!r.evaluated) toast("Compartilhamento encerrado.");
      else if (r.result === "valid")
        toast.success(r.xp ? `Obrigado! Sessão válida: +${r.xp} XP` : `Sessão válida. ${r.reason ?? ""}`);
      else toast(`Sessão encerrada sem pontuação: ${r.reason ?? ""}`);
      sharing.clearResult();
    }
    return undefined;
  }, [sharing.lastResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const locateMe = () => {
    if (!("geolocation" in navigator)) return toast.error("Seu navegador não oferece localização.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const at: [number, number] = [p.coords.latitude, p.coords.longitude];
        setVisitorPos(at);
        setFocus({ at, zoom: 16, key: Date.now() });
      },
      (e) =>
        toast.error(
          e.code === e.PERMISSION_DENIED ? "Permissão de localização negada." : "Não foi possível obter sua localização.",
        ),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const toggleFilter = (id: string) => {
    setFilter((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next.size ? next : null;
    });
  };

  const isSharing = sharing.status === "sharing" || sharing.status === "offline" || sharing.status === "starting";

  return (
    <div className="flex h-[100dvh] flex-col pb-[52px] md:pb-0">
      <AppHeader />
      {isSharing && (
        <div className="z-[1001] flex items-center justify-between gap-2 bg-accent px-3 py-2 text-sm text-accent-foreground">
          <span className="flex items-center gap-2 font-medium">
            <Radio className="h-4 w-4 animate-pulse" />
            {sharing.status === "offline"
              ? "Sem conexão — tentando reenviar…"
              : `Compartilhando sua localização${sharing.routeId ? ` · Linha ${routeById.get(sharing.routeId)?.code ?? ""}` : ""}`}
            {sharing.lastSentAt && <span className="hidden opacity-75 sm:inline">· último envio {ageLabel(new Date(sharing.lastSentAt).toISOString(), now)}</span>}
          </span>
          <Button size="sm" variant="destructive" onClick={() => void sharing.stop()}>
            Parar
          </Button>
        </div>
      )}
      <div className="relative flex min-h-0 flex-1">
        {/* Side / bottom panel */}
        <section
          className={cn(
            "absolute inset-x-0 bottom-0 z-[900] flex max-h-[70%] flex-col rounded-t-2xl border-t border-border bg-card shadow-[var(--shadow-float)] transition-all md:static md:inset-auto md:max-h-none md:w-[380px] md:rounded-none md:border-r md:border-t-0 md:shadow-none",
            panelOpen ? "h-[70%]" : "h-auto md:h-auto",
          )}
        >
          <button
            className="flex w-full items-center justify-between px-4 pb-2 pt-3 md:hidden"
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
          >
            <Stats routes={routes?.length} active={activeCount} />
            {panelOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>
          <div className="hidden px-4 pt-4 md:block">
            <Stats routes={routes?.length} active={activeCount} />
          </div>

          <div className="px-4 pb-3 pt-1">
            <Button
              className="w-full"
              size="lg"
              disabled={isSharing || sharing.status === "requesting"}
              onClick={() => setShareOpen(true)}
            >
              {sharing.status === "requesting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              {isSharing ? "Compartilhando…" : "Estou no ônibus — compartilhar"}
            </Button>
            {sharing.error && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {sharing.error}
              </p>
            )}
            {sharing.rejected && isSharing && <p className="mt-2 text-xs text-muted-foreground">{sharing.rejected}</p>}
          </div>

          <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 pb-4", !panelOpen && "hidden md:block")}>
            {selectedPos ? (
              <PositionDetail
                p={selectedPos}
                route={selectedPos.route_id ? routeById.get(selectedPos.route_id) : undefined}
                now={now}
                timeoutS={timeoutS}
                onClose={() => setSelPos(null)}
              />
            ) : selectedRoute ? (
              <RouteDetail
                r={selectedRoute}
                positions={visiblePositions.filter((p) => p.route_id === selectedRoute.id)}
                now={now}
                timeoutS={timeoutS}
                onClose={() => setSelRoute(null)}
                onSelectPos={setSelPos}
              />
            ) : (
              <RouteList
                routes={routes}
                loadError={loadError}
                filter={filter}
                positions={visiblePositions}
                now={now}
                timeoutS={timeoutS}
                onToggle={toggleFilter}
                onClear={() => setFilter(null)}
                onOpen={(id) => setSelRoute(id)}
              />
            )}
            {!user && (
              <div className="mt-4 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                Você está como visitante. <Link to="/auth" className="font-semibold text-primary underline">Crie uma conta</Link> para
                guardar seu progresso, medalhas e nível em qualquer dispositivo.
              </div>
            )}
          </div>
        </section>

        <div className="relative min-h-0 flex-1">
          <ClientOnly fallback={<MapFallback />}>
            <Suspense fallback={<MapFallback />}>
              <PublicMap
                routes={routes ?? []}
                positions={visiblePositions}
                visibleRouteIds={filter}
                selectedRouteId={selRoute}
                now={now}
                timeoutSeconds={timeoutS}
                myPos={sharing.myPos ?? visitorPos}
                focus={focus}
                onSelectPosition={(id) => {
                  setSelPos(id);
                  setPanelOpen(true);
                }}
                onSelectRoute={(id) => {
                  setSelRoute(id);
                  setSelPos(null);
                  setPanelOpen(true);
                }}
              />
            </Suspense>
          </ClientOnly>
          <Button
            size="icon"
            variant="secondary"
            className="absolute right-3 top-24 z-[800] shadow-[var(--shadow-float)]"
            onClick={locateMe}
            aria-label="Centralizar na minha localização"
          >
            <Crosshair className="h-5 w-5" />
          </Button>
          {routes && activeCount === 0 && (
            <div className="pointer-events none absolute left-1/2 top-3 z-[800] -translate-x-1/2 rounded-full bg-card/95 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow">
              Nenhuma posição compartilhada no momento
            </div>
          )}
        </div>
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        routes={routes ?? []}
        loggedIn={!!user}
        onStart={(rid) => {
          setShareOpen(false);
          void sharing.start(rid);
        }}
      />
      <AdSlot />
    </div>
  );
}

function MapFallback() {
  return (
    <div className="grid h-full w-full place-items-center bg-muted text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

function Stats({ routes, active }: { routes: number | undefined; active: number }) {
  return (
    <div className="flex gap-4 text-left">
      <div>
        <div className="font-display text-2xl font-extrabold leading-none">{routes ?? "–"}</div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">linhas</div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 font-display text-2xl font-extrabold leading-none">
          {active}
          {active > 0 && <span className="h-2 w-2 animate-pulse rounded-full bg-success" />}
        </div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">compartilhando agora</div>
      </div>
    </div>
  );
}

function RouteList(props: {
  routes: RouteRow[] | null;
  loadError: string | null;
  filter: Set<string> | null;
  positions: LivePosition[];
  now: number;
  timeoutS: number;
  onToggle: (id: string) => void;
  onClear: () => void;
  onOpen: (id: string) => void;
}) {
  if (props.loadError) return <p className="text-sm text-destructive">{props.loadError}</p>;
  if (!props.routes)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando linhas…
      </p>
    );
  if (props.routes.length === 0)
    return <p className="text-sm text-muted-foreground">Nenhuma linha publicada ainda.</p>;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Linhas</h2>
        {props.filter && (
          <button className="text-xs text-primary underline" onClick={props.onClear}>
            Mostrar todas
          </button>
        )}
      </div>
      <ul className="space-y-1.5">
        {props.routes.map((r) => {
          const n = props.positions.filter(
            (p) => p.route_id === r.id && freshnessOf(p.updated_at, props.now, props.timeoutS) !== "stale",
          ).length;
          const on = !props.filter || props.filter.has(r.id);
          return (
            <li key={r.id} className={cn("flex items-center gap-2 rounded-xl border border-border p-2", !on && "opacity-50")}>
              <Checkbox checked={!!props.filter?.has(r.id)} onCheckedChange={() => props.onToggle(r.id)} aria-label={`Filtrar linha ${r.code}`} />
              <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => props.onOpen(r.id)}>
                <span className="grid h-8 min-w-10 place-items-center rounded-md px-1.5 text-xs font-bold text-primary-foreground" style={{ background: r.color }}>
                  {r.code}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {r.direction} · {formatDistance(r.distance_m)}
                  </span>
                </span>
                {n > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Bus className="h-3 w-3" /> {n}
                  </Badge>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RouteDetail(props: {
  r: RouteRow;
  positions: LivePosition[];
  now: number;
  timeoutS: number;
  onClose: () => void;
  onSelectPos: (id: string) => void;
}) {
  const { r } = props;
  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-10 min-w-12 place-items-center rounded-lg px-2 font-bold text-primary-foreground" style={{ background: r.color }}>
            {r.code}
          </span>
          <div>
            <h2 className="text-base font-bold leading-tight">{r.name}</h2>
            <p className="text-xs text-muted-foreground">Sentido: {r.direction}</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={props.onClose} aria-label="Fechar">
          <X className="h-4 w-4" />
        </Button>
      </div>
      {r.description && <p className="mb-3 text-sm">{r.description}</p>}
      <dl className="mb-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-muted p-2">
          <dt className="text-[11px] text-muted-foreground">Origem</dt>
          <dd className="font-medium">{r.origin_name || "—"}</dd>
        </div>
        <div className="rounded-lg bg-muted p-2">
          <dt className="text-[11px] text-muted-foreground">Destino</dt>
          <dd className="font-medium">{r.destination_name || "—"}</dd>
        </div>
        <div className="rounded-lg bg-muted p-2">
          <dt className="text-[11px] text-muted-foreground">Extensão aprox.</dt>
          <dd className="font-medium">{formatDistance(r.distance_m)}</dd>
        </div>
        <div className="rounded-lg bg-muted p-2">
          <dt className="text-[11px] text-muted-foreground">Atualizada</dt>
          <dd className="font-medium">{new Date(r.updated_at).toLocaleDateString("pt-BR")}</dd>
        </div>
      </dl>
      <h3 className="mb-1.5 text-sm font-semibold">Posições compartilhadas nesta linha</h3>
      {props.positions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum passageiro compartilhando esta linha agora.</p>
      ) : (
        <ul className="space-y-1.5">
          {props.positions.map((p) => {
            const f = freshnessOf(p.updated_at, props.now, props.timeoutS);
            return (
              <li key={p.public_id}>
                <button className="flex w-full items-center justify-between rounded-lg border border-border p-2 text-left text-sm" onClick={() => props.onSelectPos(p.public_id)}>
                  <span>{p.nickname ?? (p.contributor_kind === "visitor" ? "Colaborador anônimo" : "Colaborador")}</span>
                  <FreshBadge f={f} label={ageLabel(p.updated_at, props.now)} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FreshBadge({ f, label }: { f: string; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        f === "fresh" && "bg-success/15 text-success",
        f === "aging" && "bg-warning/20 text-accent-foreground",
        f === "stale" && "bg-destructive/15 text-destructive",
      )}
    >
      {f === "stale" ? "Desatualizada · " : ""}
      {label}
    </span>
  );
}

function PositionDetail(props: { p: LivePosition; route: RouteRow | undefined; now: number; timeoutS: number; onClose: () => void }) {
  const { p } = props;
  const f = freshnessOf(p.updated_at, props.now, props.timeoutS);
  const sig = signalLabel(p.accuracy);
  const tier = (TIERS[p.tier] ?? TIERS.none);
  return (
    <div>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Posição compartilhada por passageiro</p>
          <h2 className="text-base font-bold">
            {props.route ? `Linha ${props.route.code} · ${props.route.name}` : "Linha não identificada"}
          </h2>
        </div>
        <Button size="icon" variant="ghost" onClick={props.onClose} aria-label="Fechar">
          <X className="h-4 w-4" />
        </Button>
      </div>
      {f === "stale" && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Posição desatualizada: sem atualização há mais de {props.timeoutS} s. O ônibus pode estar em outro local.
        </div>
      )}
      <div className="space-y-2 text-sm">
        <Row k="1. Atualidade da posição">
          <FreshBadge f={f} label={ageLabel(p.updated_at, props.now)} />
          <span className="ml-1 text-xs text-muted-foreground">({new Date(p.updated_at).toLocaleTimeString("pt-BR")})</span>
        </Row>
        <Row k="2. Qualidade do sinal">
          <span className="flex items-center gap-1">
            <Signal className={cn("h-4 w-4", sig.level === "good" ? "text-success" : sig.level === "fair" ? "text-warning" : "text-destructive")} />
            {sig.label}
          </span>
        </Row>
        <Row k="3. Validação da sessão">{VALIDATION_LABEL[p.validation]}</Row>
        <Row k="Estado da sessão">{f === "stale" ? "Inativa (aguardando expiração)" : "Ativa"}</Row>
        <Row k="4. Experiência do colaborador">
          {p.contributor_kind === "visitor" ? (
            <span>Colaborador anônimo (visitante, sem reputação persistente)</span>
          ) : (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className={cn("bm-medal static inline-block", p.tier)} style={{ position: "static" }}>
                {tier.short}
              </span>
              {tier.label} — {tier.title}
              {p.nickname && <span className="text-muted-foreground">· {p.nickname}</span>}
            </span>
          )}
        </Row>
        {p.contributor_kind === "member" && (
          <>
            <Row k="Contribuições válidas">{p.valid_sessions ?? 0}</Row>
            <Row k="Experiência acumulada">{p.xp ?? 0} XP</Row>
          </>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
        Informação colaborativa, não oficial. O nível indica experiência na comunidade — não garante que a posição atual
        esteja correta. Não há integração com a empresa operadora ou a prefeitura.
      </p>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted px-2.5 py-2">
      <span className="text-[11px] text-muted-foreground">{k}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

function ShareDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  routes: RouteRow[];
  loggedIn: boolean;
  onStart: (routeId: string) => void;
}) {
  const [rid, setRid] = useState<string>("");
  const [consent, setConsent] = useState(false);
  useEffect(() => {
    if (!props.open) setConsent(false);
  }, [props.open]);
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="z-[1200] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compartilhar minha posição</DialogTitle>
          <DialogDescription>Ajude outros passageiros a saber onde o ônibus está.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-semibold">1. Em qual linha você está?</p>
            {props.routes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma linha publicada.</p>
            ) : (
              <div className="grid max-h-48 gap-1.5 overflow-y-auto">
                {props.routes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRid(r.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border p-2 text-left text-sm",
                      rid === r.id ? "border-primary bg-primary/10" : "border-border",
                    )}
                  >
                    <span className="grid h-7 min-w-9 place-items-center rounded px-1 text-xs font-bold text-primary-foreground" style={{ background: r.color }}>
                      {r.code}
                    </span>
                    <span className="truncate">
                      {r.name} <span className="text-muted-foreground">({r.direction})</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-lg bg-muted p-3 text-xs leading-relaxed">
            <p className="mb-1 text-sm font-semibold">2. Como sua localização é usada</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Sua posição é enviada a cada ~5 segundos apenas enquanto você compartilha.</li>
              <li>No mapa aparece somente a posição associada à linha — nunca nome, e-mail ou telefone.</li>
              <li>O trajeto detalhado não é público e as posições brutas são apagadas após 24 h.</li>
              <li>Você pode parar a qualquer momento. Com a página fechada ou em segundo plano o navegador pode suspender o GPS.</li>
              <li>{props.loggedIn ? "Sessões válidas somam experiência à sua conta." : "Como visitante, seu progresso fica só neste navegador e pode ser perdido."}</li>
            </ul>
            <Link to="/privacidade" className="mt-1 inline-block text-primary underline">
              Política de privacidade
            </Link>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
            Concordo em compartilhar minha localização em tempo real para esta finalidade.
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!rid || !consent} onClick={() => props.onStart(rid)}>
            <MapPin className="h-4 w-4" /> Compartilhar localização
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
