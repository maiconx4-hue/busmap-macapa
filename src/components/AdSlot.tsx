import { useEffect, useRef } from "react";

// Fill these with your Google AdSense publisher and ad-unit IDs to serve real ads.
const ADSENSE_CLIENT = import.meta.env["VITE_ADSENSE_CLIENT"] as string | undefined; // ex.: ca-pub-XXXXXXXX
const ADSENSE_SLOT = import.meta.env["VITE_ADSENSE_SLOT"] as string | undefined;

/** Discreet fixed ad strip at the bottom of the screen (mobile only). */
export function AdSlot() {
  const loaded = useRef(false);
  useEffect(() => {
    if (!ADSENSE_CLIENT || !ADSENSE_SLOT || loaded.current) return;
    loaded.current = true;
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
    try {
      const w = window as unknown as { adsbygoogle: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <aside
      aria-label="Publicidade"
      className="fixed inset-x-0 bottom-0 z-[1100] flex h-[52px] items-center justify-center border-t border-border bg-card/95 backdrop-blur md:hidden"
    >
      <span className="absolute left-2 top-1 text-[9px] uppercase tracking-wider text-muted-foreground">Publicidade</span>
      {ADSENSE_CLIENT && ADSENSE_SLOT ? (
        <ins
          className="adsbygoogle"
          style={{ display: "inline-block", width: 320, height: 50 }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={ADSENSE_SLOT}
        />
      ) : (
        <div className="flex h-[50px] w-[320px] items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">
          Espaço publicitário 320×50
        </div>
      )}
    </aside>
  );
}
