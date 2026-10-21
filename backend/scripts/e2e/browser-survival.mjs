/**
 * E2E verification harness for the IDOP/AVAN backend.
 *
 * REQUIRES A RUNNING STACK. Talks to a live backend on http://localhost:3000/api/v1
 * and asserts against PostgreSQL directly via psql.
 *
 * TEMP-ONLY DEPENDENCY -- NOT A DELIVERABLE:
 *   This machine has no Redis. These harnesses depend on a throwaway in-memory
 *   RESP2 shim listening on 127.0.0.1:6379 (mini-redis.mjs, kept OUTSIDE the repo).
 *   That shim is TEST SCAFFOLD ONLY: not a product component, not referenced by any
 *   runtime code, and must never be shipped or cited as one. Production uses the real
 *   Redis declared in docker-compose.yml -- see docs/DEPLOYMENT.md.
 *
 *   The in-memory shim resets on restart, so its INCR counters restart at 1 and would
 *   collide with numbers already persisted (SO-2026-00001, EMP-...). crud-verify
 *   therefore fast-forwards every counter above the highest value in Postgres first.
 *
 *   browser-survival.mjs additionally needs puppeteer-core (dev-only), which lives in
 *   the harness runtime's node_modules -- run it from there or install it alongside.
 *
 * Source of these files: the Step 4 verification session. See docs/FINAL-REPORT.md
 * section 8 for the artifact index and section 6 for the recorded results.
 */
// Step 3 - token survival proof in a REAL browser (Chrome via puppeteer-core).
//
// What this proves, against the Vite dev server at :5173 (same-origin /api proxy):
//   1. Logging in through the real UI sets `idop_refresh` (HttpOnly) + `idop_csrf`.
//   2. A full page reload keeps the user signed in - i.e. the session survives
//      because the refresh cookie is replayed, not because anything was in JS memory.
//   3. After the reload NO /api/v1 request returns 401, and none is answered with
//      an HTML document (the old bug: the SPA falling back to index.html).
import puppeteer from 'puppeteer-core';

const APP = 'http://localhost:5173';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
// The login form's user field is `name="phone"` (placeholder 09123456789), so
// sign in with the seeded phone, not the email identifier.
const PHONE = '09354121335';   // company@avan.local (COMPANY_ADMIN)
const PASSWORD = 'Avan@1404';
// idop_refresh is Path=/api/v1/auth, so it is only visible when querying a URL
// under that path - page.cookies() at /login cannot see it.
const AUTH_URL = `${APP}/api/v1/auth/me`;
const getAuthCookies = (p) => p.cookies(AUTH_URL);

const results = [];
const log = (ok, step, detail) => {
  results.push({ ok, step });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${step} | ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
});

try {
  const page = await browser.newPage();

  // Capture every API response so we can assert none of them 401 or return HTML.
  const apiResponses = [];
  const watch = (p) => {
    p.on('response', async (res) => {
      const url = res.url();
      if (!url.includes('/api/v1')) return;
      let contentType = '';
      try { contentType = res.headers()['content-type'] || ''; } catch { /* ignore */ }
      apiResponses.push({ url: url.replace(APP, ''), status: res.status(), contentType });
    });
  };
  watch(page);

  // ── 1. Real UI login ────────────────────────────────────────────────────────
  // The app keeps long-polling (websockets + bootstrap fetches), so
  // `networkidle2` never settles and navigation times out. Wait for the DOM
  // plus the login form instead.
  await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('input[type="password"]', { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));

  // Fill the login form. The user field is `name="phone"`, so target it by name
  // and fall back to the first non-password input.
  const typed = await page.evaluate(({ phone, pw }) => {
    const byType = [...document.querySelectorAll('input')];
    const user = byType.find((i) => i.name === 'phone')
      || byType.find((i) => /text|tel|email/.test(i.type))
      || byType[0];
    const pass = byType.find((i) => i.type === 'password');
    if (!user || !pass) return { ok: false, reason: 'no login inputs found' };
    const set = (el, v) => {
      const proto = Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      desc.set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    set(user, phone);
    set(pass, pw);
    return { ok: true, userField: user.name || user.placeholder };
  }, { phone: PHONE, pw: PASSWORD });

  if (!typed.ok) {
    log(false, 'UI login form found', typed.reason);
  } else {
    // Prefer clicking the submit button over pressing Enter: RHF-controlled
    // forms validate on submit, and the button is the real user path.
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('form button[type="submit"], form button');
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (!clicked) await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 5000));
    // Wait for a post-login redirect away from the login screen.
    const url = page.url();
    const cookies = await getAuthCookies(page);
    const refresh = cookies.find((c) => c.name === 'idop_refresh');
    const csrf = cookies.find((c) => c.name === 'idop_csrf');
    log(!!refresh, 'login sets idop_refresh cookie', { hasRefresh: !!refresh, httpOnly: refresh?.httpOnly, sameSite: refresh?.sameSite, path: refresh?.path, maxAge: refresh?.expires ? Math.round(refresh.expires - Date.now() / 1000) : null });
    log(!!csrf, 'login sets idop_csrf cookie (JS-readable)', { hasCsrf: !!csrf, httpOnly: csrf?.httpOnly, path: csrf?.path });
    log(url !== APP + '/' && !/login/i.test(url), 'UI navigated away from login', { url });
  }

  // ── 2. Hard reload: nothing in JS memory survives, only the cookies ─────────
  const beforeReload = apiResponses.length;
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 6000));

  const afterReload = apiResponses.slice(beforeReload);
  const unauth = afterReload.filter((r) => r.status === 401);
  const htmlServed = afterReload.filter((r) => /text\/html/.test(r.contentType) && r.url.startsWith('/api/v1'));
  const okCalls = afterReload.filter((r) => r.status >= 200 && r.status < 300);

  log(afterReload.length > 0, 'reload made authenticated /api/v1 calls', { total: afterReload.length, ok: okCalls.length });
  log(unauth.length === 0, 'no /api/v1 request returned 401 after reload', { unauthed: unauth.map((r) => `${r.status} ${r.url}`) });
  log(htmlServed.length === 0, 'no /api/v1 request fell back to an HTML document', { html: htmlServed.map((r) => r.url) });

  // ── 3. Still signed in after reload? ────────────────────────────────────────
  const stillSignedIn = await page.evaluate(() => !/login/i.test(location.pathname + location.hash));
  log(stillSignedIn, 'session survived a full reload', { url: page.url() });

  // ── 4. Logout clears the cookies ────────────────────────────────────────────
  // Use the REAL logout button (TopBar «خروج»), which routes through the app's
  // request() and therefore carries the in-memory access token. A raw fetch()
  // here would omit the Bearer header and 401 (the endpoint is JWT-guarded),
  // proving nothing about cookie clearing.
  const clickedLogout = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => (b.innerText || '').includes('خروج'));
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!clickedLogout) log(false, 'logout button found in TopBar', 'button «خروج» not present');
  await new Promise((r) => setTimeout(r, 3000));
  const loggedOutUrl = page.url();
  const afterLogout = await getAuthCookies(page);
  const stillThere = afterLogout.some((c) => c.name === 'idop_refresh');
  log(clickedLogout && !stillThere, 'logout cleared idop_refresh', { clickedLogout, stillThere, url: loggedOutUrl });
} catch (e) {
  log(false, 'browser run', String(e && e.message ? e.message : e));
} finally {
  await browser.close();
}

const passed = results.filter((r) => r.ok).length;
console.log(`\nBROWSER SUMMARY: ${passed} / ${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
