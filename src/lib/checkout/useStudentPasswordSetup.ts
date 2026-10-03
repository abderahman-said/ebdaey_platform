import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PasswordSetupBody =
  | { order_id: string; password: string }
  | { digital_product_purchase_id: string; password: string }
  | { live_course_purchase_id: string; password: string }
  | { subscription_purchase_id: string; password: string };

interface Options {
  fallbackEmail?: string;
  onSuccess?: () => void;
  existingAccount?: boolean;
}

// Supabase's FunctionsHttpError only says "non-2xx status code"; the real
// message lives in the untouched Response body attached as `context`.
async function extractFunctionError(error: unknown, fallback: string) {
  const ctx = (error as any)?.context;
  try {
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.clone().json();
      if (body?.error) return String(body.error);
    } else if (ctx?.error) {
      return String(ctx.error);
    }
  } catch {
    // body was not JSON – fall through to the generic message
  }
  return (error as any)?.message || fallback;
}

export function useStudentPasswordSetup(

  buildBody: (password: string) => PasswordSetupBody | null,
  options: Options = {},
) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [needsExistingPassword, setNeedsExistingPassword] = useState(false);

  const p = (k: string) => t(`coursePage.checkout.password.${k}`);

  const submit = async (password: string) => {
    setServerError(null);
    const existingAccountMode = options.existingAccount || needsExistingPassword;
    const body = existingAccountMode ? null : buildBody(password);
    if (!existingAccountMode && !body) {
      setServerError(p("missingPurchase"));
      return;
    }

    setSubmitting(true);
    try {
      if (existingAccountMode) {
        const email = options.fallbackEmail;
        if (!email) {
          toast({ title: p("missingPurchase"), variant: "destructive" });
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setNeedsExistingPassword(true);
          setServerError(null);
          toast({ title: p("invalidPassword"), variant: "destructive" });
          return;
        }

        await supabase.auth.getSession();
        setNeedsExistingPassword(false);
        setDone(true);
        options.onSuccess?.();
        return;
      }

      if (!body) return;
      // The backend requires the checkout email alongside the purchase id so a
      // purchase id alone cannot be used to take over an account.
      const setupEmail = options.fallbackEmail || localStorage.getItem("checkout_email") || "";
      if (!setupEmail) {
        setServerError(p("missingPurchase"));
        return;
      }
      const res = await supabase.functions.invoke("setup-student-password", {
        body: { ...body, email: setupEmail },
      });

      if (res.error) {
        setServerError(await extractFunctionError(res.error, p("setupFailed")));
        return;
      }

      if (res.data?.error && !res.data?.already_set) {
        setServerError(res.data.error);
        return;
      }

      // Always sign the student in (including the `already_set` path) so the
      // dashboard link lands on an authenticated session.
      const email = res.data?.email || options.fallbackEmail;
      if (email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          if (res.data?.already_set) {
            setNeedsExistingPassword(true);
            setServerError(null);
          } else {
            setServerError(p("signInFailed"));
          }
          return;
        }
        // Make sure the session is persisted before we let the UI navigate.
        await supabase.auth.getSession();
      }

      setNeedsExistingPassword(false);
      if (!res.data?.already_set) {
        toast({ title: t("auth.toast.passwordCreated") });
      }
      setDone(true);
      options.onSuccess?.();
    } catch (err: any) {
      console.error("Set password error:", err);
      setServerError(err?.message || p("unknownError"));
    } finally {
      setSubmitting(false);
    }
  };

  const sendResetLink = async (email?: string) => {
    const target = email || options.fallbackEmail;
    if (!target) return;
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    setServerError(null);
    toast({ title: p("resetSent") });
  };


  return { submit, submitting, done, serverError, needsExistingPassword, sendResetLink };
}
