import { z } from "zod";
import type { LatLng } from "@/lib/busmap";

export const coordinateSchema = z.tuple([z.number().finite().min(-90).max(90), z.number().finite().min(-180).max(180)]);
export const routeDraftSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe um nome com pelo menos dois caracteres.").max(120),
  code: z.string().trim().min(1, "Informe o código.").max(20),
  description: z.string().max(2000),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  direction: z.enum(["ida", "volta", "circular"]),
  origin_name: z.string().trim().max(150),
  destination_name: z.string().trim().max(150),
  geometry: z.array(coordinateSchema).min(2, "Adicione pelo menos dois pontos.").max(10000),
  creation_method: z.enum(["routed", "manual"]),
  published: z.boolean(),
  active: z.boolean(),
});
export type RouteDraft = z.infer<typeof routeDraftSchema>;
export type PointHistory = { past: LatLng[][]; present: LatLng[]; future: LatLng[][] };
export type PointAction = { type: "set"; points: LatLng[] } | { type: "undo" } | { type: "redo" } | { type: "reset"; points: LatLng[] };
export function pointHistory(state: PointHistory, action: PointAction): PointHistory {
  if (action.type === "reset") return { past: [], present: action.points, future: [] };
  if (action.type === "set") {
    if (JSON.stringify(state.present) === JSON.stringify(action.points)) return state;
    return { past: [...state.past.slice(-49), state.present], present: action.points, future: [] };
  }
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    return previous ? { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] } : state;
  }
  const next = state.future[0];
  return next ? { past: [...state.past, state.present], present: next, future: state.future.slice(1) } : state;
}

export function insertPoint(points: LatLng[], at: LatLng): LatLng[] {
  if (points.length < 2) return [...points, at];
  let best = Infinity;
  let index = points.length;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]; const b = points[i];
    if (!a || !b) continue;
    const dx = b[0] - a[0]; const dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((at[0] - a[0]) * dx + (at[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const distance = (at[0] - a[0] - t * dx) ** 2 + (at[1] - a[1] - t * dy) ** 2;
    if (distance < best) { best = distance; index = i; }
  }
  return [...points.slice(0, index), at, ...points.slice(index)];
}