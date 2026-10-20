import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, getDeviceSecret } from "@/lib/busmap";

export type ShareStatus = "idle" | "requesting" | "starting" | "sharing" | "offline" | "error";

export type ShareResult = {
  evaluated: boolean;
  result?: "valid" | "invalid" | "unverified";
  reason?: string | null;
  xp?: number;
  duration?: number;
};

const SEND_INTERVAL_MS = 5000;

export function useSharing() {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [lastResult, setLastResult] = useState<ShareResult | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);

  const session = useRef<{ id: string; token: string } | null>(null);
  const watchId = useRef<number | null>(null);
  const latest = useRef<GeolocationPosition | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sending = useRef(false);

  const cleanupWatchers = () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const send = useCallback(async () => {
    const s = session.current;
    const p = latest.current;
    if (!s || !p || sending.current) return;
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }
    sending.current = true;
    try {
      const { data, error: err } = await supabase.rpc("push_location", {
        _session_id: s.id,
        _token: s.token,
        _lat: p.coords.latitude,
        _lng: p.coords.longitude,
        _accuracy: p.coords.accuracy,
        _heading: p.coords.heading ?? undefined,
      } as never);
      if (err) throw err;
      const res = data as { status: string; reason?: string };
      if (res.status === "ok") {
        setLastSentAt(Date.now());
        setRejected(null);
        setStatus("sharing");
      } else if (res.status === "rejected") {
        setRejected(
          res.reason === "fora_da_area"
            ? "Sua posição está fora da área atendida (Amapá)."
            : res.reason === "velocidade"
              ? "Movimento incompatível detectado; posição ignorada."
              : "Precisão do GPS muito baixa; posição ignorada.",
        );
        setStatus("sharing");
      } else if (res.status === "expired" || res.status === "ended") {
        session.current = null;
        cleanupWatchers();
        setStatus("error");
        setError("A sessão expirou por inatividade. Inicie novamente para continuar compartilhando.");
      }
    } catch (e) {
      const msg = friendlyError(e);
      if (!navigator.onLine || /conexão/.test(msg)) setStatus("offline");
      else {
        setError(msg);
        if (msg.includes("não é mais válida")) {
          session.current = null;
          cleanupWatchers();
          setStatus("error");
        }
      }
    } finally {
      sending.current = false;
    }
  }, []);

  const start = useCallback(
    async (rid: string) => {
      setError(null);
      setLastResult(null);
      if (!("geolocation" in navigator)) {
        setStatus("error");
        setError("Este navegador não oferece acesso ao GPS.");
        return;
      }
      setStatus("requesting");
      // Ask permission and get a first fix before opening a session.
      const first = await new Promise<GeolocationPosition | GeolocationPositionError>((resolve) =>
        navigator.geolocation.getCurrentPosition(resolve, resolve, { enableHighAccuracy: true, timeout: 20000 }),
      );
      if (!("coords" in first)) {
        setStatus("error");
        setError(
          first.code === first.PERMISSION_DENIED
            ? "Permissão de localização negada. Ative a localização para este site nas configurações do navegador."
            : first.code === first.TIMEOUT
              ? "O GPS demorou demais para responder. Tente em local aberto."
              : "Não foi possível obter sua localização (GPS indisponível).",
        );
        return;
      }
      latest.current = first;
      setMyPos([first.coords.latitude, first.coords.longitude]);
      setAccuracy(first.coords.accuracy);
      setStatus("starting");
      try {
        const { data, error: err } = await supabase.rpc("start_session", {
          _device_secret: getDeviceSecret(),
          _route_id: rid,
        });
        if (err) throw err;
        const d = data as { session_id: string; token: string };
        session.current = { id: d.session_id, token: d.token };
        sessionStorage.setItem("busmap.active_session", JSON.stringify(session.current));
        setRouteId(rid);
        watchId.current = navigator.geolocation.watchPosition(
          (pos) => {
            latest.current = pos;
            setMyPos([pos.coords.latitude, pos.coords.longitude]);
            setAccuracy(pos.coords.accuracy);
          },
          (e) => {
            if (e.code === e.PERMISSION_DENIED) {
              setError("A permissão de localização foi revogada.");
            } else setError("Sinal de GPS instável…");
          },
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 30000 },
        );
        timer.current = setInterval(send, SEND_INTERVAL_MS);
        await send();
        setStatus(navigator.onLine ? "sharing" : "offline");
      } catch (e) {
        setStatus("error");
        setError(friendlyError(e));
      }
    },
    [send],
  );

  const stop = useCallback(async () => {
    cleanupWatchers();
    const s = session.current;
    session.current = null;
    sessionStorage.removeItem("busmap.active_session");
    setStatus("idle");
    setRouteId(null);
    setMyPos(null);
    if (!s) return;
    try {
      const { data, error: err } = await supabase.rpc("end_session", { _session_id: s.id, _token: s.token });
      if (err) throw err;
      setLastResult(data as ShareResult);
    } catch (e) {
      setError("Compartilhamento interrompido. A sessão será encerrada automaticamente pelo servidor. " + friendlyError(e));
    }
  }, []);

  // Network recovery
  useEffect(() => {
    const on = () => {
      if (session.current) {
        setStatus("sharing");
        void send();
      }
    };
    const off = () => session.current && setStatus("offline");
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const vis = () => document.visibilityState === "visible" && session.current && void send();
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [send]);

  // Leftover session from a reload: end it so it doesn't linger.
  useEffect(() => {
    const raw = sessionStorage.getItem("busmap.active_session");
    if (raw) {
      sessionStorage.removeItem("busmap.active_session");
      try {
        const s = JSON.parse(raw) as { id: string; token: string };
        void supabase.rpc("end_session", { _session_id: s.id, _token: s.token });
      } catch {
        /* ignore */
      }
    }
    return () => cleanupWatchers();
  }, []);

  return { status, error, routeId, lastSentAt, accuracy, myPos, lastResult, rejected, start, stop, clearResult: () => setLastResult(null) };
}
