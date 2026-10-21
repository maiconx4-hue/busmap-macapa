import { describe, expect, it } from "vitest";
import { insertPoint, pointHistory, routeDraftSchema, type PointHistory } from "@/lib/route-editor";

describe("route editor", () => {
  const empty: PointHistory = { past: [], present: [], future: [] };
  it("undoes and redoes addition, movement, deletion and clearing", () => {
    let state = pointHistory(empty, { type: "set", points: [[0, -51], [0.01, -51]] });
    state = pointHistory(state, { type: "set", points: [[0, -51], [0.02, -51]] });
    state = pointHistory(state, { type: "set", points: [[0, -51]] });
    state = pointHistory(state, { type: "set", points: [] });
    state = pointHistory(state, { type: "undo" });
    expect(state.present).toEqual([[0, -51]]);
    state = pointHistory(state, { type: "undo" });
    expect(state.present[1]).toEqual([0.02, -51]);
    state = pointHistory(state, { type: "undo" });
    expect(state.present[1]).toEqual([0.01, -51]);
    state = pointHistory(state, { type: "redo" });
    expect(state.present[1]).toEqual([0.02, -51]);
  });
  it("discards redo when a new point is added", () => {
    const state = pointHistory(pointHistory(pointHistory(empty, { type: "set", points: [[0, 0]] }), { type: "undo" }), { type: "set", points: [[1, 1]] });
    expect(state.future).toEqual([]);
  });
  it("inserts a correction on the nearest segment", () => {
    expect(insertPoint([[0, 0], [0, 2], [2, 2]], [0.1, 1])).toEqual([[0, 0], [0.1, 1], [0, 2], [2, 2]]);
  });
  it("rejects saving or publishing a route with fewer than two points", () => {
    const draft = { name: "Linha", code: "T", description: "", color: "#123456", direction: "ida", origin_name: "", destination_name: "", creation_method: "manual", active: true };
    for (const published of [false, true]) {
      expect(routeDraftSchema.safeParse({ ...draft, published, geometry: [[0, -51]] }).success).toBe(false);
      expect(routeDraftSchema.safeParse({ ...draft, published, geometry: [[0, -51], [0.01, -51]] }).success).toBe(true);
    }
  });
});