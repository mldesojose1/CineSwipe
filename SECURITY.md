# Security Policy

CineSwipe is a client-side SPA that fetches public movie data from TMDB.
This document describes how we handle security: what data we store, how we
respond to vulnerability reports, and what we verify before every deploy.

---

## Reporting a Vulnerability

**Do not open a public GitHub Issue for security vulnerabilities.**

If you discover a security issue, please report it privately:

| Channel | Address |
|---|---|
| Email | security@cineswipe.app *(replace with a real address before going public)* |
| GitHub | Use [Private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) on this repository |

### What to include in your report

- Description of the vulnerability and affected component
- Steps to reproduce (a minimal proof-of-concept is enough)
- Potential impact in your assessment
- Your name/handle for credit (optional)

### What to expect

| Timeline | Action |
|---|---|
| **48 h** | Acknowledgement of your report |
| **7 days** | Initial triage and severity assessment |
| **30 days** | Fix deployed or documented workaround published |
| **90 days** | Public disclosure (coordinated with reporter) |

We follow responsible disclosure. We ask that you do not publish details
publicly until we have had 30 days to address the issue.

### Scope

| In scope | Out of scope |
|---|---|
| Vulnerabilities in CineSwipe's own code | Vulnerabilities in TMDB's infrastructure |
| Misconfigured security headers | Issues requiring physical access to a user's device |
| XSS or data exposure in the client app | Social engineering attacks |
| Leaked secrets in git history | Theoretical attacks with no realistic exploitation path |

---

## User Data Inventory

CineSwipe stores data exclusively in the user's browser.
**No data is sent to any server other than TMDB's public API.**

### localStorage — `cineswipe_history_v1`

| Field | Type | Example | Purpose |
|---|---|---|---|
| `movie.id` | number | `550` | Identify the movie |
| `movie.title` | string | `"Fight Club"` | Display in history |
| `movie.poster_path` | string \| null | `"/poster.jpg"` | Show thumbnail |
| `action` | `"SWIPE_RIGHT"` \| `"SWIPE_LEFT"` | — | Record user preference |
| `timestamp` | number (unix ms) | `1714000000000` | Order history |

- **Retention**: Until the user clears browser data or uses the in-app "Clear History" action.
- **Sensitivity**: Low — movie preferences only. No PII collected.
- **Shared with**: Nobody. Stays in the browser.
- **Maximum size**: 50 records (FIFO — oldest record removed when limit is reached).

### sessionStorage — `cineswipe_cache_page=*`

| Field | Type | Purpose |
|---|---|---|
| TMDB API response | JSON object | Cache movie list for the current session |
| `timestamp` | number | TTL calculation (5-minute expiry) |

- **Retention**: Until the browser tab is closed.
- **Sensitivity**: None — public movie data from TMDB.
- **Shared with**: Nobody.

### What we do NOT collect

- No cookies (first-party or third-party)
- No analytics or tracking scripts
- No user accounts or authentication
- No email addresses, names, or any PII
- No IP addresses logged by CineSwipe (Vercel may log them per their [Privacy Policy](https://vercel.com/legal/privacy-policy))

---

## API Key Policy

### Key type and permissions

CineSwipe uses a **TMDB Read Access Token** (v4 Bearer JWT).

- Scope: `api_read` — read-only access to public TMDB data
- No write permissions; no access to user accounts or private data
- Financial risk if compromised: **none** (TMDB free tier, no billing)
- Main risk: rate limit exhaustion if the key is abused by a third party

### Inherent exposure

Because CineSwipe is a client-side SPA, the Bearer token is embedded
in the JavaScript bundle at build time (`import.meta.env.VITE_*` →
static string replacement by Vite). **Anyone who downloads the page
can extract the token.** This is a known limitation of browser-only
applications with no backend proxy.

Mitigations in place:

- TMDB domain allowlist configured to `cineswipe.vercel.app`
- Token scope is read-only; no destructive action is possible
- TMDB usage dashboard monitored for anomalous request volume

### Rotation schedule

| Trigger | Action |
|---|---|
| **Every 6 months** (routine) | Rotate token in TMDB dashboard + update Vercel secret |
| **Immediately** if compromised | See emergency procedure below |
| **Immediately** on team member departure | Rotate all secrets |
| **Immediately** if accidentally committed to git | See emergency procedure below |

### Rotation procedure (routine)

1. Log in to [TMDB Settings → API](https://www.themoviedb.org/settings/api)
2. Generate a new Read Access Token
3. In Vercel Dashboard → Project Settings → Environment Variables:
   - Update `VITE_TMDB_KEY` with the new token
   - Apply to Production environment
4. Trigger a new deployment (push a commit or use "Redeploy" in Vercel)
5. Verify the app loads movie data on the live URL
6. Revoke the old token in TMDB dashboard
7. Update this document's "Last rotated" date below

**Last rotated**: *(update this date after each rotation)*

### Emergency procedure — compromised or accidentally committed key

```bash
# Step 1: Revoke the key immediately in TMDB dashboard (< 2 minutes)
# Step 2: If committed to git, purge from history
git filter-repo --path .env --invert-paths
# or use BFG Repo Cleaner: https://rtyley.github.io/bfg-repo-cleaner/

# Step 3: Force-push to invalidate GitHub's cached blobs
git push origin --force --all

# Step 4: Notify GitHub support to clear cached views of the commit
# https://support.github.com/

# Step 5: Issue a new key and update Vercel secrets
# Step 6: Redeploy
```

> **Note**: If a key was committed, assume it is compromised even if the
> commit was pushed to a private branch. Rotate immediately.

---

## Deploy Checklist

Run this checklist before every deploy to production.
Target: **under 5 minutes**.

### Pre-deploy (local)

- [ ] `npm run lint` passes with 0 warnings
- [ ] `npm test` passes — all Vitest tests green
- [ ] `npm audit --audit-level=high` returns no HIGH or CRITICAL findings
- [ ] No `.env` file staged: `git status` shows `.env` as untracked/ignored
- [ ] `VITE_TMDB_KEY` is set in Vercel Dashboard → Environment Variables (not hardcoded in any source file)
- [ ] No `console.log` statements containing sensitive data committed
      ```bash
      git diff main --name-only | xargs grep -l "console.log.*key\|console.log.*token\|console.log.*secret" 2>/dev/null
      ```

### Build verification

- [ ] `npm run build` completes without TypeScript errors
- [ ] `dist/` directory is generated
- [ ] Spot-check the built bundle does not contain the literal string `eyJ` at an unexpected location:
      ```bash
      grep -r "eyJ" dist/assets/ | grep -v ".map" | head -5
      # The token will appear as the value of Authorization: Bearer — that is expected.
      # Alert if it appears in HTML, in a console.log, or in a non-auth context.
      ```

### Post-deploy (Vercel)

- [ ] Vercel build log shows exit code 0
- [ ] Live URL loads the app and movie posters render correctly
- [ ] Open DevTools → Network → filter by `themoviedb.org` — confirm requests return 200 (not 401 or 429)
- [ ] Open DevTools → Application → Local Storage: confirm only `cineswipe_history_v1` key exists
- [ ] Open DevTools → Application → Session Storage: confirm only `cineswipe_cache_page=*` keys exist
- [ ] Check response headers in DevTools → Network → select `index.html`:
  - [ ] `Content-Security-Policy` header present
  - [ ] `X-Frame-Options: DENY` present
  - [ ] `X-Content-Type-Options: nosniff` present
  - [ ] `Strict-Transport-Security` present

### After a dependency update

- [ ] Re-run the full checklist above
- [ ] Check [TMDB API changelog](https://developer.themoviedb.org/changelog) for breaking changes if `fetch` logic was modified

---

## Known Accepted Risks

The following items were identified in the security audit but are accepted
as low risk given the current architecture and data sensitivity:

| Risk | Reason accepted | Revisit when |
|---|---|---|
| Bearer token visible in JS bundle | Read-only scope; domain allowlist in place; no backend alternative without significant architecture change | Backend proxy is added |
| `esbuild` dev-server vulnerability (GHSA-67mh-4wv8-2f99) | Only exploitable on local dev server, not in production | Vite 8 migration is planned |
| `unsafe-inline` in `style-src` CSP | Tailwind JIT may generate inline styles; removing it requires build audit | Next CSP hardening pass |

---

## References

- [OWASP Top 10 for SPAs](https://owasp.org/www-project-top-ten/)
- [TMDB API Rate Limits](https://developer.themoviedb.org/docs/rate-limiting)
- [Vercel Security Headers docs](https://vercel.com/docs/edge-network/headers)
- [GitHub Private Vulnerability Reporting](https://docs.github.com/en/code-security/security-advisories)
- [Have I Been Pwned — check for leaked credentials](https://haveibeenpwned.com/)
