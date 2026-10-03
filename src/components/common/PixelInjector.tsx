import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PixelInjectorProps {
  tenantId: string;
  event?: "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase" | "CompletePayment";
  eventData?: Record<string, any>;
}

type PixelConfig = {
  meta_pixel_id: string | null;
  meta_connected: boolean;
  tiktok_pixel_id: string | null;
  tiktok_connected: boolean;
  clarity_project_id: string | null;
  clarity_connected: boolean;
  snap_pixel_id: string | null;
  snap_connected: boolean;
  ga_measurement_id: string | null;
  ga_connected: boolean;
  gtm_container_id: string | null;
  gtm_connected: boolean;
};

const SAFE_ID = /^[a-zA-Z0-9_-]{1,64}$/;
const CACHE_PREFIX = "pixels_v4_";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h


const readCache = (tenantId: string): PixelConfig | null => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + tenantId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data as PixelConfig;
  } catch {
    return null;
  }
};

const writeCache = (tenantId: string, data: PixelConfig) => {
  try {
    localStorage.setItem(CACHE_PREFIX + tenantId, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* ignore quota */
  }
};

const PixelInjector = ({ tenantId, event = "PageView", eventData }: PixelInjectorProps) => {
  const [injected, setInjected] = useState(false);

  useEffect(() => {
    if (injected) return;
    // Synchronous inject from cache if available — pixels fire on first paint
    const cached = readCache(tenantId);
    if (cached) {
      applyConfig(cached);
      setInjected(true);
    }
    // Always refresh in background (also handles cold cache)
    loadAndInject(!!cached);
  }, [tenantId, injected]);

  useEffect(() => {
    if (!injected || event === "PageView") return;
    firePixelEvent(event, eventData);
  }, [event, eventData, injected]);

  const applyConfig = (data: PixelConfig) => {
    if (data.meta_connected && data.meta_pixel_id && SAFE_ID.test(data.meta_pixel_id)) {
      injectMetaPixel(data.meta_pixel_id);
    }
    if (data.tiktok_connected && data.tiktok_pixel_id && SAFE_ID.test(data.tiktok_pixel_id)) {
      injectTiktokPixel(data.tiktok_pixel_id);
    }
    if (data.clarity_connected && data.clarity_project_id && SAFE_ID.test(data.clarity_project_id)) {
      injectClarity(data.clarity_project_id);
    }
    if (data.snap_connected && data.snap_pixel_id && SAFE_ID.test(data.snap_pixel_id)) {
      injectSnapPixel(data.snap_pixel_id);
    }
    if (data.ga_connected && data.ga_measurement_id && SAFE_ID.test(data.ga_measurement_id)) {
      injectGoogleAnalytics(data.ga_measurement_id);
    }
    if (data.gtm_connected && data.gtm_container_id && SAFE_ID.test(data.gtm_container_id)) {
      injectGoogleTagManager(data.gtm_container_id);
    }
  };

  const loadAndInject = async (alreadyInjected: boolean) => {
    try {
      const { data } = await supabase
        .from("public_mentor_pixels" as any)
        .select("meta_pixel_id, meta_connected, tiktok_pixel_id, tiktok_connected, clarity_project_id, clarity_connected, snap_pixel_id, snap_connected, ga_measurement_id, ga_connected, gtm_container_id, gtm_connected")



        .eq("tenant_id", tenantId)
        .maybeSingle() as { data: PixelConfig | null };

      if (!data) return;
      writeCache(tenantId, data);

      if (!alreadyInjected) {
        applyConfig(data);
        setInjected(true);
      }
    } catch (err) {
      console.error("Pixel injection error:", err);
    }
  };

  const injectClarity = (projectId: string) => {
    if ((window as any).clarity) return;
    const script = document.createElement("script");
    script.async = true;
    script.innerHTML = `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${projectId}");
    `;
    document.head.appendChild(script);
  };

  const injectMetaPixel = (pixelId: string) => {
    if ((window as any).fbq) return; // Already loaded

    const script = document.createElement("script");
    script.async = true;
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    // Noscript fallback
    const noscript = document.createElement("noscript");
    const img = document.createElement("img");
    img.height = 1;
    img.width = 1;
    img.style.display = "none";
    img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
    noscript.appendChild(img);
    document.head.appendChild(noscript);
  };

  const injectTiktokPixel = (pixelId: string) => {
    if ((window as any).ttq) return; // Already loaded

    const script = document.createElement("script");
    script.async = true;
    script.innerHTML = `
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
        ttq.load('${pixelId}');
        ttq.page();
      }(window, document, 'ttq');
    `;
    document.head.appendChild(script);
  };

  const injectSnapPixel = (pixelId: string) => {
    if ((window as any).snaptr) return; // Already loaded

    const script = document.createElement("script");
    script.async = true;
    script.innerHTML = `
      (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');
      snaptr('init', '${pixelId}');
      snaptr('track', 'PAGE_VIEW');
    `;
    document.head.appendChild(script);
  };

  const injectGoogleAnalytics = (measurementId: string) => {
    if ((window as any).__gaInjected) return; // Already loaded
    (window as any).__gaInjected = true;

    const loader = document.createElement("script");
    loader.async = true;
    loader.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(loader);

    const init = document.createElement("script");
    init.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      window.gtag = window.gtag || gtag;
      gtag('js', new Date());
      gtag('config', '${measurementId}');
    `;
    document.head.appendChild(init);
  };

  const injectGoogleTagManager = (containerId: string) => {
    if ((window as any).__gtmInjected) return; // Already loaded
    (window as any).__gtmInjected = true;

    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

    const loader = document.createElement("script");
    loader.async = true;
    loader.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
    document.head.appendChild(loader);

    const noscript = document.createElement("noscript");
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${containerId}`;
    iframe.height = "0";
    iframe.width = "0";
    iframe.style.display = "none";
    iframe.style.visibility = "hidden";
    noscript.appendChild(iframe);
    document.body.appendChild(noscript);
  };

  return null;
};



const SNAP_EVENT_MAP: Record<string, string> = {
  PageView: "PAGE_VIEW",
  ViewContent: "VIEW_CONTENT",
  AddToCart: "ADD_CART",
  InitiateCheckout: "START_CHECKOUT",
  Purchase: "PURCHASE",
  CompletePayment: "PURCHASE",
};

const GA_EVENT_MAP: Record<string, string> = {
  PageView: "page_view",
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
  CompletePayment: "purchase",
};



// Utility to fire pixel events from anywhere
export const firePixelEvent = (
  event: string,
  data?: Record<string, any>
) => {
  // Meta
  if ((window as any).fbq) {
    (window as any).fbq("track", event, data);
  }
  // TikTok
  if ((window as any).ttq) {
    const tiktokEvent = event === "Purchase" ? "CompletePayment" : event;
    (window as any).ttq.track(tiktokEvent, data);
  }
  // Snapchat
  if ((window as any).snaptr) {
    const snapEvent = SNAP_EVENT_MAP[event];
    if (snapEvent) {
      const price = data?.value ?? data?.price;
      (window as any).snaptr("track", snapEvent, {
        ...(price !== undefined ? { price } : {}),
        ...(data?.currency ? { currency: data.currency } : {}),
      });
    }
  }
  // Google Analytics (GA4)
  if (typeof (window as any).gtag === "function") {
    const gaEvent = GA_EVENT_MAP[event];
    if (gaEvent) {
      const value = data?.value ?? data?.price;
      (window as any).gtag("event", gaEvent, {
        ...(value !== undefined ? { value } : {}),
        ...(data?.currency ? { currency: data.currency } : {}),
      });
    }
  }
  // Google Tag Manager (dataLayer)
  if ((window as any).__gtmInjected && Array.isArray((window as any).dataLayer)) {
    const gaEvent = GA_EVENT_MAP[event] || event;
    const value = data?.value ?? data?.price;
    (window as any).dataLayer.push({
      event: gaEvent,
      ...(value !== undefined ? { value } : {}),
      ...(data?.currency ? { currency: data.currency } : {}),
    });
  }
};



export default PixelInjector;
