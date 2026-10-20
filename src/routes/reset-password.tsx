import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — BusMap Macapá" },
      { name: "description", content: "Defina uma nova senha." },
      { property: "og:title", content: "Nova senha — BusMap Macapá" },
      { property: "og:description", content: "Recuperação de acesso." },
    ],
  }),
  component: () => {
    const [pw, setPw] = useState("");
    const nav = useNavigate();
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="mb-4 text-2xl font-extrabold">Definir nova senha</h1>
        <Input type="password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nova senha" />
        <Button
          className="mt-3 w-full"
          onClick={async () => {
            const { error } = await supabase.auth.updateUser({ password: pw });
            if (error) { toast.error(error.message); return; }
            toast.success("Senha atualizada.");
            nav({ to: "/perfil" });
          }}
        >
          Salvar
        </Button>
      </main>
    );
  },
});
