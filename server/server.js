const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
require("dotenv").config();

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;
const IG_BOT_USERNAME = process.env.IG_BOT_USERNAME;
const IG_BOT_PASSWORD = process.env.IG_BOT_PASSWORD;
const IG_TARGET = process.env.IG_TARGET_USERNAME;
const IG_SESSIONID = process.env.IG_SESSIONID;

const TT_SESSIONID = process.env.TT_SESSIONID;
const TT_TARGET = process.env.TT_TARGET_USERNAME;

const FB_TARGET = process.env.FB_TARGET_USERNAME;
const FB_USER_ID = process.env.FB_USER_ID;
const FB_XS = process.env.FB_XS;

let browser;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--window-size=1280,800",
        "--no-proxy-server",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
      ],
    });
  }
  return browser;
}

async function createSession() {
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  );

  if (IG_SESSIONID) {
    console.log("  → Using session cookie from .env");
    await page.goto("https://www.instagram.com/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 3000));

    // Set the sessionid cookie
    await page.setCookie({
      name: "sessionid",
      value: IG_SESSIONID,
      domain: ".instagram.com",
      path: "/",
      httpOnly: true,
      secure: true,
    });

    // Reload to verify session works
    await page.goto("https://www.instagram.com/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 3000));

    const hasSession = (await page.cookies()).some((c) => c.name === "sessionid");
    if (!hasSession) {
      await page.screenshot({ path: "debug_cookie_fail.png" });
      await page.close();
      throw new Error("Session cookie invalide ou expiré — mets à jour IG_SESSIONID dans .env");
    }
    console.log("  ✓ Session OK (cookie)");
    const csrf = (await page.cookies()).find((c) => c.name === "csrftoken")?.value || "";
    return { page, csrf };
  }

  await page.goto("https://www.instagram.com/accounts/login/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 4000));
  console.log("  ✓ Login page loaded");

  let found = await page.evaluate(() => !!document.querySelector('input[name="username"]'));

  if (!found) {
    console.log("  → Clicking Log in...");
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("a, button, div, span")) {
        const t = el.textContent.toLowerCase().trim();
        if (t === "log in" || t === "se connecter") {
          el.click();
          break;
        }
      }
    });
    await new Promise((r) => setTimeout(r, 4000));
    found = await page.evaluate(() => !!document.querySelector('input[name="username"]')).catch(() => false);
  }

  if (!found) {
    await page.screenshot({ path: "debug_login.png" });
    await page.close();
    throw new Error("Formulaire de connexion introuvable");
  }
  console.log("  ✓ Login form visible");

  await page.type('input[name="username"]', IG_BOT_USERNAME, { delay: 40 });
  await page.type('input[name="password"]', IG_BOT_PASSWORD, { delay: 40 });
  console.log("  ✓ Credentials entered");
  await new Promise((r) => setTimeout(r, 500));

  // Try clicking submit button or pressing Enter
  const loginBtn = await page.$('button[type="submit"]') || await page.$('button:not([type])');
  if (loginBtn) {
    console.log("  → Clicking submit button");
    const navPromise = page.waitForNavigation({ waitUntil: "networkidle2", timeout: 25000 }).catch(() => null);
    await loginBtn.click();
    await navPromise;
  } else {
    console.log("  → Pressing Enter");
    const navPromise = page.waitForNavigation({ waitUntil: "networkidle2", timeout: 25000 }).catch(() => null);
    await page.keyboard.press("Enter");
    await navPromise;
  }
  await new Promise((r) => setTimeout(r, 3000));
  console.log("  ✓ Login submitted");

  await new Promise((r) => setTimeout(r, 5000));

  const urlAfter = page.url();
  const cookies = await page.cookies();
  const hasSession = cookies.some((c) => c.name === "sessionid");
  console.log("  [DEBUG] URL:", urlAfter);
  console.log("  [DEBUG] Cookies:", cookies.map(c => c.name).join(", "));
  console.log("  [DEBUG] Has sessionid:", hasSession);

  if (!hasSession) {
    await page.screenshot({ path: "debug_post_login.png" });
    const text = await page.evaluate(() => document.body.innerText.slice(0, 1500)).catch(() => "N/A");
    console.log("  [DEBUG] Page text:", text.replace(/\n/g, " | "));
    const errMsg = await page.evaluate(() => {
      const el = document.querySelector("#slfErrorAlert, .notice, [role='alert']");
      if (el) return el.textContent;
      const ps = document.querySelectorAll("p");
      for (const p of ps) {
        if (p.textContent.toLowerCase().includes("sorry") || p.textContent.toLowerCase().includes("mot de passe") || p.textContent.toLowerCase().includes("incorrect") || p.textContent.toLowerCase().includes("n'existe pas") || p.textContent.toLowerCase().includes("identifiant")) return p.textContent;
      }
      return null;
    }).catch(() => null);
    await page.close();
    throw new Error(
      errMsg || "Identifiants incorrects ou connexion bloquée. Vérifie IG_BOT_USERNAME et IG_BOT_PASSWORD dans .env"
    );
  }
  console.log("  ✓ Session OK");

  const csrf = (await page.cookies()).find((c) => c.name === "csrftoken")?.value || "";
  return { page, csrf };
}

async function getUserId(page, username) {
  console.log("  → Getting user ID for @" + username);

  // Use the search API from within the page context (uses Instagram domain)
  const searchData = await page.evaluate(async (u) => {
    try {
      const res = await fetch(
        `https://www.instagram.com/web/search/topsearch/?query=${u}`,
        { credentials: "include", headers: { "x-requested-with": "XMLHttpRequest", "Referer": "https://www.instagram.com/" } }
      );
      return await res.json();
    } catch (e) { return { error: e.message }; }
  }, username).catch(e => ({ error: e.message }));

  const user = searchData?.users?.find(
    x => x.user?.username?.toLowerCase() === username.toLowerCase()
  );
  if (user?.user?.pk) {
    console.log("  ✓ @" + username + " ID: " + user.user.pk);
    return user.user.pk;
  }
  if (user?.user?.id) {
    console.log("  ✓ @" + username + " ID: " + user.user.id);
    return user.user.id;
  }

  console.log("  [DEBUG] Search API response:", JSON.stringify(searchData).slice(0, 500));

  // Fallback: navigate to profile page and try to extract ID
  console.log("  → Loading profile page...");
  await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await new Promise((r) => setTimeout(r, 3000));
  console.log("  [DEBUG] Profile URL:", page.url());

  const text = await page.evaluate(() => document.body.innerText.slice(0, 500)).catch(() => "N/A");
  console.log("  [DEBUG] Page text:", text.replace(/\n/g, " | "));

  await page.screenshot({ path: "debug_profile.png" });
  return null;
}

async function checkFollowers(page, targetId, followerName, csrf) {
  let cursor = "";
  const HASH = "37479f2b8209594dde7facb0d904896a";

  for (let n = 0; n < 30; n++) {
    const data = await page.evaluate(
      async (hash, vars, token) => {
        const url = new URL("https://www.instagram.com/graphql/query/");
        url.searchParams.set("query_hash", hash);
        url.searchParams.set("variables", JSON.stringify(vars));
        const res = await fetch(url.toString(), {
          credentials: "include",
          headers: {
            "X-CSRFToken": token,
            "x-requested-with": "XMLHttpRequest",
            "x-instagram-ajax": "1",
            "x-ig-app-id": "936619743392459",
            "Referer": "https://www.instagram.com/",
          },
        });
        return await res.json();
      },
      HASH,
      { id: targetId, after: cursor, first: 50 },
      csrf
    );

    const edges = data?.data?.user?.edge_followed_by?.edges || [];
    for (const e of edges) {
      if (e.node.username.toLowerCase() === followerName) return true;
    }

    const info = data?.data?.user?.edge_followed_by?.page_info;
    if (!info?.has_next_page) break;
    cursor = info.end_cursor;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function checkFollow(username) {
  console.log("  → Creating session...");
  const { page, csrf } = await createSession();

  try {
    const cleanUser = username.trim().replace(/^@/, "").toLowerCase();
    const targetId = await getUserId(page, IG_TARGET);
    if (!targetId) return { verified: false, error: "@" + IG_TARGET + " introuvable" };

    const found = await checkFollowers(page, targetId, cleanUser, csrf);
    console.log(found ? "  ✓ @" + cleanUser + " trouvé" : "  ✗ @" + cleanUser + " pas trouvé");
    return { verified: found, username: cleanUser };
  } finally {
    await page.close();
  }
}

app.post("/api/verify-follow", async (req, res) => {
  const { username } = req.body;
  console.log("\n=== Verify @" + (username || "?") + " ===");
  if (!username || username.trim().length < 3) {
    return res.json({ verified: false, error: "Username invalide" });
  }
  try {
    const result = await checkFollow(username);
    console.log("  ✓ Done:", JSON.stringify(result));
    res.json(result);
  } catch (err) {
    console.error("  ✗ Error:", err.message);
    res.json({ verified: false, error: err.message });
  }
});

/* ==========================================
   TIKTOK VERIFICATION
   ========================================== */

let cachedTTTarget = null;

async function createTTSession() {
  console.log("  → Creating TikTok session...");
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
  );

  await page.goto("https://www.tiktok.com/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 3000));

  await page.setCookie({
    name: "sessionid",
    value: TT_SESSIONID,
    domain: ".tiktok.com",
    path: "/",
    httpOnly: true,
    secure: true,
  });

  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  const hasSession = (await page.cookies()).some((c) => c.name === "sessionid");
  if (!hasSession) {
    await page.screenshot({ path: "debug_tt_cookie_fail.png" });
    await page.close();
    throw new Error("Session TikTok invalide — mets à jour TT_SESSIONID dans .env");
  }

  console.log("  ✓ TikTok session OK (cookie)");
  return page;
}

async function getTTUserInfo(page, targetUsername) {
  if (cachedTTTarget?.uniqueId === targetUsername) {
    console.log("  ✓ @" + targetUsername + " secUid (cache): " + cachedTTTarget.secUid.slice(0, 16) + "...");
    return cachedTTTarget;
  }

  console.log("  → Getting TikTok user info for @" + targetUsername);

  // Intercepter la réponse API que le frontend TikTok appelle
  const apiPromise = new Promise((resolve) => {
    const handler = async (response) => {
      if (response.url().includes('/api/user/detail/')) {
        try {
          const data = await response.json();
          const user = data?.user || data;
          if (user?.secUid) {
            page.off('response', handler);
            resolve(user);
          }
        } catch (e) {}
      }
    };
    page.on('response', handler);
    setTimeout(() => { page.off('response', handler); resolve(null); }, 20000);
  });

  await page.goto(`https://www.tiktok.com/@${targetUsername}`, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  let userInfo = await apiPromise;

  if (!userInfo) {
    console.log("  → Fallback: extraction HTML...");
    await new Promise((r) => setTimeout(r, 3000));
    userInfo = await page.evaluate(() => {
      const html = document.documentElement.innerHTML;
      const secUidMatch = html.match(/"secUid"\s*:\s*"([^"]{20,})"/);
      const uniqueIdMatch = html.match(/"uniqueId"\s*:\s*"([^"]+)"/);
      if (secUidMatch) {
        return { secUid: secUidMatch[1], uniqueId: uniqueIdMatch ? uniqueIdMatch[1] : "" };
      }
      return null;
    });
  }

  if (userInfo?.secUid) {
    cachedTTTarget = { ...userInfo, uniqueId: targetUsername };
    console.log("  ✓ @" + targetUsername + " secUid: " + userInfo.secUid.slice(0, 16) + "...");
    return userInfo;
  }

  await page.screenshot({ path: "debug_tt_profile.png" });
  return null;
}

async function checkTTFollowers(page, secUid, followerName) {
  console.log("  → Checking via @" + followerName + " following list...");

  await page.goto(`https://www.tiktok.com/@${followerName}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForFunction(
    () => document.documentElement.innerHTML.includes('"secUid"'),
    { timeout: 15000 }
  ).catch(() => {});
  await new Promise((r) => setTimeout(r, 3000));

  let found = false;
  let totalChecked = 0;

  const responseHandler = async (response) => {
    if (response.url().includes('/api/user/list/')) {
      try {
        const data = await response.json();
        const list = data?.userList || [];
        totalChecked += list.length;
        console.log("  [DEBUG] Batch following:", list.length, "(total:", totalChecked + ")");
        for (const u of list) {
          const uid = u.uniqueId?.toLowerCase() || u.user?.uniqueId?.toLowerCase();
          if (uid === TT_TARGET.toLowerCase()) found = true;
        }
      } catch (e) {}
    }
  };

  page.on("response", responseHandler);

  const opened = await page.evaluate(() => {
    for (const sel of [
      '[data-e2e="following-count"]',
      'strong[title*="Following"]',
    ]) {
      const el = document.querySelector(sel);
      if (el) { el.click(); return true; }
    }
    for (const el of document.querySelectorAll("strong, span, div, a")) {
      const t = el.textContent.trim();
      if (/^\d[\d.,]*[KMB]?\s*Following/i.test(t)) {
        el.click(); return true;
      }
    }
    return false;
  });

  console.log("  [DEBUG] Modal following ouverte:", opened);
  await new Promise((r) => setTimeout(r, 3000));

  for (let i = 0; i < 100 && !found; i++) {
    await page.evaluate(() => {
      const selectors = [
        '[role="dialog"]',
        '[class*="DivFollowContainer"]',
        '[class*="following-list"]',
        '[class*="RelationList"]',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.scrollHeight > el.clientHeight) {
          el.scrollTop += 600;
          return;
        }
      }
      window.scrollBy(0, 600);
    });
    await new Promise((r) => setTimeout(r, 800));
  }

  page.off("response", responseHandler);
  console.log("  [DEBUG] Total following vérifiés:", totalChecked);
  return found;
}

async function checkTTFollow(username) {
  console.log("  → Creating TikTok session...");
  const page = await createTTSession();

  try {
    const cleanUser = username.trim().replace(/^@/, "").toLowerCase();
    const userInfo = await getTTUserInfo(page, TT_TARGET);
    if (!userInfo) return { verified: false, error: "@" + TT_TARGET + " introuvable sur TikTok" };

    const found = await checkTTFollowers(page, userInfo.secUid, cleanUser);
    console.log(found ? "  ✓ @" + cleanUser + " trouvé sur TikTok" : "  ✗ @" + cleanUser + " pas trouvé sur TikTok");
    return { verified: found, username: cleanUser };
  } finally {
    await page.close();
  }
}

app.post("/api/verify-tt-follow", async (req, res) => {
  const { username } = req.body;
  console.log("\n=== TikTok Verify @" + (username || "?") + " ===");
  if (!username || username.trim().length < 3) {
    return res.json({ verified: false, error: "Username invalide" });
  }
  try {
    const result = await checkTTFollow(username);
    console.log("  ✓ Done:", JSON.stringify(result));
    res.json(result);
  } catch (err) {
    console.error("  ✗ Error:", err.message);
    res.json({ verified: false, error: err.message });
  }
});

/* ==========================================
   FACEBOOK VERIFICATION
   ========================================== */

async function createFBSession() {
  console.log("  → Creating Facebook session...");
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
  );

  if (!FB_USER_ID || !FB_XS) {
    throw new Error("FB_USER_ID ou FB_XS manquant dans .env");
  }

  await page.goto("https://web.facebook.com/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 3000));

  // Set only the two essential session cookies
  await page.setCookie(
    { name: "c_user", value: FB_USER_ID, domain: ".facebook.com", path: "/", httpOnly: true, secure: true, sameSite: "None" },
    { name: "xs", value: FB_XS, domain: ".facebook.com", path: "/", httpOnly: true, secure: true, sameSite: "None" }
  );

  await page.goto("https://web.facebook.com/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 3000));

  const hasSession = (await page.cookies()).some((c) => c.name === "c_user");
  if (!hasSession) {
    await page.screenshot({ path: "debug_fb_cookie_fail.png" });
    await page.close();
    throw new Error("Session Facebook invalide — vérifie FB_USER_ID et FB_XS dans .env");
  }
  console.log("  ✓ Session Facebook OK");
  return page;
}

function resolveFBUrl(input) {
  let clean = input.trim().replace(/^@/, "");

  // Full URL: extract the path
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    try {
      const url = new URL(clean);
      clean = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "") || url.searchParams.get("id") || clean;
    } catch (_) {}
  }

  // profile.php?id=XXXX → just the id
  if (clean.startsWith("profile.php")) {
    const params = new URLSearchParams(clean.replace("profile.php?", ""));
    const id = params.get("id");
    if (id) return { type: "id", value: id };
    return { type: "raw", value: clean };
  }

  // Numeric-only → id
  if (/^\d+$/.test(clean)) return { type: "id", value: clean };

  // Otherwise treat as username
  return { type: "username", value: clean };
}

async function getFBProfileIdentifier(page, input) {
  const resolved = resolveFBUrl(input);
  let profileUrl;

  if (resolved.type === "id") {
    profileUrl = `https://web.facebook.com/profile.php?id=${resolved.value}`;
  } else {
    profileUrl = `https://web.facebook.com/${resolved.value}`;
  }

  console.log("  → Visiting profile: " + profileUrl);
  await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 3000));

  const info = await page.evaluate(() => {
    // Get the current URL (may have been redirected)
    const currentUrl = window.location.href.toLowerCase();

    // Try to get the real display name from the page header
    const nameEl = document.querySelector(
      'h1, [data-testid="profile_name"], [data-pagelet="ProfileTitle"], ' +
      '[data-testid="mw_profile_header_display_name"], ' +
      'span[dir="auto"]:not([class*=" "]):not(:empty)'
    );
    let name = null;
    if (nameEl) name = nameEl.textContent.trim();

    // Fallback: extract from title
    if (!name || name.length > 80) {
      const title = document.title
        .replace(/ \| Facebook$/, "")
        .replace(/ - Facebook$/, "")
        .trim();
      if (title && title.length > 0 && title.length < 80 && !title.match(/^(facebook|meta|log in|connect|welcome)$/i)) {
        name = title;
      }
    }

    return { name: name ? name.toLowerCase() : null, currentUrl };
  }).catch(() => ({ name: null, currentUrl: "" }));

  // Also extract username or id from the current URL
  let id = resolved.value;
  let type = resolved.type;
  try {
    const url = new URL(info.currentUrl);
    const pathParts = url.pathname.replace(/^\/+/, "").split("/");
    if (pathParts[0] && pathParts[0] !== "profile.php") {
      id = pathParts[0];
      type = "username";
    }
    const urlId = url.searchParams.get("id");
    if (urlId) { id = urlId; type = "id"; }
  } catch (_) {}

  // If the display name is generic, use the identifier instead
  const name = (info.name && !info.name.match(/^(facebook|meta)$/)) ? info.name : id;

  console.log("  → Profile identifier: \"" + name + "\" (type: " + type + ")");
  return { name, id, type };
}

async function checkFBFollower(page, identifier) {
  if (!identifier) return false;

  console.log("  → Checking if \"" + identifier + "\" follows " + FB_TARGET);

  await page.goto(`https://web.facebook.com/${FB_TARGET}/followers`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 3000));

  // Search specifically in profile links, not the entire HTML
  const found = await page.evaluate((searchTerm) => {
    const lower = searchTerm.toLowerCase();
    const links = document.querySelectorAll('a[href*="facebook.com"], a[href*="/user/"], a[href*="profile.php"]');
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      const text = link.textContent.toLowerCase();
      if (href.includes(lower) || href.includes("/" + lower) || text.includes(lower)) return true;
    }
    return false;
  }, identifier);

  console.log(found ? "  ✓ trouvé" : "  ✗ pas trouvé");
  return found;
}

async function checkFbFollow(input) {
  console.log("  → Creating Facebook session...");
  const page = await createFBSession();

  try {
    const { name, id } = await getFBProfileIdentifier(page, input);
    const found = await checkFBFollower(page, name);
    return { verified: found, username: input };
  } finally {
    await page.close();
  }
}

app.post("/api/verify-fb-follow", async (req, res) => {
  const { username } = req.body;
  console.log("\n=== Facebook Verify @" + (username || "?") + " ===");
  if (!username || username.trim().length < 3) {
    return res.json({ verified: false, error: "Username invalide" });
  }
  try {
    const result = await checkFbFollow(username);
    console.log("  ✓ Done:", JSON.stringify(result));
    res.json(result);
  } catch (err) {
    console.error("  ✗ Error:", err.message);
    res.json({ verified: false, error: err.message });
  }
});

if (!IG_TARGET) throw new Error("IG_TARGET_USERNAME manquant dans .env");
if (!TT_TARGET) throw new Error("TT_TARGET_USERNAME manquant dans .env");

app.listen(PORT, () => {
  console.log("✓ IG Verify server on http://localhost:" + PORT);
  console.log("✓ Checking follows for @" + IG_TARGET);
  console.log("✓ Checking TikTok follows for @" + TT_TARGET);
  if (FB_TARGET) console.log("✓ Checking Facebook follows for " + FB_TARGET);
});
