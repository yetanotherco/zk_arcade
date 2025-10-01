// Minimal client-side cookie store for Node `fetch` (undici). We need this because browsers automatically
// handle Set-Cookie/Cookie, but Node's `fetch` does not. This jar captures `Set-Cookie` headers from
// responses and builds a `Cookie` header for subsequent requests.
// It keeps the latest `name=value` pair for each cookie name, ignoring attributes like `Path`, `HttpOnly`, etc.
export class CookieJar {
    constructor() {
        this.map = new Map();
    }

    // Absorbs one or many `Set-Cookie` header values into the jar. Accepts either a string or an array of strings.
    // If the cookie value is an empty string, the cookie is removed from the jar.
    absorb(setCookieHeaders) {
        if (!setCookieHeaders) return;

        // Normalize to an array of individual Set-Cookie strings.
        const arr = Array.isArray(setCookieHeaders)
            ? setCookieHeaders
            : splitSetCookieFallback(setCookieHeaders);

        for (const sc of arr) {
            // Keep only "name=value" (first segment before any attributes).
            const pair = sc.split(';', 1)[0];

            // Split on the FIRST '=' only (values can contain '=').
            const eq = pair.indexOf('=');
            if (eq <= 0) continue;

            const name = pair.slice(0, eq).trim();
            const value = pair.slice(eq + 1).trim();
            if (!name) continue;

            // Empty value acts as "delete cookie".
            if (value === '') this.map.delete(name);
            else this.map.set(name, value);
        }
    }

    // Builds the Cookie header value for outgoing requests.
    toHeader() {
        return Array.from(this.map.entries())
            .map(([k, v]) => `${k}=${v}`)
            .join('; ');
    }
}

// Splits a possibly folded `Set-Cookie` header string into individual cookie lines.
// We use a regex to account for various edge cases, like commas in Expires attributes or quoted strings.
function splitSetCookieFallback(raw) {
    return raw ? raw.split(/,(?=[^;,]+=[^;,]+)/g) : [];
}

// Extracts all Set-Cookie headers from a Response object.
export function getSetCookies(res) {
    // Preferred path (undici provides this helper)
    const getSet = res?.headers?.getSetCookie?.();
    if (Array.isArray(getSet)) return getSet;

    // Fallback: single raw header string, may contain multiple cookies
    const raw = res.headers.get('set-cookie');
    return splitSetCookieFallback(raw ?? '');
}
