import os
import re
import json
import time
from urllib.parse import urlparse, parse_qs

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

load_dotenv()

app = Flask(__name__)
CORS(app)

PORT = int(os.getenv("PORT", "3002"))
IG_BOT_USERNAME = os.getenv("IG_BOT_USERNAME")
IG_BOT_PASSWORD = os.getenv("IG_BOT_PASSWORD")
IG_SESSIONID = os.getenv("IG_SESSIONID")
IG_TARGET = os.getenv("IG_TARGET_USERNAME")
TT_SESSIONID = os.getenv("TT_SESSIONID")
TT_TARGET = os.getenv("TT_TARGET_USERNAME")
FB_TARGET = os.getenv("FB_TARGET_USERNAME")
FB_USER_ID = os.getenv("FB_USER_ID")
FB_XS = os.getenv("FB_XS")

browser = None


def get_browser(playwright):
    global browser
    if browser is None or not browser.is_connected():
        browser = playwright.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--window-size=1280,800",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
            ],
        )
    return browser


# ============================================================
#  INSTAGRAM
# ============================================================

def ig_create_session(page):
    if IG_SESSIONID:
        print("  -> Using session cookie from .env")
        page.goto("https://www.instagram.com/", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        page.context.add_cookies([{
            "name": "sessionid",
            "value": IG_SESSIONID,
            "domain": ".instagram.com",
            "path": "/",
            "httpOnly": True,
            "secure": True,
        }])
        page.goto("https://www.instagram.com/", wait_until="networkidle", timeout=30000)
        time.sleep(3)
        cookies = page.context.cookies()
        has_session = any(c["name"] == "sessionid" for c in cookies)
        if not has_session:
            page.screenshot(path="debug_cookie_fail.png")
            raise Exception("Session cookie invalide ou expire")
        print("  - Session OK (cookie)")
        csrf = next((c["value"] for c in cookies if c["name"] == "csrftoken"), "")
        return csrf

    page.goto("https://www.instagram.com/accounts/login/", wait_until="domcontentloaded", timeout=30000)
    time.sleep(4)
    print("  - Login page loaded")

    page.fill('input[name="username"]', IG_BOT_USERNAME)
    page.fill('input[name="password"]', IG_BOT_PASSWORD)
    time.sleep(0.5)

    with page.expect_navigation(timeout=25000) as nav_info:
        page.keyboard.press("Enter")
    time.sleep(5)

    cookies = page.context.cookies()
    has_session = any(c["name"] == "sessionid" for c in cookies)
    if not has_session:
        page.screenshot(path="debug_post_login.png")
        raise Exception("Identifiants incorrects ou connexion bloquee")
    print("  - Session OK")
    csrf = next((c["value"] for c in cookies if c["name"] == "csrftoken"), "")
    return csrf


def ig_get_user_id(page, username, csrf):
    print(f"  -> Getting user ID for @{username}")
    result = page.evaluate("""
        async (u) => {
            try {
                const res = await fetch(
                    "https://www.instagram.com/web/search/topsearch/?query=" + u,
                    { credentials: "include", headers: { "x-requested-with": "XMLHttpRequest", "Referer": "https://www.instagram.com/" } }
                );
                return await res.json();
            } catch (e) { return { error: e.message }; }
        }
    """, username)

    users = result.get("users") or []
    for entry in users:
        user = entry.get("user") or {}
        if user.get("username", "").lower() == username.lower():
            pk = user.get("pk") or user.get("id")
            if pk:
                print(f"  - @{username} ID: {pk}")
                return str(pk)

    print(f"  [DEBUG] Search result: {json.dumps(result)[:500]}")
    print("  -> Loading profile page...")
    page.goto(f"https://www.instagram.com/{username}/", wait_until="domcontentloaded", timeout=20000)
    time.sleep(3)
    page.screenshot(path="debug_profile.png")
    return None


def ig_check_followers(page, target_id, follower_name, csrf):
    query_hash = "37479f2b8209594dde7facb0d904896a"
    cursor = ""
    for n in range(30):
        data = page.evaluate("""
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
            }
        """, query_hash, {"id": target_id, "after": cursor, "first": 50}, csrf)

        edges = (data.get("data") or {}).get("user", {}).get("edge_followed_by", {}).get("edges") or []
        for e in edges:
            if e.get("node", {}).get("username", "").lower() == follower_name:
                return True

        info = (data.get("data") or {}).get("user", {}).get("edge_followed_by", {}).get("page_info")
        if not info or not info.get("has_next_page"):
            break
        cursor = info["end_cursor"]
        time.sleep(0.4)

    return False


def ig_verify(username):
    with sync_playwright() as pw:
        print("  -> Creating session...")
        b = get_browser(pw)
        page = b.new_page()
        page.set_viewport_size({"width": 390, "height": 844})
        page.set_extra_http_headers({
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        })
        try:
            clean_user = username.strip().lstrip("@").lower()
            csrf = ig_create_session(page)
            target_id = ig_get_user_id(page, IG_TARGET, csrf)
            if not target_id:
                return {"verified": False, "error": f"@{IG_TARGET} introuvable"}
            found = ig_check_followers(page, target_id, clean_user, csrf)
            print(f"  {'-'} @{clean_user} {'trouve' if found else 'pas trouve'}")
            return {"verified": found, "username": clean_user}
        finally:
            page.close()


# ============================================================
#  TIKTOK
# ============================================================

tt_cache = {}


def tt_create_session(playwright):
    global tt_cache
    print("  -> Creating TikTok session...")
    b = get_browser(playwright)
    page = b.new_page()
    page.set_viewport_size({"width": 1280, "height": 800})
    page.set_extra_http_headers({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    })

    page.goto("https://www.tiktok.com/", wait_until="domcontentloaded", timeout=60000)
    time.sleep(3)

    page.context.add_cookies([{
        "name": "sessionid",
        "value": TT_SESSIONID,
        "domain": ".tiktok.com",
        "path": "/",
        "httpOnly": True,
        "secure": True,
    }])

    page.reload(wait_until="domcontentloaded", timeout=60000)
    time.sleep(3)

    cookies = page.context.cookies()
    has_session = any(c["name"] == "sessionid" for c in cookies)
    if not has_session:
        page.screenshot(path="debug_tt_cookie_fail.png")
        page.close()
        raise Exception("Session TikTok invalide")

    print("  - TikTok session OK (cookie)")
    return page


def tt_get_user_info(page, username):
    global tt_cache
    if tt_cache.get("uniqueId") == username:
        print(f"  - @{username} secUid (cache): {tt_cache['secUid'][:16]}...")
        return tt_cache

    print(f"  -> Getting TikTok user info for @{username}")
    user_info = None

    def handle_response(response):
        nonlocal user_info
        if "/api/user/detail/" in response.url:
            try:
                data = response.json()
                u = data.get("user") or data
                if u.get("secUid"):
                    user_info = u
            except:
                pass

    page.on("response", handle_response)
    page.goto(f"https://www.tiktok.com/@{username}", wait_until="networkidle", timeout=60000)
    time.sleep(5)

    if not user_info:
        print("  -> Fallback: HTML extraction...")
        html = page.content()
        m = re.search(r'"secUid"\s*:\s*"([^"]{20,})"', html)
        m2 = re.search(r'"uniqueId"\s*:\s*"([^"]+)"', html)
        if m:
            user_info = {"secUid": m.group(1), "uniqueId": m2.group(1) if m2 else username}

    if user_info and user_info.get("secUid"):
        tt_cache.update(user_info)
        tt_cache["uniqueId"] = username
        print(f"  - @{username} secUid: {user_info['secUid'][:16]}...")
        return user_info

    page.screenshot(path="debug_tt_profile.png")
    return None


def tt_check_followers(page, follower_name):
    print(f"  -> Checking via @{follower_name} following list...")

    page.goto(f"https://www.tiktok.com/@{follower_name}", wait_until="domcontentloaded", timeout=60000)
    time.sleep(3)

    found = [False]
    total_checked = [0]

    def handle_response(response):
        if "/api/user/list/" in response.url:
            try:
                data = response.json()
                lst = data.get("userList") or []
                total_checked[0] += len(lst)
                print(f"  [DEBUG] Batch following: {len(lst)} (total: {total_checked[0]})")
                for u in lst:
                    uid = (u.get("uniqueId") or u.get("user", {}).get("uniqueId") or "").lower()
                    if uid == TT_TARGET.lower():
                        found[0] = True
            except:
                pass

    page.on("response", handle_response)

    opened = page.evaluate("""
        () => {
            for (const sel of ['[data-e2e="following-count"]', 'strong[title*="Following"]']) {
                const el = document.querySelector(sel);
                if (el) { el.click(); return true; }
            }
            for (const el of document.querySelectorAll("strong, span, div, a")) {
                const t = el.textContent.trim();
                if (/^\\d[\\d.,]*[KMB]?\\s*Following/i.test(t)) { el.click(); return true; }
            }
            return false;
        }
    """)
    print(f"  [DEBUG] Modal following ouverte: {opened}")
    time.sleep(3)

    for i in range(100):
        if found[0]:
            break
        page.evaluate("""
            () => {
                const sels = ['[role="dialog"]', '[class*="DivFollowContainer"]', '[class*="following-list"]', '[class*="RelationList"]'];
                for (const sel of sels) {
                    const el = document.querySelector(sel);
                    if (el && el.scrollHeight > el.clientHeight) { el.scrollTop += 600; return; }
                }
                window.scrollBy(0, 600);
            }
        """)
        time.sleep(0.8)

    print(f"  [DEBUG] Total following verifies: {total_checked[0]}")
    return found[0]


def tt_verify(username):
    with sync_playwright() as pw:
        page = tt_create_session(pw)
        try:
            clean_user = username.strip().lstrip("@").lower()
            if not TT_TARGET:
                return {"verified": False, "error": "TT_TARGET_USERNAME manquant"}
            user_info = tt_get_user_info(page, TT_TARGET)
            if not user_info:
                return {"verified": False, "error": f"@{TT_TARGET} introuvable sur TikTok"}
            found = tt_check_followers(page, clean_user)
            print(f"  - @{clean_user} {'trouve' if found else 'pas trouve'} sur TikTok")
            return {"verified": found, "username": clean_user}
        finally:
            page.close()


# ============================================================
#  FACEBOOK
# ============================================================

def fb_resolve_url(input_str):
    clean = input_str.strip().lstrip("@")
    if clean.startswith("http://") or clean.startswith("https://"):
        parsed = urlparse(clean)
        path = parsed.path.strip("/")
        if path:
            return {"type": "username", "value": path}
        qs = parse_qs(parsed.query)
        if qs.get("id"):
            return {"type": "id", "value": qs["id"][0]}
        return {"type": "raw", "value": clean}
    if clean.startswith("profile.php"):
        qs = parse_qs(clean.replace("profile.php?", ""))
        if qs.get("id"):
            return {"type": "id", "value": qs["id"][0]}
        return {"type": "raw", "value": clean}
    if re.match(r"^\d+$", clean):
        return {"type": "id", "value": clean}
    return {"type": "username", "value": clean}


def fb_create_session(page):
    print("  -> Creating Facebook session...")
    if not FB_USER_ID or not FB_XS:
        raise Exception("FB_USER_ID ou FB_XS manquant dans .env")

    page.goto("https://web.facebook.com/", wait_until="domcontentloaded", timeout=30000)
    time.sleep(3)

    page.context.add_cookies([
        {"name": "c_user", "value": FB_USER_ID, "domain": ".facebook.com", "path": "/", "httpOnly": True, "secure": True, "sameSite": "None"},
        {"name": "xs", "value": FB_XS, "domain": ".facebook.com", "path": "/", "httpOnly": True, "secure": True, "sameSite": "None"},
    ])

    page.goto("https://web.facebook.com/", wait_until="domcontentloaded", timeout=30000)
    time.sleep(3)

    cookies = page.context.cookies()
    has_session = any(c["name"] == "c_user" for c in cookies)
    if not has_session:
        page.screenshot(path="debug_fb_cookie_fail.png")
        raise Exception("Session Facebook invalide")
    print("  - Session Facebook OK")


def fb_get_profile_identifier(page, input_str):
    resolved = fb_resolve_url(input_str)
    if resolved["type"] == "id":
        profile_url = f"https://web.facebook.com/profile.php?id={resolved['value']}"
    else:
        profile_url = f"https://web.facebook.com/{resolved['value']}"

    print(f"  -> Visiting profile: {profile_url}")
    page.goto(profile_url, wait_until="domcontentloaded", timeout=30000)
    time.sleep(3)

    info = page.evaluate("""
        () => {
            const currentUrl = window.location.href.toLowerCase();
            const nameEl = document.querySelector('h1, [data-testid="profile_name"], [data-pagelet="ProfileTitle"], [data-testid="mw_profile_header_display_name"], span[dir="auto"]:not([class*=" "])');
            let name = null;
            if (nameEl) name = nameEl.textContent.trim();
            if (!name || name.length > 80) {
                const title = document.title.replace(/ \\| Facebook$/, "").replace(/ - Facebook$/, "").trim();
                if (title && title.length > 0 && title.length < 80 && !/^(facebook|meta|log in|connect|welcome)$/i.test(title)) name = title;
            }
            return { name: name ? name.toLowerCase() : null, currentUrl };
        }
    """)

    identifier = resolved["value"]
    id_type = resolved["type"]
    try:
        parsed = urlparse(info["currentUrl"])
        path_parts = parsed.path.strip("/").split("/")
        if path_parts[0] and path_parts[0] != "profile.php":
            identifier = path_parts[0]
            id_type = "username"
        url_id = parse_qs(parsed.query).get("id")
        if url_id:
            identifier = url_id[0]
            id_type = "id"
    except:
        pass

    name = info["name"] if info["name"] and not re.match(r"^(facebook|meta)$", info["name"]) else identifier
    print(f"  -> Profile identifier: \"{name}\" (type: {id_type})")
    return name, identifier, id_type


def fb_check_follower(page, identifier):
    if not identifier:
        return False
    print(f'  -> Checking if "{identifier}" follows {FB_TARGET}')

    page.goto(f"https://web.facebook.com/{FB_TARGET}/followers", wait_until="domcontentloaded", timeout=30000)
    time.sleep(3)

    found = page.evaluate("""
        (searchTerm) => {
            const lower = searchTerm.toLowerCase();
            const links = document.querySelectorAll('a[href*="facebook.com"], a[href*="/user/"], a[href*="profile.php"]');
            for (const link of links) {
                const href = link.getAttribute("href") || "";
                const text = link.textContent.toLowerCase();
                if (href.includes(lower) || href.includes("/" + lower) || text.includes(lower)) return true;
            }
            return false;
        }
    """, identifier)

    print(f"  {'trouve' if found else 'pas trouve'}")
    return found


def fb_verify(username):
    with sync_playwright() as pw:
        b = get_browser(pw)
        page = b.new_page()
        page.set_viewport_size({"width": 1280, "height": 800})
        page.set_extra_http_headers({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        })
        try:
            fb_create_session(page)
            name, _id, _type = fb_get_profile_identifier(page, username)
            found = fb_check_follower(page, name)
            return {"verified": found, "username": username}
        finally:
            page.close()


# ============================================================
#  ROUTES
# ============================================================

@app.route("/api/verify-follow", methods=["POST"])
def api_verify_follow():
    data = request.get_json() or {}
    username = data.get("username", "")
    print(f"\n=== Verify @{username} ===")
    if not username or len(username.strip()) < 3:
        return jsonify({"verified": False, "error": "Username invalide"})
    try:
        result = ig_verify(username)
        print(f"  - Done: {json.dumps(result)}")
        return jsonify(result)
    except Exception as e:
        print(f"  - Error: {e}")
        return jsonify({"verified": False, "error": str(e)})


@app.route("/api/verify-tt-follow", methods=["POST"])
def api_verify_tt_follow():
    data = request.get_json() or {}
    username = data.get("username", "")
    print(f"\n=== TikTok Verify @{username} ===")
    if not username or len(username.strip()) < 3:
        return jsonify({"verified": False, "error": "Username invalide"})
    try:
        result = tt_verify(username)
        print(f"  - Done: {json.dumps(result)}")
        return jsonify(result)
    except Exception as e:
        print(f"  - Error: {e}")
        return jsonify({"verified": False, "error": str(e)})


@app.route("/api/verify-fb-follow", methods=["POST"])
def api_verify_fb_follow():
    data = request.get_json() or {}
    username = data.get("username", "")
    print(f"\n=== Facebook Verify @{username} ===")
    if not username or len(username.strip()) < 3:
        return jsonify({"verified": False, "error": "Username invalide"})
    try:
        result = fb_verify(username)
        print(f"  - Done: {json.dumps(result)}")
        return jsonify(result)
    except Exception as e:
        print(f"  - Error: {e}")
        return jsonify({"verified": False, "error": str(e)})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    if not IG_TARGET:
        raise Exception("IG_TARGET_USERNAME manquant dans .env")
    if not TT_TARGET:
        raise Exception("TT_TARGET_USERNAME manquant dans .env")
    print(f"IG Verify server on http://0.0.0.0:{PORT}")
    print(f"Checking follows for @{IG_TARGET}")
    print(f"Checking TikTok follows for @{TT_TARGET}")
    if FB_TARGET:
        print(f"Checking Facebook follows for {FB_TARGET}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
