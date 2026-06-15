/* ---- Instagram Verification ---- */
(function () {
  const MODAL_KEY = "ig_verified";
  const IG_USERNAME = "activicode";

  if (localStorage.getItem(MODAL_KEY)) return;

  const overlay = document.getElementById("igModal");
  const input = document.getElementById("igUsername");
  const btn = document.getElementById("igVerifyBtn");
  const error = document.getElementById("igError");
  const errorMsg = document.getElementById("igErrorMsg");
  const wrap = document.querySelector(".ig-modal-input-wrap");

  function validate(username) {
    const clean = username.trim().replace(/^@/, "");
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

  input.addEventListener("input", function () {
    validate(this.value);
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !btn.disabled) btn.click();
  });

  btn.addEventListener("click", async function () {
    const username = input.value.trim().replace(/^@/, "");
    if (!username || username.length < 3) return;

    btn.classList.add("loading");
    btn.disabled = true;
    error.classList.remove("show");

    try {
      const res = await fetch("http://localhost:3002/api/verify-follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();

      if (data.verified) {
        localStorage.setItem(MODAL_KEY, "true");
        overlay.classList.remove("active");
        document.body.style.overflow = "";
      } else {
        errorMsg.textContent = data.error || "Tu ne suis pas encore @activicode — abonne-toi et réessaie";
        error.classList.add("show");
        btn.classList.remove("loading");
        btn.disabled = false;
      }
    } catch (err) {
      errorMsg.textContent = "Serveur inaccessible. Vérifie que le serveur est lancé (npm start).";
      error.classList.add("show");
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  });

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) return;
  });

  setTimeout(() => {
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
    input.focus();
  }, 400);
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

/* ---- Particles ---- */
(function () {
  const container = document.getElementById("particles");
  for (let i = 0; i < 60; i++) {
    const p = document.createElement("span");
    p.className = "particle";
    p.style.cssText = `
      left:${Math.random() * 100}%;
      width:${1 + Math.random() * 2}px;
      height:${1 + Math.random() * 2}px;
      animation-duration:${6 + Math.random() * 12}s;
      animation-delay:${-Math.random() * 12}s;
      opacity:${0.2 + Math.random() * 0.5}
    `;
    container.appendChild(p);
  }
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

/* ---- Mobile nav ---- */
const toggle = document.getElementById("navToggle");
const links = document.getElementById("navLinks");
const actions = document.getElementById("navActions");
toggle.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  actions.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", open);
  document.body.style.overflow = open ? "hidden" : "";
});
links.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    links.classList.remove("open");
    actions.classList.remove("open");
    document.body.style.overflow = "";
  }),
);

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
