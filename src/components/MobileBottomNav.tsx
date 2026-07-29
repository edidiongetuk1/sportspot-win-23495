import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ClipboardList, ShieldCheck, Trophy, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const MobileBottomNav = () => {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkRole = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!userId) {
        if (isMounted) setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (isMounted) setIsAdmin(!!data);
    };

    checkRole();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkRole();
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const params = new URLSearchParams(location.search);
  const activeTab = params.get("tab") || "open";

  const items = useMemo(() => {
    const baseItems = [
      {
        label: "Wagers",
        href: "/mobile-wagers?tab=open",
        icon: Trophy,
        active: (location.pathname === "/" || location.pathname === "/mobile-wagers") && activeTab !== "mywagers" && activeTab !== "admin",
      },
      {
        label: "My Wagers",
        href: "/mobile-wagers?tab=mywagers",
        icon: ClipboardList,
        active: location.pathname === "/mobile-wagers" && activeTab === "mywagers",
      },
      {
        label: "Wallet",
        href: "/dashboard",
        icon: Wallet,
        active: location.pathname === "/dashboard",
      },
    ];

    if (isAdmin) {
      baseItems.push({
        label: "Admin",
        href: "/admin",
        icon: ShieldCheck,
        active: location.pathname === "/admin",
      });
    }

    return baseItems;
  }, [activeTab, isAdmin, location.pathname]);

  if (["/auth", "/terms", "/privacy"].includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-gold backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1 data-[admin=true]:grid-cols-4" data-admin={isAdmin}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-muted-foreground transition-all duration-300",
                item.active && "bg-primary text-primary-foreground shadow-gold scale-95"
              )}
              aria-current={item.active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};