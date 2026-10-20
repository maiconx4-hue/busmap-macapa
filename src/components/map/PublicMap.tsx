import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MACAPA_CENTER, TIERS, freshnessOf, type LivePosition, type RouteRow } from "@/lib/busmap";

const BUS_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>';

type Props = {
  routes: RouteRow[];
  positions: LivePosition[];
  visibleRouteIds: Set<string> | null;
  selectedRouteId: string | null;
  now: number;
  timeoutSeconds: number;
  myPos: [number, number] | null;
  focus: { at: [number, number]; zoom?: number; key: number } | null;
  onSelectPosition: (id: string) => void;
  onSelectRoute: (id: string) => void;
};

function iconFor(p: LivePosition, color: string, fresh: string) {
  const medalClass = p.contributor_kind === "visitor" ? "visitor" : p.tier;
  const medalText = p.contributor_kind === "visitor" ? "V" : TIERS[p.tier]?.short ?? "–";
  return L.divIcon({
    className: "",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `<div class="bm-marker ${fresh}"><div class="bm-bus" style="background:${color}">${BUS_SVG}</div><span class="bm-medal ${medalClass}">${medalText}</span>${fresh === "stale" ? '<span class="bm-stale-tag">DESATUALIZADA</span>' : ""}</div>`,
  });
}

export default function PublicMap(props: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const routeLayers = useRef(new Map<string, L.Polyline>());
  const markers = useRef(new Map<string, { m: L.Marker; sig: string }>());
  const me = useRef<L.Marker | null>(null);
  const cb = useRef(props);
  cb.current = props;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView(MACAPA_CENTER, 13);
    L.control.zoom({ position: "topright" }).addTo(m);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      routeLayers.current.clear();
      markers.current.clear();
      me.current = null;
    };
  }, []);

  // Routes (incremental)
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();
    for (const r of props.routes) {
      seen.add(r.id);
      const visible = !props.visibleRouteIds || props.visibleRouteIds.has(r.id);
      const selected = props.selectedRouteId === r.id;
      let layer = routeLayers.current.get(r.id);
      if (!layer) {
        layer = L.polyline(r.geometry, { color: r.color, weight: 5, opacity: 0.8 });
        layer.on("click", () => cb.current.onSelectRoute(r.id));
        routeLayers.current.set(r.id, layer);
      } else {
        layer.setLatLngs(r.geometry);
      }
      layer.setStyle({
        color: r.color,
        weight: selected ? 8 : 5,
        opacity: props.selectedRouteId && !selected ? 0.35 : 0.85,
      });
      if (visible && r.geometry.length > 1) {
        if (!m.hasLayer(layer)) layer.addTo(m);
        if (selected) layer.bringToFront();
      } else if (m.hasLayer(layer)) layer.remove();
    }
    for (const [id, layer] of routeLayers.current) {
      if (!seen.has(id)) {
        layer.remove();
        routeLayers.current.delete(id);
      }
    }
  }, [props.routes, props.visibleRouteIds, props.selectedRouteId]);

  // Markers (incremental: only setLatLng / setIcon when changed)
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const colors = new Map(props.routes.map((r) => [r.id, r.color]));
    const seen = new Set<string>();
    for (const p of props.positions) {
      const visible = !props.visibleRouteIds || (p.route_id && props.visibleRouteIds.has(p.route_id));
      if (!visible) continue;
      seen.add(p.public_id);
      const fresh = freshnessOf(p.updated_at, props.now, props.timeoutSeconds);
      const color = (p.route_id && colors.get(p.route_id)) || "#557";
      const sig = `${fresh}|${p.tier}|${p.contributor_kind}|${color}`;
      const existing = markers.current.get(p.public_id);
      if (!existing) {
        const mk = L.marker([p.lat, p.lng], { icon: iconFor(p, color, fresh), keyboard: true, title: "Posição compartilhada" });
        mk.on("click", () => cb.current.onSelectPosition(p.public_id));
        mk.addTo(m);
        markers.current.set(p.public_id, { m: mk, sig });
      } else {
        const ll = existing.m.getLatLng();
        if (ll.lat !== p.lat || ll.lng !== p.lng) existing.m.setLatLng([p.lat, p.lng]);
        if (existing.sig !== sig) {
          existing.m.setIcon(iconFor(p, color, fresh));
          existing.sig = sig;
        }
      }
    }
    for (const [id, v] of markers.current) {
      if (!seen.has(id)) {
        v.m.remove();
        markers.current.delete(id);
      }
    }
  }, [props.positions, props.routes, props.now, props.timeoutSeconds, props.visibleRouteIds]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!props.myPos) {
      me.current?.remove();
      me.current = null;
      return;
    }
    if (!me.current) {
      me.current = L.marker(props.myPos, {
        icon: L.divIcon({ className: "", html: '<div class="bm-me"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
        interactive: false,
      }).addTo(m);
    } else me.current.setLatLng(props.myPos);
  }, [props.myPos]);

  useEffect(() => {
    if (props.focus && map.current) map.current.flyTo(props.focus.at, props.focus.zoom ?? 16, { duration: 0.6 });
  }, [props.focus]);

  useEffect(() => {
    if (!props.selectedRouteId || !map.current) return;
    const layer = routeLayers.current.get(props.selectedRouteId);
    if (layer && layer.getLatLngs().length > 1) map.current.fitBounds(layer.getBounds(), { padding: [40, 40] });
  }, [props.selectedRouteId]);

  return <div ref={el} className="h-full w-full" role="application" aria-label="Mapa de Macapá" />;
}
