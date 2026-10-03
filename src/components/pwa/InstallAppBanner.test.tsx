import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { getAppDisplayName, setAppDisplayName } from "@/lib/appIdentity";
import { applyPwaManifest } from "@/lib/pwaManifest";
import InstallAppBanner from "./InstallAppBanner";

/**
 * The banner is only offered once the browser exposes an install prompt (or on
 * a phone). Simulating the native event is what makes the component render on
 * desktop, and it exercises the real prompt-capture path.
 */
const fireInstallPrompt = () => {
  const event = new Event("beforeinstallprompt") as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  };
  event.preventDefault = () => {};
  event.prompt = async () => {};
  event.userChoice = Promise.resolve({ outcome: "dismissed" });
  window.dispatchEvent(event);
};

describe("InstallAppBanner", () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage("ar");
    fireInstallPrompt();
  });

  afterEach(() => {
    cleanup();
    setAppDisplayName("");
  });

  it("names the mentor's academy instead of the platform", () => {
    setAppDisplayName("أكاديمية النور");
    render(<InstallAppBanner />);

    expect(screen.getByText("ثبّت أكاديمية النور لاستقبال التنبيهات على جهازك مباشرة")).toBeInTheDocument();
    expect(screen.queryByText(/إبداعي/)).not.toBeInTheDocument();
  });

  it("keeps a neutral wording when no branded identity is applied yet", () => {
    setAppDisplayName("");
    render(<InstallAppBanner />);

    expect(screen.getByText("ثبّت التطبيق لاستقبال التنبيهات على جهازك مباشرة")).toBeInTheDocument();
  });
});

describe("applyPwaManifest", () => {
  beforeAll(() => {
    // jsdom ships no object-URL support; the manifest only needs a URL string.
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => "blob:mock";
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {};
  });

  it("publishes the branded name so every install prompt uses it", () => {
    const restore = applyPwaManifest({ name: "أكاديمية النور", shortName: "النور", startPath: "/dashboard" });

    expect(getAppDisplayName()).toBe("أكاديمية النور");

    restore();
    expect(getAppDisplayName()).toBe("");
  });
});
