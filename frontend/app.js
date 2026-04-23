// Telegram Mini App frontend (vanilla JS).
// - Reads Telegram user from WebApp SDK
// - Loads catalog from backend
// - Sends orders with strict 6-digit transaction proof
const $ = (sel) => document.querySelector(sel);

function getTelegramUser() {
  const tg = window.Telegram?.WebApp;
  const u = tg?.initDataUnsafe?.user;
  return {
    telegram_id: u?.id ? String(u.id) : "",
    username: u?.username ? String(u.username) : "",
  };
}

function getApiBase() {
  const fromQuery = new URLSearchParams(location.search).get("api");
  if (fromQuery) return fromQuery.replace(/\/+$/, "");

  const fromStorage = localStorage.getItem("API_BASE");
  if (fromStorage) return fromStorage.replace(/\/+$/, "");

  // Dev-friendly default. In production pass ?api=... or set localStorage API_BASE.
  return "http://localhost:3000";
}

function moneyKs(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return `${n} Ks`;
  return `${Math.round(v).toLocaleString("en-US")} Ks`;
}

function saveCheckout(item) {
  localStorage.setItem("checkout_item", JSON.stringify(item));
  location.href = "checkout.html";
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "accept": "application/json" } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || "Request failed");
  return body;
}

async function initIndex() {
  const api = getApiBase();
  const tg = window.Telegram?.WebApp;
  tg?.ready?.();
  tg?.expand?.();

  const user = getTelegramUser();
  $("#pillUser").textContent = user.username ? `@${user.username}` : (user.telegram_id ? `id:${user.telegram_id}` : "Guest");
  $("#pillApi").textContent = api;

  const [{ products }, { options }] = await Promise.all([
    fetchJson(`${api}/api/products`),
    fetchJson(`${api}/api/game-options`),
  ]);

  const allProducts = products ?? [];
  const allOptions = options ?? [];

  const searchInput = $("#searchInput");
  const searchHint = $("#searchHint");

  const state = {
    query: "",
    selectedGame: "",
  };

  const debounced = debounce(() => {
    renderProducts(filterProducts(allProducts, state.query));
    renderGameOptions(allOptions, state.query);
    if (searchHint) {
      searchHint.textContent = state.query
        ? `Searching for: “${state.query}”`
        : "Tip: try “Netflix”, “Mobile Legends”, “60 Diamonds”.";
    }
  }, 120);

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.query = String(searchInput.value || "").trim();
      debounced();
    });
  }

  debounced();

  function renderProducts(list) {
    const host = $("#productsRow");
    host.innerHTML = "";
    if (!list.length) {
      host.innerHTML = state.query
        ? `<div class="notice"><strong>No matches.</strong> Try a different search.</div>`
        : `<div class="notice"><strong>No products yet.</strong> Add rows to Supabase table <code>products</code>.</div>`;
      return;
    }
    list.forEach((p) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <p class="name">${escapeHtml(p.name)}</p>
        <div class="meta">
          <span class="badge">${escapeHtml(p.category)}</span>
          <span class="badge">${escapeHtml(p.duration)}</span>
        </div>
        <div class="price">
          <div>
            <span class="val">${escapeHtml(String(Math.round(Number(p.price))))}</span>
            <span class="cur">Ks</span>
          </div>
          <button class="btn btnGood">Buy</button>
        </div>
      `;
      el.querySelector("button").addEventListener("click", () => {
        saveCheckout({
          item_type: "product",
          product_id: p.id,
          product_name: p.name,
          duration: p.duration,
          price: Number(p.price),
          amount: "",
        });
      });
      host.appendChild(el);
    });
  }

  function renderGameOptions(list) {
    const games = Array.from(new Set(list.map((o) => o.game_name))).sort();
    const gameSel = $("#gameSelect");
    gameSel.innerHTML = games.map((g) => `<option value="${escapeAttr(g)}">${escapeHtml(g)}</option>`).join("");

    const byGame = new Map();
    list.forEach((o) => {
      if (!byGame.has(o.game_name)) byGame.set(o.game_name, []);
      byGame.get(o.game_name).push(o);
    });
    for (const arr of byGame.values()) arr.sort((a, b) => Number(a.price) - Number(b.price));

    function renderFor(gameName) {
      const host = $("#gameRow");
      host.innerHTML = "";
      const arr0 = byGame.get(gameName) ?? [];
      const arr = filterGameOptions(arr0, state.query);
      if (!arr.length) {
        host.innerHTML = state.query
          ? `<div class="notice"><strong>No matches.</strong> Try a different search.</div>`
          : `<div class="notice"><strong>No options yet.</strong> Add rows to Supabase table <code>game_options</code>.</div>`;
        return;
      }
      arr.forEach((o) => {
        const el = document.createElement("div");
        el.className = "item";
        el.innerHTML = `
          <p class="name">${escapeHtml(o.amount)}</p>
          <div class="meta">
            <span class="badge">${escapeHtml(o.game_name)}</span>
          </div>
          <div class="price">
            <div>
              <span class="val">${escapeHtml(String(Math.round(Number(o.price))))}</span>
              <span class="cur">Ks</span>
            </div>
            <button class="btn btnGood">Buy</button>
          </div>
        `;
        el.querySelector("button").addEventListener("click", () => {
          saveCheckout({
            item_type: "game",
            game_name: o.game_name,
            amount: o.amount,
            product_name: `${o.game_name} ${o.amount}`,
            price: Number(o.price),
          });
        });
        host.appendChild(el);
      });
    }

    state.selectedGame = gameSel.value || games[0] || "";
    gameSel.addEventListener("change", () => {
      state.selectedGame = gameSel.value;
      renderFor(gameSel.value);
    });
    renderFor(state.selectedGame);
  }
}

async function initCheckout() {
  const api = getApiBase();
  const tg = window.Telegram?.WebApp;
  tg?.ready?.();
  tg?.expand?.();

  const user = getTelegramUser();
  $("#pillUser").textContent = user.username ? `@${user.username}` : (user.telegram_id ? `id:${user.telegram_id}` : "Guest");
  $("#pillApi").textContent = api;

  const raw = localStorage.getItem("checkout_item");
  if (!raw) {
    $("#checkoutCard").innerHTML = `<div class="notice"><strong>No item selected.</strong> Go back and choose a product.</div>`;
    $("#submitBtn").classList.add("btnDisabled");
    $("#submitBtn").disabled = true;
    return;
  }

  const item = JSON.parse(raw);
  $("#itemTitle").textContent = item.product_name || "Selected item";
  $("#itemPrice").textContent = moneyKs(item.price);

  $("#backBtn").addEventListener("click", () => (location.href = "index.html"));

  const txInput = $("#txLast6");
  const statusEl = $("#status");
  const submitBtn = $("#submitBtn");

  function setStatus(type, msg) {
    statusEl.textContent = msg || "";
    statusEl.style.color =
      type === "good" ? "rgba(34,197,94,.92)" :
      type === "bad" ? "rgba(239,68,68,.92)" :
      "rgba(255,255,255,.70)";
  }

  function validateTx() {
    const v = String(txInput.value || "").trim();
    return /^[0-9]{6}$/.test(v) ? v : null;
  }

  txInput.addEventListener("input", () => {
    txInput.value = txInput.value.replace(/\D/g, "").slice(0, 6);
    const ok = validateTx();
    submitBtn.disabled = !ok;
    submitBtn.classList.toggle("btnDisabled", !ok);
    if (!txInput.value) setStatus("muted", "Enter the last 6 digits of your transaction ID.");
    else if (ok) setStatus("good", "Looks good. You can submit now.");
    else setStatus("bad", "Must be exactly 6 digits.");
  });

  submitBtn.addEventListener("click", async () => {
    const transaction_last6 = validateTx();
    if (!transaction_last6) return;
    if (!user.telegram_id) {
      setStatus("bad", "Open this inside Telegram so we can identify your account.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add("btnDisabled");
    setStatus("muted", "Submitting order...");

    try {
      const res = await fetch(`${api}/api/order`, {
        method: "POST",
        headers: { "content-type": "application/json", "accept": "application/json" },
        body: JSON.stringify({
          telegram_id: user.telegram_id,
          username: user.username,
          item_type: item.item_type,
          product_id: item.product_id,
          product_name: item.product_name,
          duration: item.duration,
          game_name: item.game_name,
          amount: item.amount,
          price: item.price,
          transaction_last6,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Order failed");

      setStatus("good", `Order submitted. Waiting for admin confirmation. (${body.order_id})`);
      tg?.HapticFeedback?.notificationOccurred?.("success");
      tg?.MainButton?.hide?.();
    } catch (e) {
      setStatus("bad", String(e?.message || e));
      submitBtn.disabled = false;
      submitBtn.classList.remove("btnDisabled");
      tg?.HapticFeedback?.notificationOccurred?.("error");
    }
  });

  // initialize state
  txInput.dispatchEvent(new Event("input"));
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll("`", "&#096;");
}

window.App = { initIndex, initCheckout };

function normalizeText(s) {
  return String(s || "").toLowerCase().trim();
}

function filterProducts(products, query) {
  const q = normalizeText(query);
  if (!q) return products;
  return products.filter((p) => {
    const hay =
      `${p.name ?? ""} ${p.category ?? ""} ${p.duration ?? ""} ${p.price ?? ""}`;
    return normalizeText(hay).includes(q);
  });
}

function filterGameOptions(options, query) {
  const q = normalizeText(query);
  if (!q) return options;
  return options.filter((o) => {
    const hay = `${o.game_name ?? ""} ${o.amount ?? ""} ${o.price ?? ""}`;
    return normalizeText(hay).includes(q);
  });
}

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

