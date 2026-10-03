import { useState, useCallback } from "react";

const commonDomains: Record<string, string[]> = {
  gmail: ["gmial", "gimal", "gmali", "gmaill", "gamil", "gimail", "gmaol", "gmaul", "gnail", "gmil", "gmai", "gmqil", "gmeil", "gmsil", "gmakl", "gmajl", "gmaik", "gmaip", "gmaiil", "gmaail", "ggmail", "gmaill", "gmall", "gamail", "gemail", "grmail", "gtmail", "gmaio", "gmal", "gmale", "gmil", "gml", "gmaili", "hmail", "gmaio"],
  hotmail: ["hotmal", "hotmial", "hotmali", "hotmaill", "hotmil", "hotmael", "hotmeil", "homail", "hotmai", "hotmqil", "hotamil", "hotmall", "htmail", "hotnail", "hotmial"],
  yahoo: ["yaho", "yahooo", "yahho", "yhaoo", "yaoo", "yohoo", "yhoo", "yahooi", "yaaho"],
  outlook: ["outlok", "outllok", "outlool", "outlock", "outloock", "outloo", "outlokk", "outluk", "oulook", "outolok"],
};

export function checkEmailTypo(email: string): { hasError: boolean; typo: string; correct: string } {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  if (!domain || !domain.includes(".")) return { hasError: false, typo: "", correct: "" };
  const domainName = domain.split(".")[0];
  for (const [correct, typos] of Object.entries(commonDomains)) {
    if (domainName === correct) return { hasError: false, typo: "", correct: "" };
    if (typos.includes(domainName)) {
      return { hasError: true, typo: domainName, correct };
    }
  }
  return { hasError: false, typo: "", correct: "" };
}

export function useEmailTypoCheck() {
  const [emailError, setEmailError] = useState<{ hasError: boolean; typo: string; correct: string }>({ hasError: false, typo: "", correct: "" });

  const handleEmailChange = useCallback((value: string, setter: (v: string) => void) => {
    setter(value);
    setEmailError(checkEmailTypo(value));
  }, []);

  return { emailError, handleEmailChange };
}
