/**
 * Layer 24 screen.
 *
 * A form and a status line, and deliberately nothing else: the gate lives in layer24.js, this
 * file cannot open it, and the export is the only way answers leave the browser.
 */
(function () {
  if (typeof document === "undefined" || !window.IDLFLayer24) return;
  const layer = window.IDLFLayer24;
  const STORE_KEY = "idlf.layer24.v1";
  const body = document.getElementById("l24-body");
  const statusBox = document.getElementById("l24-status");
  if (!body || !statusBox) return;

  const esc = (value) =>
    String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  let answers = read();

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  function write() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(answers));
    } catch {
      /* a full or blocked store must not break the form */
    }
  }

  function render() {
    const html = layer.SECTIONS.map((section) => {
      const rows = layer.QUESTIONS.filter((question) => question.section === section.id).map((question) => {
        const current = answers[question.id];
        const value = current ? current.text ?? current.value ?? "" : "";
        const why = question.kind === "operational"
          ? `<div class="l24-why"><label for="why-${esc(question.id)}">What decision changes if this answer is different?</label>
             <textarea id="why-${esc(question.id)}" data-id="why-${esc(question.id)}" rows="2">${esc((answers["why-" + question.id] || {}).text || "")}</textarea></div>`
          : "";
        return `<div class="l24-q"><label for="${esc(question.id)}">${esc(question.text)}</label>
          <textarea id="${esc(question.id)}" data-id="${esc(question.id)}" rows="3">${esc(value)}</textarea>${why}</div>`;
      }).join("");
      return `<section class="l24-section"><h3>${esc(section.title)}</h3><p class="hint">${esc(section.blurb)}</p>${rows}</section>`;
    }).join("");
    body.innerHTML = html;
    refresh();
  }

  function refresh() {
    const status = layer.formatStatus(layer.assess(answers));
    const lines = status.lines.map((line) => `<li class="${line.kind === "missing" ? "l24-flag" : ""}">${esc(line.text)}</li>`).join("");
    statusBox.innerHTML = `<b class="${status.ready ? "l24-ready" : ""}">${esc(status.headline)}</b>${lines ? `<ul>${lines}</ul>` : ""}`;
  }

  body.addEventListener("input", (event) => {
    const id = event.target.getAttribute("data-id");
    if (!id) return;
    answers[id] = { text: event.target.value, at: Date.now() };
    if (!event.target.value.trim()) delete answers[id];
    write();
    refresh();
  });

  const exportButton = document.getElementById("l24-export");
  if (exportButton) {
    exportButton.addEventListener("click", () => {
      const blob = new Blob([layer.exportText(answers, Date.now())], { type: "text/plain" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "actor-analysis.txt";
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }

  const clearButton = document.getElementById("l24-clear");
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      if (!confirm("Clear every answer in this layer from this browser?")) return;
      answers = {};
      write();
      render();
    });
  }

  const tab = document.getElementById("tab-layer24");
  if (tab) tab.addEventListener("click", () => switchTab("layer24"));

  window.IDLFLayer24UI = { render, show: render };
  render();
})();
