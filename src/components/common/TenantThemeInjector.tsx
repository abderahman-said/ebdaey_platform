import { useEffect } from "react";

interface TenantThemeInjectorProps {
  primaryColor: string | null;
}

/**
 * Injects tenant's primary color as CSS custom properties
 * so all `bg-primary`, `text-primary`, `gradient-primary`, etc. adapt automatically.
 */
const TenantThemeInjector = ({ primaryColor }: TenantThemeInjectorProps) => {
  useEffect(() => {
    const color = primaryColor || "220 70% 50%";

    const root = document.documentElement;
    root.style.setProperty("--primary", color);
    root.style.setProperty("--ring", color);
    root.style.setProperty("--hero-gradient", `hsl(${color})`);
    root.style.setProperty("--sidebar-primary", color);

    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--hero-gradient");
      root.style.removeProperty("--sidebar-primary");
    };
  }, [primaryColor]);

  return null;
};

export default TenantThemeInjector;
