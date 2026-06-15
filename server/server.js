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
const IG_TARGET = process.env.IG_TARGET_USERNAME || "activicode";
const IG_SESSIONID = process.env.IG_SESSIONID;

let browser;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,800"],
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

app.listen(PORT, () => {
  console.log("✓ IG Verify server on http://localhost:" + PORT);
  console.log("✓ Checking follows for @" + IG_TARGET);
});
