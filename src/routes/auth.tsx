import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — BusMap Macapá" },
      { name: "description", content: "Crie uma conta opcional para guardar medalhas e progresso." },
      { property: "og:title", content: "Entrar — BusMap Macapá" },
      { property: "og:description", content: "Conta opcional para colaboradores do BusMap Macapá." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        const { data: isAdmin } = await supabase.rpc("is_admin");
        nav({ to: isAdmin === true ? "/admin" : "/perfil" });
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast.success("Verifique seu e-mail para confirmar a conta.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Enviamos um link de recuperação para seu e-mail.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro de autenticação");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md p-4">
        <h1 className="mb-1 text-2xl font-extrabold">{mode === "up" ? "Criar conta" : mode === "reset" ? "Recuperar acesso" : "Entrar"}</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          A conta é opcional. Com ela você guarda nível, medalhas e histórico em qualquer dispositivo.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <Input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode !== "reset" && <Input type="password" required minLength={8} placeholder="Senha (mín. 8)" value={pw} onChange={(e) => setPw(e.target.value)} />}
          <Button className="w-full" disabled={busy}>{mode === "up" ? "Criar conta" : mode === "reset" ? "Enviar link" : "Entrar"}</Button>
        </form>
        <Button
          variant="outline"
          className="mt-3 w-full"
          onClick={async () => {
            const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
            if (r.error) toast.error("Não foi possível entrar com Google.");
          }}
        >
          Continuar com Google
        </Button>
        <div className="mt-4 flex flex-col gap-1 text-sm">
          <button className="text-left text-primary underline" onClick={() => setMode(mode === "up" ? "in" : "up")}>
            {mode === "up" ? "Já tenho conta" : "Criar uma conta"}
          </button>
          <button className="text-left text-primary underline" onClick={() => setMode("reset")}>Esqueci minha senha</button>
          <Link to="/" className="text-muted-foreground underline">Continuar como visitante</Link>
        </div>
      </main>
    </div>
  );
}
