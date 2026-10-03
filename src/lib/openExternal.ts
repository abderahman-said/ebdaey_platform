/** Opens a URL in a new browser tab. */
export const openExternal = (url: string) => {
  if (!url) return;

  // Omitting window features is important: explicit size/popup features make
  // browsers open a separate popup window instead of a normal tab.
  const win = window.open(url, "_blank");
  if (win) {
    try {
      win.opener = null;
    } catch {
      /* ignore */
    }
    return;
  }

  // Popup blocked — fall back to a synthetic link click.
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
};

