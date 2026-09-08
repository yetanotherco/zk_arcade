# ZK Arcade — campaign finished page

Static page served at the ZK Arcade domain now that the campaign is over. No
build step, no dependencies: `index.html` is self-contained (inline CSS, Space
Mono from Google Fonts).

The Phoenix app in [`../web`](../web) is kept in the repo for reference but is
no longer deployed.

## Cloudflare Pages settings

Connect this repository in the Cloudflare dashboard (Workers & Pages → Create →
Pages → Connect to Git) with:

| Setting                | Value    |
| ---------------------- | -------- |
| Production branch      | `main`   |
| Framework preset       | None     |
| Build command          | *(empty)* |
| Build output directory | `site`   |
| Root directory         | `/`      |

Then point the `zkarcade.com` custom domain at the Pages project.

## Files

- `index.html` — the page.
- `_redirects` — rewrites every path to `index.html` (200), so old deep links
  such as `/leaderboard` show the notice rather than a 404.
- `_headers` — basic security headers and icon caching.
- `favicon.png` / `favicon.ico` / `og-image.png` — icons, downscaled from the
  app's original 1200×1200 icon.
- `robots.txt`

## Local preview

```bash
python3 -m http.server 8000 --directory site
# then open http://localhost:8000
```

Note that `_redirects` and `_headers` are Cloudflare-only; `http.server` ignores
them.
