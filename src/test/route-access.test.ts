import { describe, expect, it } from "vitest";
import { assertRouteAdmin } from "@/lib/route-access";

describe("route administration permission", () => {
  it("denies authenticated non-admins", async () => {
    await expect(assertRouteAdmin({ rpc: async () => ({ data: false, error: null }) })).rejects.toThrow("Acesso não autorizado.");
  });
  it("denies access if the database permission check fails", async () => {
    await expect(assertRouteAdmin({ rpc: async () => ({ data: true, error: new Error("offline") }) })).rejects.toThrow("Acesso não autorizado.");
  });
  it("allows only a confirmed admin result", async () => {
    await expect(assertRouteAdmin({ rpc: async () => ({ data: true, error: null }) })).resolves.toBeUndefined();
    await expect(assertRouteAdmin({ rpc: async () => ({ data: null, error: null }) })).rejects.toThrow("Acesso não autorizado.");
  });
});