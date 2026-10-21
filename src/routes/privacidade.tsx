import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Privacidade (LGPD) — BusMap Macapá" },
      { name: "description", content: "Como o BusMap Macapá trata sua localização e seus dados." },
      { property: "og:title", content: "Privacidade — BusMap Macapá" },
      { property: "og:description", content: "Política de privacidade compatível com a LGPD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="min-h-screen">
      <AppHeader />
      <main className="prose mx-auto max-w-2xl space-y-3 p-4 text-sm">
        <h1 className="text-2xl font-extrabold">Política de privacidade</h1>
        <p><b>Finalidade:</b> mostrar a outros passageiros posições recentes associadas a uma linha de ônibus. Base legal: consentimento (LGPD art. 7º, I).</p>
        <p><b>O que coletamos:</b> coordenadas e precisão do GPS somente enquanto você compartilha; um identificador aleatório do navegador (guardamos apenas um resumo criptográfico); e, se criar conta, e-mail e apelido opcional.</p>
        <p><b>O que é público:</b> apenas a posição atual ligada à linha, a medalha/nível e, se você permitir, seu apelido. Nunca nome real, e-mail ou trajeto detalhado.</p>
        <p><b>Retenção:</b> posições brutas são apagadas após 24 horas. Contribuições agregadas (duração, pontuação) são mantidas para o sistema de níveis.</p>
        <p><b>Seus direitos:</b> você pode parar o compartilhamento a qualquer momento e excluir sua conta no perfil; os registros agregados são anonimizados, mantendo apenas o necessário para obrigações legais.</p>
        <p>As posições são colaborativas e não oficiais; não há vínculo com empresas de transporte ou órgãos públicos.</p>
      </main>
    </div>
  ),
});
