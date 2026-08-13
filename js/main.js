// Arbibots Community Hub — front-end interactions + live sales tracker
(function () {
  "use strict";

  // ---------- Mobile nav ----------
  var navToggle = document.getElementById("nav-toggle");
  var mainNav = document.getElementById("main-nav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var open = mainNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mainNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mainNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // ---------- Sales tracker ----------
  var CONTRACT = "0xc1fcf330b4b4c773fa7e6835f681e8f798e9ebff"; // Arbibots on Arbitrum
  var RESERVOIR_BASE = "https://api-arbitrum.reservoir.tools";
  // Public demo key — heavily rate limited. Site owners should request a free
  // key at https://reservoir.tools and set window.ARBIBOTS_RESERVOIR_KEY
  // (e.g. via a small inline <script> tag before this file loads) for a
  // production deployment.
  var RESERVOIR_KEY = window.ARBIBOTS_RESERVOIR_KEY || "demo-api-key";
  var FALLBACK_URL = "data/last-sale.json";
  var REFRESH_MS = 60000;

  var card = document.getElementById("tracker-card");
  var statusDot = document.getElementById("status-dot");
  var statusText = document.getElementById("status-text");
  var tokenId = document.getElementById("token-id");
  var tokenMeta = document.getElementById("token-meta");
  var salePrice = document.getElementById("sale-price");
  var salePriceUsd = document.getElementById("sale-price-usd");
  var saleTime = document.getElementById("sale-time");
  var saleTimeAbs = document.getElementById("sale-time-abs");
  var saleMarket = document.getElementById("sale-market");
  var saleParties = document.getElementById("sale-parties");
  var trackerLink = document.getElementById("tracker-link");
  var trackerUpdated = document.getElementById("tracker-updated");
  var refreshBtn = document.getElementById("refresh-btn");

  function setState(state, message) {
    if (!card) return;
    card.setAttribute("data-state", state);
    if (message) statusText.textContent = message;
  }

  function shortAddr(addr) {
    if (!addr || addr.length < 10) return addr || "—";
    return addr.slice(0, 6) + "…" + addr.slice(-4);
  }

  function relativeTime(iso) {
    var then = new Date(iso).getTime();
    if (isNaN(then)) return "—";
    var diff = Math.max(0, Date.now() - then);
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.floor(hrs / 24);
    return days + "d ago";
  }

  function renderSale(sale, source) {
    tokenId.textContent = "Bot #" + sale.tokenId;
    tokenMeta.textContent = source === "live" ? "Confirmed on-chain sale" : "Last recorded sale (cached)";
    salePrice.textContent = sale.priceEth != null ? sale.priceEth + " ETH" : "—";
    salePriceUsd.textContent = sale.priceUsd != null ? "≈ $" + Number(sale.priceUsd).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "";
    saleTime.textContent = relativeTime(sale.timestamp);
    saleTimeAbs.textContent = sale.timestamp ? new Date(sale.timestamp).toLocaleString() : "";
    saleMarket.textContent = sale.marketplace || "Unknown";
    saleParties.textContent = sale.from || sale.to
      ? shortAddr(sale.from) + " → " + shortAddr(sale.to)
      : "";
    if (sale.txUrl) trackerLink.href = sale.txUrl;

    setState(source === "live" ? "live" : "error",
      source === "live" ? "Live — synced with marketplace data" : "Live feed unreachable — showing last cached sale");
    trackerUpdated.textContent = "Checked " + new Date().toLocaleTimeString();
  }

  function renderEmpty(reasonText) {
    tokenId.textContent = "No data yet";
    tokenMeta.textContent = "—";
    salePrice.textContent = "—";
    salePriceUsd.textContent = "";
    saleTime.textContent = "—";
    saleTimeAbs.textContent = "";
    saleMarket.textContent = "—";
    saleParties.textContent = "";
    setState("error", reasonText || "Live feed unreachable and no cached sale is stored yet");
    trackerUpdated.textContent = "Checked " + new Date().toLocaleTimeString();
  }

  function fetchLive() {
    var url = RESERVOIR_BASE + "/sales/v5?collection=" + CONTRACT + "&limit=1&sortBy=time";
    return fetch(url, {
      headers: { accept: "*/*", "x-api-key": RESERVOIR_KEY }
    }).then(function (res) {
      if (!res.ok) throw new Error("Reservoir API " + res.status);
      return res.json();
    }).then(function (data) {
      var sale = data && data.sales && data.sales[0];
      if (!sale) throw new Error("No sales in response");
      var native = sale.price && sale.price.amount && sale.price.amount.native;
      var usd = sale.price && sale.price.amount && sale.price.amount.usd;
      var id = sale.token && sale.token.tokenId;
      return {
        tokenId: id,
        priceEth: native != null ? Number(native) : null,
        priceUsd: usd != null ? Number(usd) : null,
        timestamp: sale.timestamp ? new Date(sale.timestamp * 1000).toISOString() : null,
        marketplace: sale.orderSource || sale.fillSource || "Marketplace",
        from: sale.from,
        to: sale.to,
        txUrl: sale.txHash ? "https://arbiscan.io/tx/" + sale.txHash : trackerLink.href
      };
    });
  }

  function fetchFallback() {
    return fetch(FALLBACK_URL, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("fallback " + res.status);
      return res.json();
    });
  }

  function refresh() {
    setState("loading", "Checking marketplace data…");
    fetchLive()
      .then(function (sale) { renderSale(sale, "live"); })
      .catch(function () {
        fetchFallback()
          .then(function (fallback) {
            if (fallback && fallback.tokenId != null && fallback.priceEth != null) {
              renderSale(fallback, "cached");
            } else {
              renderEmpty("Live feed unreachable — no cached sale on file. Configure a Reservoir API key or update data/last-sale.json.");
            }
          })
          .catch(function () {
            renderEmpty("Unable to reach live feed or local cache.");
          });
      });
  }

  if (card) {
    refresh();
    setInterval(refresh, REFRESH_MS);
    if (refreshBtn) refreshBtn.addEventListener("click", refresh);
  }
})();
