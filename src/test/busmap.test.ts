import { describe, expect, it } from "vitest";
import { freshnessOf, polylineLength } from "@/lib/busmap";

describe("position freshness (60 s timeout)", () => {
  const now = Date.parse("2026-10-20T12:00:00Z");
  it("is fresh at 20 s", () => {
    expect(freshnessOf("2026-10-20T11:59:40Z", now, 60)).toBe("fresh");
  });
  it("is stale after 60 s, regardless of contributor level", () => {
    expect(freshnessOf("2026-10-20T11:58:59Z", now, 60)).toBe("stale");
  });
});

describe("route distance", () => {
  it("measures ~111 km for one degree of latitude", () => {
    const d = polylineLength([
      [0, -51],
      [1, -51],
    ]);
    expect(Math.round(d / 1000)).toBe(111);
  });
});
