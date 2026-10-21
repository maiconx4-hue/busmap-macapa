export async function assertRouteAdmin(client: { rpc: (name: "is_admin") => PromiseLike<{ data: unknown; error: unknown }> }) {
  const { data, error } = await client.rpc("is_admin");
  if (error || data !== true) throw new Error("Acesso não autorizado.");
}