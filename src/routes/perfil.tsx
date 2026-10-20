import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { TIERS, getDeviceSecret } from "@/lib/busmap";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — BusMap Macapá" },
      { name: "description", content: "Nível, medalhas e contribuições." },
      { property: "og:title", content: "Meu perfil — BusMap Macapá" },
      { property: "og:description", content: "Seu progresso como colaborador." },
    ],
  }),
  component: Perfil,
});

type Prog = { xp: number; tier: string; valid_sessions: number; active_days: number; first_contribution_at: string | null };

function Perfil() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [prog, setProg] = useState<Prog | null>(null);
  const [nick, setNick] = useState("");
  const [show, setShow] = useState(false);
  const [hist, setHist] = useState<{ id: string; status: string; xp_awarded: number; started_at: string; reason: string | null }[]>([]);
  const [ach, setAch] = useState<{ code: string; name: string; description: string; earned: boolean }[]>([]);
  const [levels, setLevels] = useState<{ tier: string; min_xp: number }[]>([]);

  const load = async () => {
    if (!user) return;
    const [p, pr, c, a, ua, lv] = await Promise.all([
      supabase.from("user_progress").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("contributions").select("id,status,xp_awarded,started_at,reason").eq("user_id", user.id).order("started_at", { ascending: false }).limit(20),
      supabase.from("achievements").select("*").order("sort"),
      supabase.from("user_achievements").select("achievement_code").eq("user_id", user.id),
      supabase.from("app_settings").select("value").eq("key", "levels").maybeSingle(),
    ]);
    setProg((p.data as Prog) ?? null);
    setNick(pr.data?.nickname ?? "");
    setShow(!!pr.data?.show_on_map);
    setHist(c.data ?? []);
    const got = new Set((ua.data ?? []).map((x) => x.achievement_code));
    setAch((a.data ?? []).map((x) => ({ ...x, earned: got.has(x.code) })));
    setLevels((lv.data?.value as { tier: string; min_xp: number }[]) ?? []);
  };

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
    if (user) {
      // Link this browser's visitor progress (proved by holding the local secret).
      void supabase.rpc("claim_device", { _device_secret: getDeviceSecret() }).then(({ data }) => {
        const n = (data as { claimed?: number } | null)?.claimed ?? 0;
        if (n > 0) toast.success(`${n} contribuição(ões) de visitante associadas à sua conta.`);
        void load();
      });
    }
  }, [user, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;
  const tier = TIERS[prog?.tier ?? "none"] ?? TIERS.none;
  const idx = levels.findIndex((l) => l.tier === prog?.tier);
  const next = levels[idx + 1];
  const pct = next ? Math.min(100, ((prog?.xp ?? 0) / next.min_xp) * 100) : 100;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-2xl space-y-5 p-4">
        <section className="rounded-2xl bg-primary p-5 text-primary-foreground">
          <p className="text-sm opacity-80">{nick || "Colaborador"}</p>
          <h1 className="text-3xl font-extrabold">{tier.label} · {tier.title}</h1>
          <p className="mt-1 text-sm">{prog?.xp ?? 0} XP · {prog?.valid_sessions ?? 0} sessões válidas · {prog?.active_days ?? 0} dias ativos</p>
          <Progress value={pct} className="mt-3 bg-primary-foreground/20" />
          <p className="mt-1 text-xs opacity-80">{next ? `Próximo nível: ${TIERS[next.tier]?.label} (${next.min_xp} XP e critérios de regularidade)` : "Nível máximo"}</p>
          <p className="mt-1 text-xs opacity-80">Primeira contribuição: {prog?.first_contribution_at ? new Date(prog.first_contribution_at).toLocaleDateString("pt-BR") : "—"} · Membro desde {new Date(user.created_at).toLocaleDateString("pt-BR")}</p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">Conquistas</h2>
          <div className="grid grid-cols-2 gap-2">
            {ach.map((a) => (
              <div key={a.code} className={`rounded-xl border border-border p-3 text-sm ${a.earned ? "" : "opacity-40"}`}>
                <b>{a.name}</b>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-bold">Histórico recente</h2>
          {hist.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma contribuição ainda. <Link to="/" className="text-primary underline">Compartilhe numa viagem</Link>.</p> : (
            <ul className="space-y-1 text-sm">
              {hist.map((h) => (
                <li key={h.id} className="flex justify-between rounded-lg bg-muted p-2">
                  <span>{new Date(h.started_at).toLocaleString("pt-BR")} — {h.status === "valid" ? "Válida" : h.status === "invalid" ? "Inválida" : "Não avaliada"}{h.reason ? ` (${h.reason})` : ""}</span>
                  <b>+{h.xp_awarded}</b>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2 rounded-xl border border-border p-4">
          <h2 className="font-bold">Privacidade</h2>
          <Input placeholder="Apelido público (opcional)" value={nick} maxLength={30} onChange={(e) => setNick(e.target.value)} />
          <label className="flex items-center gap-2 text-sm"><Switch checked={show} onCheckedChange={setShow} /> Mostrar apelido no mapa (senão: anônimo)</label>
          <Button
            onClick={async () => {
              const { error } = await supabase.from("profiles").update({ nickname: nick.trim() || null, show_on_map: show }).eq("id", user.id);
              if (error) { toast.error(error.message); return; }
              toast.success("Salvo.");
            }}
          >Salvar</Button>
        </section>

        <section className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/" }); }}>Sair</Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!confirm("Excluir seus dados pessoais e progresso? Contribuições agregadas serão anonimizadas.")) return;
              const { error } = await supabase.rpc("prepare_account_deletion");
              if (error) { toast.error(error.message); return; }
              await supabase.auth.signOut();
              toast.success("Dados pessoais removidos. A remoção final do login é processada pela equipe.");
              nav({ to: "/" });
            }}
          >Excluir meus dados</Button>
        </section>
      </main>
    </div>
  );
}
