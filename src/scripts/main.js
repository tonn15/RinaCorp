/* ---- Platform Verification (Instagram / TikTok) ---- */
(function () {
  const MODAL_KEY = "verified";
  if (localStorage.getItem(MODAL_KEY)) return;

  const choiceOverlay = document.getElementById("choiceModal");
  const igOverlay = document.getElementById("igModal");
  const ttOverlay = document.getElementById("ttModal");
  if (!choiceOverlay) return;

  function showOverlay(el) {
    el.classList.add("active");
    document.body.style.overflow = "hidden";
  }
  function hideOverlay(el) {
    el.classList.remove("active");
    document.body.style.overflow = "";
  }

  setTimeout(() => showOverlay(choiceOverlay), 400);

  document.getElementById("choiceIG").addEventListener("click", () => {
    hideOverlay(choiceOverlay);
    setTimeout(() => { showOverlay(igOverlay); document.getElementById("igUsername").focus(); }, 350);
  });

  document.getElementById("choiceTT").addEventListener("click", () => {
    hideOverlay(choiceOverlay);
    setTimeout(() => { showOverlay(ttOverlay); document.getElementById("ttUsername").focus(); }, 350);
  });

  function validate(input, wrap, error, errorMsg, btn) {
    const clean = input.value.trim().replace(/^@/, "");
    if (!clean) {
      error.classList.remove("show");
      wrap.classList.remove("valid");
      btn.disabled = true;
      return;
    }
    if (clean.length < 3) {
      errorMsg.textContent = "Minimum 3 caractères";
      error.classList.add("show");
      wrap.classList.remove("valid");
      btn.disabled = true;
      return;
    }
    if (!/^[a-zA-Z0-9._]+$/.test(clean)) {
      errorMsg.textContent = "Caractères non valides (lettres, chiffres, . et _ seulement)";
      error.classList.add("show");
      wrap.classList.remove("valid");
      btn.disabled = true;
      return;
    }
    error.classList.remove("show");
    wrap.classList.add("valid");
    btn.disabled = false;
  }

  async function verify(username, endpoint, overlay, btn, error, errorMsg) {
    const clean = username.trim().replace(/^@/, "");
    if (!clean || clean.length < 3) return;

    btn.classList.add("loading");
    btn.disabled = true;
    error.classList.remove("show");

    try {
      const res = await fetch("http://localhost:3002/api/" + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: clean }),
      });
      const data = await res.json();

      if (data.verified) {
        localStorage.setItem(MODAL_KEY, "true");
        hideOverlay(overlay);
      } else {
        errorMsg.textContent = data.error || "Vérification échouée. Réessaie.";
        error.classList.add("show");
        btn.classList.remove("loading");
        btn.disabled = false;
      }
    } catch (err) {
      errorMsg.textContent = "Serveur inaccessible. Vérifie que le serveur est lancé.";
      error.classList.add("show");
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  }

  /* ---- Instagram ---- */
  {
    const input = document.getElementById("igUsername");
    const btn = document.getElementById("igVerifyBtn");
    const error = document.getElementById("igError");
    const errorMsg = document.getElementById("igErrorMsg");
    const wrap = document.querySelector("#igModal .ig-modal-input-wrap");

    input.addEventListener("input", () => validate(input, wrap, error, errorMsg, btn));
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !btn.disabled) btn.click(); });
    btn.addEventListener("click", () => verify(input.value, "verify-follow", igOverlay, btn, error, errorMsg));
  }

  /* ---- TikTok ---- */
  {
    const input = document.getElementById("ttUsername");
    const btn = document.getElementById("ttVerifyBtn");
    const error = document.getElementById("ttError");
    const errorMsg = document.getElementById("ttErrorMsg");
    const wrap = document.querySelector("#ttModal .ig-modal-input-wrap");

    input.addEventListener("input", () => validate(input, wrap, error, errorMsg, btn));
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !btn.disabled) btn.click(); });
    btn.addEventListener("click", () => verify(input.value, "verify-tt-follow", ttOverlay, btn, error, errorMsg));
  }
})();

/* ---- TradingView ---- */
const TV_SYMBOLS = [
  { symbol: "FX:EURUSD" },
  { symbol: "FX:GBPUSD" },
  { symbol: "FX:XAUUSD" },
];
function createTradingViewWidget(index) {
  const c = document.getElementById("tradingview-widget");
  c.innerHTML = "";
  new TradingView.widget({
    width: "100%",
    height: 580,
    symbol: TV_SYMBOLS[index].symbol,
    interval: "60",
    timezone: "Etc/UTC",
    theme: "dark",
    style: "1",
    locale: "fr",
    toolbar_bg: "#0d0b07",
    enable_publishing: false,
    allow_symbol_change: false,
    save_image: false,
    container_id: "tradingview-widget",
    hide_top_toolbar: false,
    hide_legend: false,
    studies: ["MASimple@tv-basicstudies"],
  });
}
function switchSymbol(i) {
  document
    .querySelectorAll(".tab-btn")
    .forEach((b, j) => b.classList.toggle("active", i === j));
  createTradingViewWidget(i);
}
window.addEventListener("load", () => createTradingViewWidget(0));

/* ---- Trading Widget Animation ---- */
(function () {
  const widgets = document.querySelectorAll(".trade-widget");
  if (!widgets.length) return;
  widgets.forEach((w) => {
    const pair = w.dataset.pair;
    const basePrice = parseFloat(w.dataset.price);
    const change = parseFloat(w.dataset.change);
    const isUp = change >= 0;

    const header = document.createElement("div");
    header.className = "trade-widget-header";
    header.innerHTML = `
      <span class="trade-widget-pair">${pair}</span>
      <span class="trade-widget-change ${isUp ? "up" : "down"}">${change > 0 ? "+" : ""}${change}%</span>
    `;
    const priceEl = document.createElement("div");
    priceEl.className = `trade-widget-price ${isUp ? "up" : "down"}`;
    priceEl.textContent = basePrice.toLocaleString("fr", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const chartWrap = document.createElement("div");
    chartWrap.className = "trade-widget-chart";
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "trade-chart-svg");
    svg.setAttribute("viewBox", "0 0 240 80");
    svg.setAttribute("preserveAspectRatio", "none");
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("class", `trade-chart-path ${isUp ? "up" : "down"}`);
    const fill = document.createElementNS(svgNS, "path");
    fill.setAttribute("class", `trade-chart-fill ${isUp ? "up" : "down"}`);
    svg.appendChild(path);
    svg.appendChild(fill);
    chartWrap.appendChild(svg);
    w.appendChild(header);
    w.appendChild(priceEl);
    w.appendChild(chartWrap);

    let price = basePrice;
    const points = 60;
    let data = [];
    for (let i = 0; i < points; i++) {
      data.push(basePrice * (1 + (Math.random() - 0.5) * 0.04));
    }
    function buildPath(arr) {
      const w2 = 240, h2 = 80;
      const min = Math.min(...arr), max = Math.max(...arr);
      const range = max - min || 1;
      let d = "", fd = "";
      arr.forEach((v, i) => {
        const x = (i / (arr.length - 1)) * w2;
        const y = h2 - ((v - min) / range) * (h2 - 10) - 5;
        d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
        fd += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
      });
      fd += "L" + w2 + " " + h2 + " L0 " + h2 + " Z";
      return { line: d, fill: fd };
    }
    function updateChart() {
      const p = buildPath(data);
      path.setAttribute("d", p.line);
      fill.setAttribute("d", p.fill);
    }
    updateChart();
    let animFrame;
    let dir = isUp ? 1 : -1;
    function tick() {
      const drift = basePrice * 0.0002 * dir;
      const noise = basePrice * (Math.random() - 0.5) * 0.002;
      price += drift + noise;
      if (Math.random() < 0.03) dir *= -1;
      data.push(price);
      data.shift();
      priceEl.textContent = price.toLocaleString("fr", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const newChange = ((price - basePrice) / basePrice * 100);
      const chEl = w.querySelector(".trade-widget-change");
      if (chEl) {
        chEl.textContent = (newChange > 0 ? "+" : "") + newChange.toFixed(2) + "%";
        chEl.className = `trade-widget-change ${newChange >= 0 ? "up" : "down"}`;
      }
      priceEl.className = `trade-widget-price ${newChange >= 0 ? "up" : "down"}`;
      updateChart();
      animFrame = setTimeout(tick, 800 + Math.random() * 600);
    }
    tick();
  });
})();

/* ---- Hero Chart Background Animation ---- */
(function () {
  const bgSvg = document.querySelector(".hero-chart-bg .trade-chart-svg");
  if (!bgSvg) return;
  const path = bgSvg.querySelector(".trade-chart-path");
  const fill = bgSvg.querySelector(".trade-chart-fill");
  if (!path || !fill) return;
  const points = 60;
  const basePrice = 1.08;
  let data = [];
  for (let i = 0; i < points; i++) {
    data.push(basePrice * (1 + (Math.random() - 0.5) * 0.04));
  }
  function buildPath(arr) {
    const w2 = 240, h2 = 80;
    const min = Math.min(...arr), max = Math.max(...arr);
    const range = max - min || 1;
    let d = "", fd = "";
    arr.forEach((v, i) => {
      const x = (i / (arr.length - 1)) * w2;
      const y = h2 - ((v - min) / range) * (h2 - 10) - 5;
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
      fd += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
    });
    fd += "L" + w2 + " " + h2 + " L0 " + h2 + " Z";
    return { line: d, fill: fd };
  }
  function updateChart() {
    const p = buildPath(data);
    path.setAttribute("d", p.line);
    fill.setAttribute("d", p.fill);
  }
  updateChart();
  let price = basePrice;
  let dir = 1;
  function tick() {
    const drift = basePrice * 0.0002 * dir;
    const noise = basePrice * (Math.random() - 0.5) * 0.002;
    price += drift + noise;
    if (Math.random() < 0.03) dir *= -1;
    data.push(price);
    data.shift();
    updateChart();
    setTimeout(tick, 800 + Math.random() * 600);
  }
  tick();
})();

/* ---- Hero Slider (Owl Carousel) ---- */
(function () {
  const slider = document.getElementById("heroSlider");
  if (!slider || typeof $ === "undefined") return;
  $(slider).owlCarousel({
    items: 1,
    loop: true,
    autoplay: true,
    autoplayTimeout: 7000,
    autoplayHoverPause: true,
    dots: true,
    nav: false,
    smartSpeed: 800,
  });
})();

/* ---- Candlestick Chart Animation (ascending / descending) ---- */
(function () {
  const charts = document.querySelectorAll(".candle-chart");
  if (!charts.length) return;
  charts.forEach((container, slideIdx) => {
    const count = 25 + slideIdx * 8;
    const isBullishSlide = slideIdx === 0;
    for (let i = 0; i < count; i++) {
      const isAsc = isBullishSlide ? Math.random() > 0.3 : Math.random() > 0.5;
      const isGreen = isAsc ? Math.random() > 0.25 : Math.random() < 0.25;
      const candle = document.createElement("div");
      candle.className = `candle ${isAsc ? "candle-asc" : "candle-desc"} ${isGreen ? "candle-bullish" : "candle-bearish"}`;
      const wick = document.createElement("div");
      wick.className = `candle-wick ${isAsc ? "candle-asc" : "candle-desc"}`;
      const left = 2 + Math.random() * 88;
      const delay = Math.random() * 6;
      const dur = 3 + Math.random() * 4;
      const width = 6 + Math.random() * 14;
      candle.style.cssText = `
        left:${left}%;
        width:${width}px;
        animation-delay:${delay}s;
        animation-duration:${dur}s;
      `;
      wick.style.cssText = `
        left:${left}%;
        width:2px;
        animation-delay:${delay}s;
        animation-duration:${dur}s;
      `;
      container.appendChild(candle);
      container.appendChild(wick);
    }
  });
})();

/* ---- Navbar scroll ---- */
const navbar = document.getElementById("navbar");
window.addEventListener(
  "scroll",
  () => {
    navbar.classList.toggle("scrolled", window.scrollY > 40);
    document
      .getElementById("stickyCta")
      .classList.toggle("visible", window.scrollY > 600);
  },
  { passive: true },
);

/* ---- Mobile nav (deprecated: burger removed) ---- */

/* ---- Cart toast ---- */
let cart = {};
function addToCart(name) {
  cart[name] = (cart[name] || 0) + 1;
  showToast(`🥃 ${name} ajouté ! (x${cart[name]})`);
}
let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  const m = document.getElementById("toastMsg");
  m.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

/* ---- Donation ---- */
let selectedAmount = "10000";
function selectAmount(el, val) {
  document
    .querySelectorAll(".amount-btn")
    .forEach((b) => b.classList.remove("selected"));
  el.classList.add("selected");
  selectedAmount = val;
  document.getElementById("customAmount").value = "";
}
function doDonate() {
  const custom = document.getElementById("customAmount").value;
  const amount = custom || selectedAmount;
  const method =
    document.querySelector(".method-radio:checked")?.value || "MVola";
  showToast(
    `❤️ Merci ! Don de ${Number(amount).toLocaleString("fr")} Ar via ${method}`,
  );
}

/* ---- Scroll reveal ---- */
const obs = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("revealed");
        obs.unobserve(e.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
);
document.querySelectorAll("[data-reveal]").forEach((el) => obs.observe(el));
