/**
 * The display name of the app identity currently shown to the visitor.
 *
 * The installable app identity (manifest, icons, home-screen name) is applied
 * per screen: a mentor's academy on their student/public pages, the Ebdaey
 * platform on the mentor app. Anything that invites the visitor to install —
 * the in-app banner included — must read the name from here so it never
 * contradicts the app they are actually about to install.
 */

type Listener = () => void;

let current = "";
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((listener) => listener());

/** Records the branded name applied by the manifest injection. */
export function setAppDisplayName(name: string) {
  const next = (name || "").trim();
  if (next === current) return;
  current = next;
  emit();
}

/** The branded name currently applied, or "" when only the platform default is active. */
export function getAppDisplayName() {
  return current;
}

export function subscribeAppDisplayName(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
