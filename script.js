const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector("#nav-links");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

// Count only visits to the published tutorial, never local previews.
async function initializeVisitStatistics() {
  const statistics = document.querySelector(".site-stats");
  if (!statistics) return;

  const status = statistics.querySelector(".site-stats-status");
  const counters = [
    document.getElementById("busuanzi_page_pv"),
    document.getElementById("busuanzi_page_uv"),
  ];
  const isLiveTutorial =
    location.protocol === "https:" &&
    location.hostname === "ym-max-bot.github.io" &&
    /^\/spatial-intelligence-tutorial\/(?:index\.html)?$/.test(location.pathname);

  if (!isLiveTutorial) {
    status.textContent = "Visit statistics are available on the live website.";
    return;
  }

  // One canonical page key also groups index.html, query strings, and anchors.
  const headers = {
    "x-bsz-referer": "https://ym-max-bot.github.io/spatial-intelligence-tutorial/",
  };
  const identityKey = "spatial-tutorial-busuanzi-id";
  try {
    const identity = localStorage.getItem(identityKey);
    if (identity) headers.Authorization = `Bearer ${identity}`;
  } catch {
    // The service can still count visits when browser storage is unavailable.
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    // Public endpoint currently used by https://busuanzi.9420.ltd/js.
    const response = await fetch("https://bsz.iirose.cn/api", {
      method: "POST",
      headers,
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok) throw new Error("Statistics request failed");
    const result = await response.json();
    const totals = result.data;
    if (
      result.success !== true ||
      !totals ||
      ![totals.page_pv, totals.page_uv].every((value) => Number.isSafeInteger(value) && value >= 0)
    ) {
      throw new Error("Invalid statistics response");
    }

    counters[0].textContent = totals.page_pv.toLocaleString("en-US");
    counters[1].textContent = totals.page_uv.toLocaleString("en-US");
    status.hidden = true;

    try {
      const identity = response.headers.get("Set-Bsz-Identity");
      if (identity) localStorage.setItem(identityKey, identity);
    } catch {
      // Restricted storage must not prevent the counters from being displayed.
    }
  } catch {
    status.textContent = "Visit statistics are temporarily unavailable.";
  } finally {
    clearTimeout(timeout);
  }
}

initializeVisitStatistics();
