import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MACAPA_CENTER, type LatLng } from "@/lib/busmap";
import { insertPoint } from "@/lib/route-editor";

export type MapTool = "add" | "insert" | "move" | "delete" | "origin" | "destination";
type Props = { points: LatLng[]; color: string; tool: MapTool; preview: boolean; fitKey: number; origin: LatLng | null; destination: LatLng | null;
  onPoints: (points: LatLng[]) => void; onEndpoint: (kind: "origin" | "destination", at: LatLng) => void };

export default function RouteEditorMap(props: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<L.LayerGroup | null>(null);
  const current = useRef(props); current.current = props;
  useEffect(() => {
    if (!element.current) return;
    const m = L.map(element.current, { zoomControl: false }).setView(MACAPA_CENTER, 13);
    L.control.zoom({ position: "topright" }).addTo(m);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
    map.current = m; layers.current = L.layerGroup().addTo(m);
    m.on("click", (event: L.LeafletMouseEvent) => {
      const p = current.current;
      if (p.preview) return;
      const at: LatLng = [event.latlng.lat, event.latlng.lng];
      if (p.tool === "origin" || p.tool === "destination") p.onEndpoint(p.tool, at);
      else if (p.tool === "add") p.onPoints([...p.points, at]);
      else if (p.tool === "insert") p.onPoints(insertPoint(p.points, at));
    });
    const resize = new ResizeObserver(() => m.invalidateSize()); resize.observe(element.current);
    return () => { resize.disconnect(); m.remove(); map.current = null; layers.current = null; };
  }, []);
  useEffect(() => {
    const group = layers.current;
    if (!group) return;
    group.clearLayers();
    if (props.points.length > 1) L.polyline(props.points, { color: props.color, weight: 6, opacity: 0.9 }).addTo(group);
    props.points.forEach((point, index) => {
      if (props.preview && index !== 0 && index !== props.points.length - 1) return;
      const marker = L.marker(point, { draggable: !props.preview && props.tool === "move", keyboard: true,
        title: `Ponto ${index + 1}`, icon: L.divIcon({ className: "", html: `<div class="bm-vertex ${index === 0 ? "start" : index === props.points.length - 1 ? "end" : ""}"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] }) });
      marker.on("click", () => { const p = current.current; if (!p.preview && p.tool === "delete") p.onPoints(p.points.filter((_, i) => i !== index)); });
      marker.on("dragend", () => { const at = marker.getLatLng(); current.current.onPoints(current.current.points.map((value, i) => i === index ? [at.lat, at.lng] : value)); });
      marker.addTo(group);
    });
    if (!props.preview) for (const [label, at] of [["Origem", props.origin], ["Destino", props.destination]] as const) {
      if (at) L.marker(at, { icon: L.divIcon({ className: "", html: `<span class="bm-endpoint">${label}</span>`, iconSize: [64, 22], iconAnchor: [32, 22] }) }).addTo(group);
    }
  }, [props.points, props.color, props.preview, props.tool, props.origin, props.destination]);
  useEffect(() => {
    const m = map.current;
    const points = current.current.points;
    if (m && points.length > 1) m.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
  }, [props.fitKey, props.preview]);
  return <div ref={element} className="h-full w-full" role="application" aria-label={props.preview ? "Prévia da rota" : "Mapa do editor de rotas"} />;
}