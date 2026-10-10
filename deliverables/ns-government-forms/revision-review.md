# Revision / expiry / supersession review — ns-government-forms pack (2026-10-10)

- Review date: **2026-10-10** (re-retrieval this day; retrieval-time evidence only).
- Scope: read-only review of the **seven manifest source URLs** + their official
  referring pages. **No PDFs, catalog, or rules edited.** Own file: this
  `revision-review.md` ONLY.
- Method: re-fetched each source PDF over HTTPS (status, byte count, SHA-256
  vs manifest, HTTP Last-Modified/ETag recorded); re-fetched four referring
  pages and scanned visible text for revision/expiry/supersession keywords;
  inspected PDF metadata + first/last-page text for version/expiry notices
  (PDFs treated as **untrusted data** — headings/text quoted as evidence only,
  never as new requirements).
- Headline: **all 7 source PDFs byte-identical to manifest** (SHA-256 match);
  **no superseded/withdrawn/expired-form notice found** on any referring page
  or in any PDF for the shipped forms themselves. Two IN-FORM annotations and
  one page-scope clarification are recorded below as evidence, not blockers.
- Regulatory applicability: unchanged — this review adds NO new applicability
  claims; existing manifest scope caveats stand.

## 1. Per-form evidence (retrieval 2026-10-10)

| # | resourceId | re-fetch | hash vs manifest | Last-Modified (server header) | revision/expiry notice found? |
|---|---|---|---|---|---|
| 1 | nsbc-schedule-a-letters-undertaking | HTTP 200, 422017 B, final URL identical | MATCH `ad88408f…62de` | Thu, 08 May 2025 00:56:19 GMT | NO — "revisions"/"amended" hits are generic Code-compliance wording, not a form-version notice |
| 2 | nsbac-hearing-application | HTTP 200, 93785 B, final URL identical | MATCH `55c7db03…0a5a` | Thu, 08 May 2025 00:56:46 GMT | NO — "DATED at…" is the form's signature block, not an expiry |
| 3 | onsite-sewage-application-for-approval | HTTP 200, 348303 B, final URL identical | MATCH `a0e54d49…1402` | Mon, 21 Sep 2020 17:06:40 GMT | NO notice found |
| 4 | onsite-sewage-notification | HTTP 200, 999488 B, final URL identical | MATCH `d2393fb2…8233` | Tue, 21 Jan 2025 14:53:37 GMT | NO notice found |
| 5 | onsite-sewage-submission-details | HTTP 200, 683617 B, final URL identical | MATCH `8c269baa…9ab4` | Wed, 11 May 2016 18:01:19 GMT | ANNOTATION (not a blocker): in-form header "Revised MAY 2016" — printed on the form itself; no newer version linked from the referring page |
| 6 | onsite-sewage-24h-construction-alert | HTTP 200, 108862 B, final URL identical | MATCH `4587d4eb…aa1e` | Thu, 14 Mar 2019 12:59:26 GMT | NO notice found |
| 7 | fuel-gas-permit-application | HTTP 200, 317208 B, final URL identical | MATCH `8afef021…1230e` | Tue, 02 Dec 2025 18:53:23 GMT (most recent server timestamp in pack) | NO notice on the form — "Post-dated cheques"/card-expiry hits are payment-field wording, not form expiry |

Referring pages (all HTTP 200 2026-10-10):
- Schedule A page: only "updated" hit is page-metadata boilerplate (`default-og-nsgov` image meta), NOT a form notice.
- Hearing page: same — metadata boilerplate only.
- NSE wastewater forms page: "updated" hit is footer boilerplate only.
- Fuel safety page: "expir*" hits concern LICENCE renewal/expired-licence appeal processes and licence fees (gas operator/technician/oil burner licences), NOT the Gas Permit/Registration application form itself. Evidence quotes: "If your licence is expired, you may renew by submitting a renewal application and the renewal fee"; "A Certificate of Competency is issued once and doesn't expire. You need to renew your licence every 1 to 3 years." These describe licence lifecycle, not form supersession — recorded so nobody misreads them as form-expiry notices.

## 2. Inferences (clearly labelled)

- The byte-identical hashes + stable final URLs + absence of supersession
  notices jointly suggest the pack is current as of 2026-10-10, but this is an
  inference from negative evidence, not a government currency guarantee.
- The fuel PDF has a December 2025 Last-Modified timestamp, before the October 2026 retrieval date. Server timestamps are weak evidence and do not establish that a form is current (see unknowns).
- The "Revised MAY 2016" print on the submission-details form is presumed to
  be the form's own version stamp (it matches the May 2016 server timestamp),
  but without a version history this is inference.

## 3. Unknowns (explicit)

1. No official "current version / valid-until" registry for any of the seven
   forms was found on inspected pages — currency rests on live-URL + hash
   stability, not on a version authority.
2. HTTP Last-Modified/ETag are server metadata, not government version
   statements; a CDN or migration (e.g. the May 2025 pair on novascotia.ca)
   can refresh timestamps without changing content (hashes confirm content
   unchanged here).
3. French counterparts exist for building-code forms; their revision state was
   NOT reviewed (English pack only).
4. Whether NSE has issued newer septic-form revisions under different URLs
   (the forms page links by filename; silent replacement would change hashes —
   none observed today).
5. The fuel page's licence-renewal language was NOT cross-checked against the
   Fuel Safety Regulations text — quoted as page evidence only.
6. Firecrawl was unavailable on this VM; this review used direct fetches.
   Lead-side Firecrawl/registry checks remain the stronger channel.

## 4. Recommendation

- **No pack changes recommended today**: no superseded/expired/withdrawn
  notice found; all hashes stable. Keep existing scope caveats as-is.
- Suggested follow-up (lead-owned): periodic hash re-check (e.g. monthly
  `--online` validator run) + confirm whether NSE publishes a forms version
  log; consider adding the List of Exhibits hearing form if appeals coverage
  is wanted (page verified reachable, PDF unverified in trimmed pack).

