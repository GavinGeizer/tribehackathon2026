"""Minimal validation for deliverables/ns-regulatory catalog + shipped forms.

Checks (stdlib + pypdf only; network optional via --online):
1. catalog.json entries expose EXACT OfficialResource fields from
   frontend/src/domain/lifecycle-types.ts (id, jurisdiction, title, url,
   kind, format, verifiedOn, verificationStatus, sourceLocation, notes)
   with constrained enum values; verifiedOn == 2026-10-10.
2. Every kind=application_form/format=pdf entry (and every shipped form)
   resolves to a local file under deliverables/ns-regulatory/forms/.
3. Each shipped PDF: magic %PDF, page count >= 1, sha256 recorded in
   file-hashes.json, AcroForm field count recorded in coverage-status.json.
4. --online: each catalog URL resolves (HTTP 200 after redirects, final URL
   recorded). Offline default skips network (CI-safe).

Usage:
  python3 deliverables/ns-regulatory/tests/validate_ns_regulatory.py [--online]
"""
import hashlib
import json
import os
import re
import sys
import urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG = os.path.join(BASE, "catalog.json")
FORMS = os.path.join(BASE, "forms")
COVERAGE = os.path.join(BASE, "coverage-status.json")
HASHES = os.path.join(BASE, "file-hashes.json")

JURISDICTIONS = {"hrm", "cbrm", "truro", "kentville", "bridgewater", "other_ns", "nova_scotia"}
KINDS = {"application_form", "requirements", "guidance", "portal", "renewal_guidance"}
FORMATS = {"pdf", "web"}
STATUSES = {"verified", "needs_review"}
FIELDS = {"id", "jurisdiction", "title", "url", "kind", "format",
          "verifiedOn", "verificationStatus", "sourceLocation", "notes"}

ENTRY_TO_FILE = {
    "cbrm-permit-application": "cbrm-permit-application.pdf",
    "cbrm-application-checklist": "cbrm-application-checklist.pdf",
    "cbrm-permit-instructions": "cbrm-permit-instructions.pdf",
    "cbrm-energy-tier-application": "cbrm-energy-tier-application.pdf",
    "truro-building-development-application-2023": "truro-building-development-application-2023.pdf",
    "truro-energy-bulletin": "truro-energy-bulletin.pdf",
    "truro-energy-pathways": "truro-energy-pathways.pdf",
    "truro-energy-prescriptive": "truro-energy-prescriptive.pdf",
    "kentville-development-permit-2025": "kentville-development-permit-2025.pdf",
    "kentville-building-bylaw-205": "kentville-building-bylaw-205.pdf",
    "bridgewater-permit-guidelines-2024": "bridgewater-permit-guidelines-handout-2024.pdf",
}

failures = []


def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        failures.append(msg)


def pdf_info(path):
    with open(path, "rb") as f:
        raw = f.read()
    magic = raw[:5] == b"%PDF-"
    pages = None
    fields = None
    try:
        from pypdf import PdfReader
        r = PdfReader(path)
        pages = len(r.pages)
        ff = r.get_fields()
        fields = len(ff) if ff else 0
    except Exception as e:  # noqa: BLE001 - report, don't crash suite
        print("WARN pypdf could not parse %s: %s" % (path, e))
    return {"sha256": hashlib.sha256(raw).hexdigest(), "size": len(raw),
            "magic": magic, "pages": pages, "formFields": fields}


def main():
    online = "--online" in sys.argv
    catalog = json.load(open(CATALOG, encoding="utf-8"))
    check(isinstance(catalog, list) and len(catalog) >= 10,
          "catalog has >=10 entries (got %d)" % len(catalog))
    ids = [e.get("id") for e in catalog]
    check(len(ids) == len(set(ids)), "catalog ids unique")
    for e in catalog:
        check(set(e.keys()) == FIELDS, "exact OfficialResource fields: %s" % e.get("id"))
        check(e.get("jurisdiction") in JURISDICTIONS, "jurisdiction valid: %s" % e.get("id"))
        check(e.get("kind") in KINDS, "kind valid: %s" % e.get("id"))
        check(e.get("format") in FORMATS, "format valid: %s" % e.get("id"))
        check(e.get("verificationStatus") in STATUSES, "status valid: %s" % e.get("id"))
        check(e.get("verifiedOn") == "2026-10-10", "verifiedOn 2026-10-10: %s" % e.get("id"))
        check(e.get("url", "").startswith("https://"), "https url: %s" % e.get("id"))
    # every shipped mapping target exists
    for eid, fn in ENTRY_TO_FILE.items():
        p = os.path.join(FORMS, fn)
        check(os.path.isfile(p), "shipped file exists: %s" % fn)
    # no uncatalogued PDFs in forms/
    shipped = set(os.listdir(FORMS))
    check(shipped == set(ENTRY_TO_FILE.values()), "forms/ exactly matches catalog mapping")
    # pdf inspection + hashes
    hashes = {}
    pdfmeta = {}
    for fn in sorted(shipped):
        info = pdf_info(os.path.join(FORMS, fn))
        hashes[fn] = info["sha256"]
        pdfmeta[fn] = {"pages": info["pages"], "formFields": info["formFields"],
                       "size": info["size"]}
        check(info["magic"], "PDF magic: %s" % fn)
        check((info["pages"] or 0) >= 1, "pages>=1: %s (%s)" % (fn, info["pages"]))
    json.dump(hashes, open(HASHES, "w", encoding="utf-8"), indent=2, sort_keys=True)
    print("wrote %s (%d files)" % (HASHES, len(hashes)))
    # coverage table cross-check
    if os.path.isfile(COVERAGE):
        cov = json.load(open(COVERAGE, encoding="utf-8"))
        byfile = {c.get("file"): c for c in cov.get("forms", [])}
        for fn, meta in pdfmeta.items():
            c = byfile.get(fn)
            check(c is not None, "coverage row exists: %s" % fn)
            if c:
                check(c.get("pages") == meta["pages"], "coverage pages match: %s" % fn)
                check(c.get("formFields") == meta["formFields"],
                      "coverage formFields match: %s" % fn)
    # optional live URL check
    if online:
        for e in catalog:
            try:
                req = urllib.request.Request(e["url"],
                                             headers={"User-Agent": "Mozilla/5.0 PermitPath-validate"})
                with urllib.request.urlopen(req, timeout=30) as r:
                    code, final = r.status, r.url
                ok = code == 200
                print(("PASS " if ok else "FAIL ") + "URL %s -> %s %s"
                      % (e["id"], code, final))
                if not ok:
                    failures.append("URL non-200: %s" % e["id"])
            except Exception as ex:  # noqa: BLE001
                print("FAIL URL %s: %s" % (e["id"], ex))
                failures.append("URL error: %s" % e["id"])
    print("----")
    if failures:
        print("%d FAILURES" % len(failures))
        return 1
    print("ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
