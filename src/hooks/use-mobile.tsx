import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsBelowBreakpoint(breakpoint: number) {
  const [matches, setMatches] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => {
      setMatches(window.innerWidth < breakpoint);
    };
    mql.addEventListener("change", onChange);
    setMatches(window.innerWidth < breakpoint);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return !!matches;
}

export function useIsMobile() {
  return useIsBelowBreakpoint(MOBILE_BREAKPOINT);
}

export function useIsTablet() {
  return useIsBelowBreakpoint(1024);
}
