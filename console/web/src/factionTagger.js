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
    // Only scan data-display elements — skip item catalogs, forms, inputs
    document.querySelectorAll(".guilds-table td, .guilds-table th, .players-table td, .players-table th, .metric-card, .card .section-heading h2, .card .section-heading h3, .panel-title h2").forEach(tag);
    document.querySelectorAll("tr").forEach(function(row) {
      if (row.hasAttribute("data-tagged-faction") || row.hasAttribute("data-tagged-spice")) return;
      if (row.closest("table") && (row.closest(".guilds-table") || row.closest(".players-table"))) {
        tag(row);
      }
    });
  }

  scan();
  new MutationObserver(() => setTimeout(scan, 200)).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-tab"] });
})();
