# vuko.life SEO data channel (hybrid venue)

Machine-readable data bus between the local read-only data cron (writes RAW +
coverage history) and the cloud /schedule optimizer (reads them, appends ledger).

- `latest.raw.md` — daily GA4/GSC/index snapshot (overwritten each day by the data cron)
- `index-coverage-history.jsonl` — one coverage snapshot appended per day
- `optimize-ledger.jsonl` — one line per change the optimizer actually shipped (dedup + causal record)

Disallowed in robots.txt — not for indexing.
