import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { coordinateSchema, routeDraftSchema } from "@/lib/route-editor";
import { polylineLength, type LatLng } from "@/lib/busmap";
import { assertRouteAdmin } from "@/lib/route-access";

export const listAdminRoutes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRouteAdmin(context.supabase);
    const { data, error } = await context.supabase.from("routes").select("*").order("code");
    if (error) throw new Error("Não foi possível carregar as rotas.");
    return data;
  });

export const saveAdminRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => routeDraftSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertRouteAdmin(context.supabase);
    const { id, ...draft } = data;
    const first = draft.geometry[0]; const last = draft.geometry.at(-1);
    if (!first || !last) throw new Error("Adicione pelo menos dois pontos.");
    const record = { ...draft, distance_m: polylineLength(draft.geometry), waypoints: draft.geometry,
      origin_lat: first[0], origin_lng: first[1], destination_lat: last[0], destination_lng: last[1] };
    const query = id
      ? context.supabase.from("routes").update(record).eq("id", id)
      : context.supabase.from("routes").insert({ ...record, created_by: context.userId });
    const { data: saved, error } = await query.select("*").single();
    if (error) throw new Error(error.code === "23505" ? "Já existe uma linha com esse código e sentido." : "Não foi possível salvar a rota.");
    return saved;
  });

export const deleteAdminRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertRouteAdmin(context.supabase);
    const { error, data: removed } = await context.supabase.from("routes").delete().eq("id", data.id).select("id");
    if (error || !removed?.length) throw new Error("Não foi possível excluir a rota.");
    return { ok: true };
  });

export const calculateAdminRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ origin: coordinateSchema, destination: coordinateSchema }).parse(input))
  .handler(async ({ data, context }) => {
    await assertRouteAdmin(context.supabase);
    // Only an operator-configured endpoint is accepted, never a URL supplied by a caller.
    const base = process.env["OSRM_BASE_URL"] || "https://router.project-osrm.org";
    const endpoint = new URL(base);
    if (endpoint.protocol !== "https:") throw new Error("O serviço de roteamento precisa usar HTTPS.");
    const coordinates = [data.origin, data.destination].map(([lat, lng]) => `${lng},${lat}`).join(";");
    endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}/route/v1/driving/${coordinates}`;
    endpoint.search = "overview=full&geometries=geojson&steps=false";
    try {
      // The public OSRM demo rejects requests without an identifying User-Agent (403 from worker runtimes).
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": "BusMapMacapa/1.0 (https://busmap-macapa.lovable.app)", Accept: "application/json" },
      });
      if (!response.ok) throw new Error("routing_unavailable");
      const result = z.object({ code: z.string(), routes: z.array(z.object({ geometry: z.object({ coordinates: z.array(z.tuple([z.number(), z.number()])) }) })).optional() }).parse(await response.json());
      const route = result.routes?.[0];
      if (result.code !== "Ok" || !route) return { geometry: null, error: "Nenhum trajeto encontrado entre esses pontos." };
      const geometry: LatLng[] = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      z.array(coordinateSchema).min(2).max(10000).parse(geometry);
      return { geometry, error: null };
    } catch (error) {
      console.error("routing_failed", error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      return { geometry: null, error: "O serviço de roteamento está indisponível. Tente novamente ou use o desenho manual." };
    }
  });