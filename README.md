# JobsDoctor

Plain HTML, CSS and JavaScript frontend in `public/`, served by a dependency-free Cloudflare Worker in `worker/index.js`. Site identity and private access are preserved in `.openai/hosting.json`.

## Build and preview

Use Node 18+ (Node 24 is available in the current desktop runtime).

- `node scripts/build.mjs` embeds frontend assets into `dist/server/index.js`.
- `node scripts/validate-artifact.mjs` validates the deployable Worker module.
- `node scripts/preview.mjs` serves the built Worker at http://127.0.0.1:4173.
- `node --test tests/feeds.test.mjs` tests normalization, unsafe links, expired records, caching, deduplication, outages and guide structure.

No npm dependencies are required. Edit files in `public/` or `worker/`; `dist/` is generated output.

## Connected feeds

- Jobicy public Healthcare & Medical API, with Jobicy attribution and original listing URLs.
- Charlie Health public employer board through Greenhouse; filtered to clinical and patient-care titles. No partnership or employer-verification claim is made.

Feeds refresh on demand after one hour, with per-instance memory cache and in-flight deduplication. An open page checks hourly. This is not a scheduled unattended import. Source failures may use an explicitly marked snapshot fetched less than 24 hours ago; older snapshots are not returned. Closing/deleting a source vacancy is reflected on the next successful feed refresh. Applicants must confirm availability at the original source.

Coverage is limited to connected sources, including US, Australia, New Zealand, international medical projects and remote roles. Remote does not imply worldwide eligibility. No universal scraper or complete worldwide coverage is claimed. Additional boards need suitable authorized access; no paid API is enabled.

- Iqarus, Epworth and Abano Healthcare public SmartRecruiters boards; public postings only, paginated up to 500 records per employer. Original source links and attribution are retained.

Each source has a 20-second response deadline; the browser has a 25-second deadline. Edge Cache API calls were removed because a hosted cache operation can hang. Memory snapshots do not survive isolate restarts, so outages after a restart show an explicit unavailable state rather than invented listings.

## Licensing guides

`public/country-guides.js` contains editorial summaries for 12 countries, with separate doctor and nursing information, other-profession guidance, review dates and official regulatory links. These are manually reviewed summaries, not an automated regulatory feed. Verify individual eligibility and current requirements with the regulator before paying for examinations. Registration, immigration/work permission and job selection are separate processes.

## Existing local features

Saved jobs and draft profiles/preferences remain browser-local. No secure account, employer publishing, application submission or email delivery is implemented. External applications remain on the source board. Imported content is escaped before rendering; source URLs are restricted to expected HTTPS hosts.
