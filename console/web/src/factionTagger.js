// Auto-tags DOM elements with data-tagged-faction or data-tagged-spice
// based on text content. Separate from data-faction (used for CSS theme).
(function init() {
  const FACTION_RE = { atreides: /atreides/i, harkonnen: /harkonnen/i };
  const SPICE_RE = /spice|melange/i;

  function tag(el) {
    if (!el?.textContent || el.hasAttribute("data-tagged-faction") || el.hasAttribute("data-tagged-spice")) return;
    const t = el.textContent.slice(0, 100).toLowerCase();
    for (const [f, re] of Object.entries(FACTION_RE)) {
      if (re.test(t)) { el.setAttribute("data-tagged-faction", f); return; }
    }
    if (SPICE_RE.test(t)) el.setAttribute("data-tagged-spice", "");
  }

  function scan() {
    document.querySelectorAll("tr, td, th, .metric-card, .card, article, .section-heading, h2, h3, span, p, strong, li").forEach(tag);
  }

  scan();
  new MutationObserver(() => setTimeout(scan, 200)).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-tab"] });
})();
