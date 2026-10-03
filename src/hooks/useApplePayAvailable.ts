import { useEffect, useState } from "react";

export function useApplePayAvailable() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    try {
      const canMakePayments =
        typeof window !== "undefined" &&
        "ApplePaySession" in window &&
        (window as any).ApplePaySession?.canMakePayments?.() === true;
      setAvailable(!!canMakePayments);
    } catch {
      setAvailable(false);
    }
  }, []);

  return available;
}
