"""Standalone validation for deliverables/ns-government-forms provincial pack.

Checks (stdlib + pypdf only; network optional via --online):
1. manifest.json resources expose EXACT OfficialResource fields from
   frontend/src/domain/lifecycle-types.ts (id, jurisdiction, title, url,
   kind, format, verifiedOn, verificationStatus, sourceLocation, notes)
   with constrained enum values; jurisdiction == nova_scotia for all;
   verifiedOn == 2026-10-10. files[] entries expose
   (resourceId, filename, sourceUrl, sha256, bytes, fieldCount) and join 1:1.
2. Each shipped PDF under forms/: magic %PDF, pypdf-readable, sha256/bytes
   match manifest, AcroForm field count matches manifest.
3. frontend/public/official-forms/provincial/*.pdf copies are byte-identical.
4. No forbidden edits: manifest ids must not collide with existing catalog ids
   in frontend/src/domain/resources.ts (lead integrates separately).
5. --online: each resource URL resolves (HTTP 200 after redirects). Offline
   default skips network (CI-safe).

Usage:
  python3 deliverables/ns-government-forms/tests/validate_provincial_pack.py [--online]
"""
import hashlib
import json
import os
import re
import sys
import urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(BASE, "manifest.json")
FORMS = os.path.join(BASE, "forms")
PROVINCIAL_PUBLIC = os.path.join(
    BASE, "..", "..", "frontend", "public", "official-forms", "provincial")
RESOURCES_TS = os.path.join(
    BASE, "..", "..", "frontend", "src", "domain", "resources.ts")

JURISDICTIONS = {"hrm", "cbrm", "truro", "kentville", "bridgewater",
                 "other_ns", "nova_scotia"}
KINDS = {"application_form", "requirements", "guidance", "portal",
         "renewal_guidance"}
FORMATS = {"pdf", "web"}
STATUSES = {"verified", "needs_review"}
FIELDS = {"id", "jurisdiction", "title", "url", "kind", "format",
          "verifiedOn", "verificationStatus", "sourceLocation", "notes"}
FILE_FIELDS = {"resourceId", "filename", "sourceUrl", "sha256", "bytes",
               "fieldCount"}

failures = []


def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        failures.append(msg)


def main():
    online = "--online" in sys.argv
    with open(MANIFEST, encoding="utf-8") as f:
        manifest = json.load(f)
    resources = manifest["resources"]
    files = manifest["files"]
    check(isinstance(resources, list) and len(resources) >= 4,
          f"resources list has {len(resources)} entries (>=4)")
    ids = set()
    for r in resources:
        ok = (isinstance(r, dict) and set(r.keys()) == FIELDS
              and all(isinstance(r[k], str) and r[k] for k in FIELDS)
              and r["jurisdiction"] == "nova_scotia"
              and r["kind"] in KINDS and r["format"] in FORMATS
              and r["verificationStatus"] in STATUSES
              and re.fullmatch(r"\d{4}-\d{2}-\d{2}", r["verifiedOn"])
              and r["verifiedOn"] == "2026-10-10"
              and r["url"].startswith("https://"))
        check(ok, f"schema ok: {r.get('id')}")
        check(r["id"] not in ids, f"id unique: {r.get('id')}")
        ids.add(r["id"])
    fids = set()
    for fe in files:
        ok = (isinstance(fe, dict) and set(fe.keys()) == FILE_FIELDS
              and isinstance(fe["bytes"], int) and fe["bytes"] > 0
              and isinstance(fe["fieldCount"], int) and fe["fieldCount"] >= 0
              and re.fullmatch(r"[0-9a-f]{64}", fe["sha256"]))
        check(ok, f"file entry ok: {fe.get('filename')}")
        fids.add(fe["resourceId"])
    check(fids == ids, "files[] joins 1:1 with resources[]")
    for fe in files:
        path = os.path.join(FORMS, fe["filename"])
        check(os.path.isfile(path), f"shipped: {fe['filename']}")
        if not os.path.isfile(path):
            continue
        with open(path, "rb") as f:
            raw = f.read()
        check(raw[:5] == b"%PDF-", f"PDF magic: {fe['filename']}")
        check(hashlib.sha256(raw).hexdigest() == fe["sha256"],
              f"sha256 match: {fe['filename']}")
        check(len(raw) == fe["bytes"], f"bytes match: {fe['filename']}")
        try:
            from pypdf import PdfReader
            reader = PdfReader(path)
            got = reader.get_fields()
            n = len(got) if got else 0
            check(len(reader.pages) >= 1, f"pages>=1: {fe['filename']}")
            check(n == fe["fieldCount"],
                  f"fieldCount {n}==manifest: {fe['filename']}")
        except Exception as e:  # noqa: BLE001
            check(False, f"pypdf readable {fe['filename']}: {e}")
        pub = os.path.join(PROVINCIAL_PUBLIC, fe["filename"])
        check(os.path.isfile(pub), f"public copy: {fe['filename']}")
        if os.path.isfile(pub):
            with open(pub, "rb") as f:
                check(hashlib.sha256(f.read()).hexdigest() == fe["sha256"],
                      f"public byte-identical: {fe['filename']}")
    if os.path.isfile(RESOURCES_TS) and "--integrated" not in sys.argv:
        ts = open(RESOURCES_TS, encoding="utf-8", errors="replace").read()
        for i in ids:
            check(f"'{i}'" not in ts and f'"{i}"' not in ts,
                  f"no collision/integration in resources.ts yet: {i}")
    if "--integrated" in sys.argv:
        print("INFO integrated catalog metadata/URL joins verified by Bun provincial-catalog tests; pre-integration ownership guard no longer applies")
    if online:
        for r in resources:
            try:
                req = urllib.request.Request(
                    r["url"], headers={"User-Agent": "PermitPath-verify/1.0"})
                with urllib.request.urlopen(req, timeout=60) as resp:
                    check(resp.status == 200,
                          f"online 200: {r['id']} -> {resp.url[:80]}")
            except Exception as e:  # noqa: BLE001
                check(False, f"online fetch {r['id']}: {e}")
    print("---")
    if failures:
        print(f"{len(failures)} FAILURES")
        sys.exit(1)
    print("ALL CHECKS PASSED")


if __name__ == "__main__":
    main()
