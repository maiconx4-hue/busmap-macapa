import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/use-auth";
import { RouteEditor } from "@/components/admin/RouteEditor";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração — BusMap Macapá" },
      { name: "description", content: "Área administrativa privada." },
      { property: "og:title", content: "Administração — BusMap Macapá" },
      { property: "og:description", content: "Área privada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { isAdmin, loading } = useAuth();
  return (
    <div className="min-h-screen">
      <AppHeader />
      {loading ? <p className="p-6">Verificando acesso…</p> : isAdmin ? <RouteEditor /> : <main className="p-6"><h1 className="text-xl font-bold">Acesso não autorizado.</h1></main>}
    </div>
  );
}
