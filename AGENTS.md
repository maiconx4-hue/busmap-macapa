<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Route editing lives under the client-gated authenticated admin subtree; every operation uses an authenticated server function that checks is_admin and uses the caller's RLS client, so UI access cannot grant privileges.
- Route editor geometry uses latitude/longitude tuples with a shared undo/redo reducer; Leaflet editor imports are lazy and client-only to preserve SSR safety.
- OSRM requests use an operator-controlled HTTPS endpoint (OSRM_BASE_URL, default public OSRM demo); callers supply coordinates only to prevent arbitrary server requests.
