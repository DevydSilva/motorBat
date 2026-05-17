/**
 * Injeta no `document` scripts do template legado (jQuery, OverlayScrollbars, ApexCharts)
 * a partir de `public/assets`, para páginas que ainda dependem deles.
 */
const LEGACY_SCRIPTS = [
  "/assets/jquery.min.js.download",
  "/assets/jquery.overlayScrollbars.min.js.download",
  "/assets/custom-scrollbar.js",
  "/assets/apexcharts.min.js.download",
  "/assets/sales.js",
  "/assets/tasks.js"
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-legacy-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Falha ao carregar ${src}`)), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.legacySrc = src;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "1";
        resolve();
      },
      { once: true }
    );
    script.addEventListener("error", () => reject(new Error(`Falha ao carregar ${src}`)), {
      once: true
    });
    document.body.appendChild(script);
  });
}

export async function loadLegacyDashboardScripts() {
  for (const src of LEGACY_SCRIPTS) {
    await loadScript(src);
  }
}
