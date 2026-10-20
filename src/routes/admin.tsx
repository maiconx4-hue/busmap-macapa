import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração — BusMap Macapá" },
      { name: "description", content: "Área administrativa privada." },
      { property: "og:title", content: "Administração — BusMap Macapá" },
      { property: "og:description", content: "Área privada." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    if (isAdmin) void supabase.rpc("admin_stats").then(({ data }) => setStats(data as Record<string, number>));
  }, [isAdmin]);
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl p-4">
        {loading ? null : !user ? (
          <p>Acesso restrito. <Link to="/auth" className="text-primary underline">Entrar</Link></p>
        ) : !isAdmin ? (
          <p>Acesso não autorizado.</p>
        ) : (
          <>
            <h1 className="mb-4 text-2xl font-extrabold">Painel administrativo</h1>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stats && Object.entries(stats).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-muted p-3"><div className="text-2xl font-bold">{v}</div><div className="text-xs text-muted-foreground">{k}</div></div>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">O editor de rotas (origem/destino e desenho manual) é a próxima etapa.</p>
          </>
        )}
      </main>
    </div>
  );
}
