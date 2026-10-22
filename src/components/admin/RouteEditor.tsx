import { ClientOnly } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useReducer, useState } from "react";
import { Plus, Pencil, Undo2, Redo2, Trash2, Eraser, Eye, Save, Upload, Route as RouteIcon, MapPin, Move, LocateFixed, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pointHistory, routeDraftSchema, type RouteDraft } from "@/lib/route-editor";
import { formatDistance, polylineLength, type LatLng } from "@/lib/busmap";
import { listAdminRoutes, saveAdminRoute, deleteAdminRoute, calculateAdminRoute } from "@/lib/routes.functions";
import type { Database } from "@/integrations/supabase/types";
import type { MapTool } from "@/components/map/RouteEditorMap";

const EditorMap = lazy(() => import("@/components/map/RouteEditorMap"));
type Row = Database["public"]["Tables"]["routes"]["Row"];
const blank = (): RouteDraft => ({ name: "", code: "", description: "", color: "#e4572e", direction: "ida", origin_name: "", destination_name: "", geometry: [], creation_method: "manual", published: false, active: true });

export function RouteEditor() {
  const fetchRoutes = useServerFn(listAdminRoutes); const saveRoute = useServerFn(saveAdminRoute);
  const deleteRoute = useServerFn(deleteAdminRoute); const calculate = useServerFn(calculateAdminRoute);
  const client = useQueryClient();
  const routes = useQuery({ queryKey: ["admin-routes"], queryFn: () => fetchRoutes() });
  const [draft, setDraft] = useState<RouteDraft>(blank);
  const [history, dispatch] = useReducer(pointHistory, { past: [], present: [], future: [] });
  const [tool, setTool] = useState<MapTool>("add");
  const [origin, setOrigin] = useState<LatLng | null>(null); const [destination, setDestination] = useState<LatLng | null>(null);
  const [busy, setBusy] = useState(false); const [routing, setRouting] = useState(false); const [preview, setPreview] = useState(false);
  const [fitKey, setFitKey] = useState(0); const [dirty, setDirty] = useState(false);
  const [confirm, setConfirm] = useState<"clear" | "delete" | "new" | null>(null);
  const points = history.present;
  function update<K extends keyof RouteDraft>(key: K, value: RouteDraft[K]) { setDraft(d => ({ ...d, [key]: value })); setDirty(true); }
  function changePoints(next: LatLng[]) { dispatch({ type: "set", points: next }); setDirty(true); }
  function reset(row?: Row) {
    const next = row ? routeDraftSchema.parse({ ...row, description: row.description ?? "", origin_name: row.origin_name ?? "", destination_name: row.destination_name ?? "" }) : blank();
    setDraft(next); dispatch({ type: "reset", points: next.geometry }); setDirty(false);
    setOrigin(row && row.origin_lat != null && row.origin_lng != null ? [row.origin_lat, row.origin_lng] : null);
    setDestination(row && row.destination_lat != null && row.destination_lng != null ? [row.destination_lat, row.destination_lng] : null);
    setTool("add"); setPreview(false); setFitKey(k => k + 1);
  }
  async function save(published: boolean) {
    const parsed = routeDraftSchema.safeParse({ ...draft, geometry: points, published });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Confira os dados da linha."); return; }
    setBusy(true);
    try { const row = await saveRoute({ data: parsed.data }); reset(row); await client.invalidateQueries({ queryKey: ["admin-routes"] }); toast.success(published ? (draft.published ? "Alterações salvas; a rota continua publicada." : "Rota publicada no mapa.") : (draft.published ? "Rota despublicada; visível apenas para administradores." : "Rascunho salvo; visível apenas para administradores.")); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  }
  async function route() {
    if (!origin || !destination) { toast.error("Defina a origem e o destino."); return; }
    setRouting(true);
    try { const result = await calculate({ data: { origin, destination } }); if (result.geometry) { changePoints(result.geometry); setTool("move"); setFitKey(k => k + 1); } else toast.error(result.error); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível calcular."); }
    finally { setRouting(false); }
  }
  const toolbar: { tool: MapTool; label: string; icon: typeof Plus }[] = [
    { tool: "add", label: "Adicionar ponto ao final", icon: Plus }, { tool: "insert", label: "Inserir ponto no trajeto", icon: Pencil },
    { tool: "move", label: "Mover pontos", icon: Move }, { tool: "delete", label: "Excluir ponto", icon: Trash2 },
  ];
  return <div className="grid min-h-[calc(100dvh-3.5rem)] lg:grid-cols-[280px_minmax(0,1fr)]">
    <aside className="border-b border-border bg-card p-4 lg:border-b-0 lg:border-r">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Linhas</h2><Button size="icon" variant="outline" title="Nova rota" aria-label="Nova rota" onClick={() => dirty ? setConfirm("new") : reset()}><Plus /></Button></div>
      {routes.isPending ? <Loader2 className="animate-spin" aria-label="Carregando rotas" /> : routes.isError ? <div role="alert"><p className="text-sm">Não foi possível carregar as linhas.</p><Button variant="link" onClick={() => routes.refetch()}>Tentar novamente</Button></div> : routes.data?.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma linha cadastrada.</p> : <div className="flex gap-2 overflow-x-auto lg:flex-col">{routes.data?.map(row => <Button key={row.id} variant={draft.id === row.id ? "secondary" : "ghost"} className="h-auto min-w-40 justify-start whitespace-normal py-3 text-left" onClick={() => { if (dirty && !window.confirm("Descartar alterações não salvas?")) return; reset(row); }}><span className="min-w-0"><span className="block font-bold">{row.code} · {row.name}</span><span className="block text-xs text-muted-foreground">{row.direction} · {!row.published ? "Rascunho privado" : row.active ? "Publicada" : "Inativa"}</span></span></Button>)}</div>}
    </aside>
    <main className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 md:px-6"><div><h1 className="font-display text-2xl font-bold">Editor de rotas</h1><p className="text-sm text-muted-foreground">{draft.id ? `${draft.code} · ${draft.published ? "Publicada" : "Rascunho privado"}` : "Nova linha"}{dirty ? " · Alterações não salvas" : ""}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={points.length < 2 || busy || routing} onClick={() => setPreview(true)}><Eye />Prévia</Button>{draft.published ? <Button variant="outline" disabled={busy || routing} onClick={() => save(false)}>Despublicar</Button> : <Button variant="outline" disabled={busy || routing || points.length < 2} onClick={() => save(true)}><Upload />Publicar</Button>}<Button disabled={busy || routing} onClick={() => save(draft.published)}><Save />{busy ? "Salvando…" : draft.published ? "Salvar alterações" : "Salvar rascunho"}</Button></div></div>
      <div className="grid xl:grid-cols-[minmax(0,1fr)_290px]">
        <section className="min-w-0">
          <div className="flex flex-wrap gap-2 border-b p-3" role="group" aria-label="Modo de criação"><Button variant={draft.creation_method === "routed" ? "default" : "outline"} disabled={routing} onClick={() => update("creation_method", "routed")}><RouteIcon />A · Origem e destino</Button><Button variant={draft.creation_method === "manual" ? "default" : "outline"} disabled={routing} onClick={() => { update("creation_method", "manual"); setTool("add"); }}><Pencil />B · Desenho manual</Button></div>
          {draft.creation_method === "routed" && <div className="flex flex-wrap items-center gap-2 border-b p-3"><Button variant={tool === "origin" ? "default" : "outline"} onClick={() => setTool("origin")}><MapPin />Origem{origin ? " ✓" : ""}</Button><Button variant={tool === "destination" ? "default" : "outline"} onClick={() => setTool("destination")}><MapPin />Destino{destination ? " ✓" : ""}</Button><Button disabled={!origin || !destination || routing} onClick={route}>{routing ? <Loader2 className="animate-spin" /> : <RouteIcon />}{routing ? "Calculando…" : "Calcular trajeto"}</Button></div>}
          <div className="flex flex-wrap items-center gap-1 border-b p-3" role="toolbar" aria-label="Edição do trajeto">{toolbar.map(item => <Button key={item.tool} size="icon" variant={tool === item.tool ? "default" : "outline"} title={item.label} aria-label={item.label} aria-pressed={tool === item.tool} disabled={routing} onClick={() => setTool(item.tool)}><item.icon /></Button>)}<span className="mx-1 h-6 border-l" /><Button size="icon" variant="ghost" aria-label="Desfazer" title="Desfazer" disabled={!history.past.length || routing} onClick={() => { dispatch({ type: "undo" }); setDirty(true); }}><Undo2 /></Button><Button size="icon" variant="ghost" aria-label="Refazer" title="Refazer" disabled={!history.future.length || routing} onClick={() => { dispatch({ type: "redo" }); setDirty(true); }}><Redo2 /></Button><Button size="icon" variant="ghost" aria-label="Limpar trajeto" title="Limpar trajeto" disabled={!points.length || routing} onClick={() => setConfirm("clear")}><Eraser /></Button><Button size="icon" variant="ghost" aria-label="Enquadrar trajeto" title="Enquadrar trajeto" onClick={() => setFitKey(k => k + 1)}><LocateFixed /></Button><span className="ml-auto text-xs text-muted-foreground">{points.length} pontos · ≈ {formatDistance(polylineLength(points))}</span></div>
          <div className="relative h-[480px] min-w-0 md:h-[600px]"><ClientOnly fallback={<div className="grid h-full place-items-center bg-muted">Carregando mapa…</div>}><Suspense fallback={<div className="grid h-full place-items-center bg-muted">Carregando mapa…</div>}><EditorMap points={points} color={draft.color} tool={tool} preview={preview} fitKey={fitKey} origin={origin} destination={destination} onPoints={changePoints} onEndpoint={(kind, at) => { if (kind === "origin") { setOrigin(at); setTool("destination"); } else { setDestination(at); setTool("move"); } setDirty(true); }} /></Suspense></ClientOnly>{preview && <div className="absolute inset-x-3 bottom-3 z-[500] flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card p-3 shadow-float"><div><strong>{draft.code || "Linha"} · {draft.name || "Nova linha"}</strong><p className="text-xs text-muted-foreground">{draft.origin_name || "Origem"} → {draft.destination_name || "Destino"} · ≈ {formatDistance(polylineLength(points))}</p></div><Button variant="outline" onClick={() => setPreview(false)}><X />Voltar à edição</Button><Button disabled={busy || !draft.active} onClick={() => save(true)}><Upload />Publicar rota</Button></div>}</div>
        </section>
        <section className="space-y-4 border-t p-4 xl:border-l xl:border-t-0"><h2 className="font-display text-lg font-bold">Dados da linha</h2><div className="space-y-1"><Label htmlFor="route-code">Código</Label><Input id="route-code" value={draft.code} maxLength={20} onChange={e => update("code", e.target.value)} /></div><div className="space-y-1"><Label htmlFor="route-name">Nome</Label><Input id="route-name" value={draft.name} maxLength={120} onChange={e => update("name", e.target.value)} /></div><div className="space-y-1"><Label htmlFor="route-direction">Sentido</Label><Select value={draft.direction} onValueChange={value => { if (value === "ida" || value === "volta" || value === "circular") update("direction", value); }}><SelectTrigger id="route-direction"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ida">Ida</SelectItem><SelectItem value="volta">Volta</SelectItem><SelectItem value="circular">Circular</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label htmlFor="route-color">Cor no mapa</Label><Input id="route-color" type="color" className="h-10 w-16 cursor-pointer p-1" value={draft.color} onChange={e => update("color", e.target.value)} /></div><div className="space-y-1"><Label htmlFor="route-origin">Nome da origem</Label><Input id="route-origin" value={draft.origin_name} onChange={e => update("origin_name", e.target.value)} /></div><div className="space-y-1"><Label htmlFor="route-destination">Nome do destino</Label><Input id="route-destination" value={draft.destination_name} onChange={e => update("destination_name", e.target.value)} /></div><div className="space-y-1"><Label htmlFor="route-description">Descrição</Label><Textarea id="route-description" value={draft.description} onChange={e => update("description", e.target.value)} /></div><div className="flex items-center justify-between"><Label htmlFor="route-active">Linha ativa</Label><Switch id="route-active" checked={draft.active} onCheckedChange={value => update("active", value)} /></div>{draft.id && <Button variant="destructive" disabled={busy} onClick={() => setConfirm("delete")}><Trash2 />Excluir rota</Button>}</section>
      </div>
      <Dialog open={confirm !== null} onOpenChange={open => { if (!open) setConfirm(null); }}><DialogContent><DialogHeader><DialogTitle>{confirm === "delete" ? "Excluir esta rota?" : confirm === "new" ? "Descartar alterações?" : "Limpar o trajeto?"}</DialogTitle><DialogDescription>{confirm === "delete" ? "A rota será removida permanentemente." : confirm === "new" ? "As alterações não salvas serão perdidas." : "Todos os pontos serão removidos. Você pode desfazer essa ação."}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirm(null)}>Cancelar</Button><Button variant="destructive" disabled={busy} onClick={async () => { if (confirm === "clear") changePoints([]); else if (confirm === "new") reset(); else if (draft.id) { setBusy(true); try { await deleteRoute({ data: { id: draft.id } }); reset(); await client.invalidateQueries({ queryKey: ["admin-routes"] }); toast.success("Rota excluída."); } catch { toast.error("Não foi possível excluir a rota."); } finally { setBusy(false); } } setConfirm(null); }}>Confirmar</Button></DialogFooter></DialogContent></Dialog>
    </main>
  </div>;
}