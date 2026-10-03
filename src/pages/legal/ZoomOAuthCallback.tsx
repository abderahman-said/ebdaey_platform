import { useEffect } from "react";
import { SeoHead } from "@/components/common/SeoHead";

/**
 * Proxy page for Zoom OAuth.
 * Zoom Marketplace requires the Redirect URL to be on a domain the developer
 * owns and has verified. We register https://ebdaey.com/zoom/oauth/callback
 * with Zoom and forward the received `code` & `state` to the Supabase edge
 * function that actually exchanges the code for tokens.
 */
const ZoomOAuthCallback = () => {
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const search = window.location.search;
    if (!supabaseUrl) {
      // Fail closed — show a message rather than a blank page.
      document.title = "Zoom Connection Error";
      return;
    }
    window.location.replace(`${supabaseUrl}/functions/v1/zoom-oauth-callback${search}`);
  }, []);

  return (
    <>
    <SeoHead
      title="Zoom connection | Ebdaey"
      description="Completing the Zoom connection for your Ebdaey account."
      path="/zoom/oauth/callback"
      locale="en"
      noindex
    />
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        background: "#0a0a0a",
        color: "#fff",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h2>Finishing Zoom connection…</h2>
        <p style={{ opacity: 0.7 }}>Please wait, you will be redirected shortly.</p>
      </div>
    </div>
    </>
  );
};

export default ZoomOAuthCallback;
