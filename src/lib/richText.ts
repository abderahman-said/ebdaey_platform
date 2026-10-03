const legacyAudioPlaceholderRegex = /<div\b[^>]*data-audio-src=(['"])(.*?)\1[^>]*><\/div>/gi;

const escapeHtmlAttribute = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const buildAudioEmbedHtml = (src: string) => {
  const safeSrc = escapeHtmlAttribute(src.trim());

  if (!safeSrc) {
    return "";
  }

  return `<figure class="rt-audio-embed not-prose" data-audio-player="true" data-audio-src="${safeSrc}"><audio controls preload="metadata" crossorigin="anonymous" src="${safeSrc}"></audio></figure>`;
};

export const normalizeRichTextHtml = (html?: string | null) => {
  if (!html) {
    return "";
  }

  return html.replace(legacyAudioPlaceholderRegex, (_match, _quote, src) => buildAudioEmbedHtml(src));
};