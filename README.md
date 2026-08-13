# Arbibots Community Hub

An unofficial, community-run website for **Arbibots** — the first fully
on-chain generative NFT collection on Arbitrum, launched September 2021
(2,000 supply, now CC0). This is a fan site, not the official project —
see the disclaimer in the footer and the links to the real
`arbibots.xyz`, X/Twitter, and marketplace pages.

It's a static site (plain HTML/CSS/JS, no build step), so any community
member can fork it, edit it, and open a PR.

## Structure

```
index.html          Main page (hero, about, tracker, ecosystem, DAO, community, footer)
css/style.css        All styling
js/main.js            Nav toggle + live sales tracker logic
data/last-sale.json   Manual fallback sale record used when the live API is unreachable
```

## Design

Colors are based on Arbitrum's own documented ecosystem brand blues
(`#28A0F0`, `#213147`, `#96BEDC`) since the exact Arbibots brand palette
couldn't be pulled from the live site in the environment this was built
in (network access to `arbibots.xyz` / OpenSea was blocked). If you have
the collection's real brand colors or logo assets, swap the CSS custom
properties at the top of `css/style.css` (`:root { --blue: ...; --navy:
...; }`) and drop a logo into the header markup in `index.html`.

## Live sales tracker

`js/main.js` calls the [Reservoir](https://reservoir.tools) aggregated
marketplace API for the Arbibots contract on Arbitrum:

```
0xc1fcf330b4b4c773fa7e6835f681e8f798e9ebff
```

```
GET https://api-arbitrum.reservoir.tools/sales/v5?collection=<contract>&limit=1&sortBy=time
```

It ships pointed at Reservoir's shared `demo-api-key`, which is fine for
trying the site locally but is **heavily rate-limited** and not suitable
for production. To go live:

1. Get a free API key at <https://reservoir.tools>.
2. Set it before `main.js` loads, e.g. add this in `index.html` just
   above the `<script src="js/main.js">` tag:
   ```html
   <script>window.ARBIBOTS_RESERVOIR_KEY = "YOUR_KEY_HERE";</script>
   ```

If the live call fails for any reason (rate limit, offline, no key), the
tracker falls back to `data/last-sale.json`. That file ships with every
field set to `null` on purpose — the UI shows an honest "no data yet /
live feed unreachable" state rather than ever inventing a sale. Update
that file by hand after a real sale (or wire up a small scheduled script
that calls the same Reservoir endpoint server-side and writes the JSON)
if you want a reliable fallback for visitors on the demo key's rate
limit.

## Running locally

No build step — just serve the folder statically, e.g.:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploying

Works as-is on GitHub Pages, Netlify, Vercel, or any static host — push
the repo and point the host at the root.
