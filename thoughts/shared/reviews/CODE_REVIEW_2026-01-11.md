# Code Review: menu.pictures

**Date:** 2026-01-11
**Reviewers:** critic, plan-reviewer (architecture), plan-reviewer (change impact), review-agent (synthesis)
**Scope:** Recent commits (security hardening + deployment workflow changes)

---

## Final Verdict: APPROVE

The codebase is production-ready with no blocking issues. All major issues identified are improvements rather than bugs.

---

## Issue Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | - |
| Major | 3 | Non-blocking |
| Minor | 8 | Suggestions |

---

## High Priority Issues (Fix Soon)

### 1. Uncaught JSON.parse in ShareButton

**Location:** `client/src/components/ShareButton.tsx:44`
**Severity:** Major
**Category:** Error Handling

**Problem:** `JSON.parse()` can throw if localStorage contains corrupted data, but this isn't wrapped in a try-catch. `SavedMenus.tsx` handles this correctly (lines 9-18), but `ShareButton.tsx` does not.

**Current Code:**
```typescript
const savedMenus = JSON.parse(localStorage.getItem('savedMenus') || '[]');
```

**Fix:**
```typescript
let savedMenus = [];
try {
  savedMenus = JSON.parse(localStorage.getItem('savedMenus') || '[]');
} catch (err) {
  console.error('Failed to parse saved menus:', err);
  localStorage.removeItem('savedMenus');
}
```

---

### 2. Hardcoded UUID Length Validation

**Location:** `server/src/routes/share.ts:79`
**Severity:** Major
**Category:** Validation

**Problem:** Uses `id.length !== 36` which is fragile and could break if UUID format changes.

**Current Code:**
```typescript
if (!id || id.length !== 36) {
  res.status(400).json({ error: 'Invalid share ID' });
  return;
}
```

**Fix:**
```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!id || !UUID_REGEX.test(id)) {
  res.status(400).json({ error: 'Invalid share ID' });
  return;
}
```

---

## Medium Priority Issues

### 3. SQL Datetime Mixing

**Location:** `server/src/routes/share.ts:87-89`
**Severity:** Major
**Category:** Testability

**Problem:** Mixing SQL `datetime('now')` with parameterized queries makes testing harder.

**Current:**
```typescript
const row = db.prepare(
  "SELECT dishes, created_at, expires_at FROM shared_menus WHERE id = ? AND expires_at > datetime('now')"
).get(id);
```

**Suggested:**
```typescript
const row = db.prepare(
  `SELECT dishes, created_at, expires_at FROM shared_menus WHERE id = ? AND expires_at > ?`
).get(id, new Date().toISOString());
```

---

### 4. No Deployment Health Check

**Location:** `.github/workflows/deploy.yml`
**Severity:** Medium
**Category:** DevOps

**Problem:** Deployment doesn't verify the app started successfully after PM2 restart.

**Suggested Addition:**
```yaml
- name: Verify deployment
  run: |
    sleep 5
    curl -f https://menu.pictures/api/health || exit 1
```

---

### 5. No Deployment Rollback

**Location:** `.github/workflows/deploy.yml`
**Severity:** Medium
**Category:** DevOps

**Problem:** `git reset --hard` is destructive. If build fails, production may be broken.

**Suggested Fix:**
```yaml
script: |
  cd /var/www/menu-pictures
  PREVIOUS_COMMIT=$(git rev-parse HEAD)
  git fetch origin main
  git reset --hard origin/main
  npm ci && npm run build && pm2 restart menu-pictures || {
    echo "Deployment failed, rolling back..."
    git reset --hard $PREVIOUS_COMMIT
    npm ci && npm run build && pm2 restart menu-pictures
    exit 1
  }
```

---

## Low Priority Suggestions

| # | Issue | Location | Suggestion |
|---|-------|----------|------------|
| 1 | Magic number | `share.ts:46` | Extract `MAX_DISHES_PER_SHARE = 100` constant |
| 2 | Code duplication | `rateLimiter.ts` | Consolidate `checkRateLimit()` and `getRateLimitStatus()` logic |
| 3 | Dead code | `pexels.ts:241-260` | Remove unused `searchMultipleDishImages()` |
| 4 | Inconsistent errors | Multiple files | Standardize error response format |
| 5 | React key collision | `CameraCapture.tsx:77` | Use stable IDs instead of base64 substring |
| 6 | Missing logging | `SharePage.tsx` | Add console.error for abort errors |
| 7 | Placeholder value | `imageCache.ts:48-56` | Remove `hitRate: 0` or implement it |
| 8 | Unused constant | `share.ts:12` | Remove or use `MAX_SHARES_PER_REQUEST` |

---

## Strengths Identified

1. **Atomic rate limiting** - SQLite transactions prevent race conditions
2. **Proper SSE tracking** - Handles client disconnection correctly
3. **Security headers** - Helmet middleware with proper CORS
4. **Client-side compression** - Reduces server load
5. **Type safety** - Consistent TypeScript usage
6. **Database optimization** - WAL mode for concurrent access
7. **Error handling** - Doesn't leak implementation details
8. **Cleanup on startup** - Expired entries auto-removed

---

## Risk Assessment

| Area | Risk | Notes |
|------|------|-------|
| Core functionality | LOW | Menu scanning works correctly |
| Rate limiting | LOW | Properly atomic after refactor |
| Security | LOW | Helmet, validation, parameterized SQL |
| Deployment | MEDIUM | No health check or rollback |
| SSE streaming | LOW | Verify after helmet addition |

---

## Verification Checklist

Before deploying:
- [ ] SSE streaming works with helmet (test `/api/scan`)
- [ ] Rate limiting functions correctly
- [ ] Share links create and resolve properly
- [ ] Image cache returns cached results

Post-deploy:
- [ ] Verify PM2 running: `pm2 status menu-pictures`
- [ ] Test menu scan end-to-end
- [ ] Check nginx logs for errors

---

## Files Reviewed

**Server:**
- `server/src/index.ts` (67 lines)
- `server/src/routes/scan.ts` (164 lines)
- `server/src/routes/share.ts` (108 lines)
- `server/src/services/imageCache.ts` (57 lines)
- `server/src/services/pexels.ts` (261 lines)
- `server/src/services/rateLimiter.ts` (120 lines)
- `server/src/services/database.ts` (90 lines)
- `server/src/services/claude.ts` (118 lines)

**Client:**
- `client/src/components/CameraCapture.tsx` (115 lines)
- `client/src/components/DishCard.tsx` (34 lines)
- `client/src/components/MenuGrid.tsx` (152 lines)
- `client/src/components/SavedMenus.tsx` (87 lines)
- `client/src/components/ShareButton.tsx` (81 lines)
- `client/src/components/SharePage.tsx` (73 lines)

**Infrastructure:**
- `.github/workflows/deploy.yml` (52 lines)
- `.github/workflows/ci.yml` (34 lines)
