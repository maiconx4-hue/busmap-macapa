import { Link } from "@tanstack/react-router";
import { Bus, Settings, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const { user } = useAuth();
  return (
    <header className="z-[1000] flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-primary px-3 text-primary-foreground md:px-5">
      <Link to="/" className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-foreground">
          <Bus className="h-5 w-5" />
        </span>
        <span className="font-display text-lg font-bold leading-none">
          BusMap <span className="text-accent">Macapá</span>
        </span>
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        <Link to="/privacidade" className="hidden rounded-md px-3 py-1.5 opacity-80 hover:opacity-100 sm:inline">
          Privacidade
        </Link>
        <Button asChild variant="ghost" size="icon" className="hover:bg-primary-foreground/10 hover:text-primary-foreground">
          <Link to="/admin" aria-label="Painel administrativo" title="Painel administrativo">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
        <Link
          to={user ? "/perfil" : "/auth"}
          className="flex items-center gap-1.5 rounded-md bg-primary-foreground/10 px-3 py-1.5 font-medium hover:bg-primary-foreground/20"
        >
          <User className="h-4 w-4" />
          {user ? "Meu perfil" : "Entrar"}
        </Link>
      </nav>
    </header>
  );
}
