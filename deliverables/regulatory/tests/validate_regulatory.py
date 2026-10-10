"""Independent validation for deliverables/regulatory (stdlib only).

Checks:
  1. rules.json schema conformance (keys, enums, finite fields/operators, snake_case evidence).
  2. naming.json exactness (30 entries + spot-checks against PDF text).
  3. PDFs present and non-empty.
  4. Demo scenario evaluation (450m2, 2 storeys, ext-walls Yes):
       construction_plan_small=required, elevations=required,
       a10 required-large must NOT fire, a10 optional-small must fire,
       all large-project required rules must NOT fire, A11 later_stage present.
Run from repo root:  python3 deliverables/regulatory/tests/validate_regulatory.py
"""
import json
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
REG = os.path.dirname(BASE)
REPO = os.path.dirname(os.path.dirname(REG)) if os.path.basename(REG) == "regulatory" else None
# Layout: deliverables/regulatory/{rules.json,naming.json,pdfs/,tests/}
REG_DIR = os.path.join("deliverables", "regulatory")

FIELDS = {"proposedArea", "storeys", "externalWalls", "onHrmRoad", "rightOfWayWork"}
OPS = {"eq", "gt", "lte"}
REQUIRED_KEYS = {"id", "title", "description", "jurisdiction", "permitType", "applicability",
                 "evidenceTypes", "classification", "sourceUrl", "sourceSection",
                 "lastVerified", "verificationStatus", "exceptions", "humanReviewNotes"}

failures = []


def check(cond, msg):
    if not cond:
        failures.append(msg)


def match(pred, inputs):
    f, op, v = pred["field"], pred["operator"], pred["value"]
    if f not in inputs or inputs[f] is None:
        return None  # unknown preserved
    a = inputs[f]
    if op == "eq":
        return a == v
    if op == "gt":
        return a > v
    if op == "lte":
        return a <= v
    raise AssertionError(op)


def fires(rule, inputs):
    app = rule["applicability"]
    if not app:
        return None  # conditional on unmodeled fields -> unknown
    results = []
    for grp in ("all", "any"):
        for p in app.get(grp, []):
            results.append((grp, match(p, inputs)))
    alls = [r for g, r in results if g == "all"]
    anys = [r for g, r in results if g == "any"]
    if alls and not all(x is True for x in alls):
        return False if any(x is False for x in alls) else None
    if anys:
        if any(x is True for x in anys):
            pass
        elif any(x is None for x in anys):
            return None
        else:
            return False
    if alls:
        return True
    return None


def main():
    rules = json.load(open(os.path.join(REG_DIR, "rules.json")))
    naming = json.load(open(os.path.join(REG_DIR, "naming.json")))

    check(isinstance(rules, list) and len(rules) == 39, f"expected 39 rules, got {len(rules)}")
    ids = [r["id"] for r in rules]
    check(len(set(ids)) == len(ids), "duplicate rule ids")
    for r in rules:
        check(set(r.keys()) == REQUIRED_KEYS, f"{r.get('id')}: keys {sorted(r.keys())}")
        check(r["jurisdiction"] == "Halifax Regional Municipality", f"{r['id']}: jurisdiction")
        check(r["permitType"] == "commercial-renovation", f"{r['id']}: permitType")
        check(r["classification"] in ("required", "optional", "later_stage"), f"{r['id']}: class")
        check(r["verificationStatus"] in ("verified", "needs_review"), f"{r['id']}: vstatus")
        check(r["lastVerified"] == "2026-10-10", f"{r['id']}: lastVerified")
        check(isinstance(r["evidenceTypes"], list) and r["evidenceTypes"], f"{r['id']}: evidenceTypes")
        for e in r["evidenceTypes"]:
            check(e == e.lower() and " " not in e and "-" not in e and e.replace("_", "").isalnum(),
                  f"{r['id']}: evidenceType not snake_case: {e!r}")
        for grp in ("all", "any"):
            for p in r["applicability"].get(grp, []):
                check(set(p) == {"field", "operator", "value"}, f"{r['id']}: pred keys {p}")
                check(p["field"] in FIELDS, f"{r['id']}: bad field {p}")
                check(p["operator"] in OPS, f"{r['id']}: bad op {p}")
        check(isinstance(r["exceptions"], list), f"{r['id']}: exceptions not list")

    by_id = {r["id"]: r for r in rules}
    # paired branches present
    for slug in ("architectural", "electrical", "fire_suppression", "mechanical",
                 "geotechnical", "plumbing", "structural"):
        check(f"prof_{slug}_required_large" in by_id, f"missing prof_{slug}_required_large")
        check(f"prof_{slug}_optional_small" in by_id, f"missing prof_{slug}_optional_small")
    check("a11_field_review_later_stage" in by_id, "missing A11 later_stage rule")
    check(by_id["a11_field_review_later_stage"]["classification"] == "later_stage", "A11 class")

    # demo scenario
    demo = {"proposedArea": 450, "storeys": 2, "externalWalls": "Yes",
            "onHrmRoad": None, "rightOfWayWork": None}
    check(fires(by_id["construction_plan_small"], demo) is True, "demo: construction plan should fire")
    check(fires(by_id["elevations_small_extwalls"], demo) is True, "demo: elevations should fire")
    check(fires(by_id["a10_energy_undertaking_required_large"], demo) is False,
          "demo: A10-required-large must NOT fire")
    check(fires(by_id["a10_energy_undertaking_optional_small"], demo) is True,
          "demo: A10-optional-small should fire")
    for rid, r in by_id.items():
        if rid.endswith("_required_large"):
            check(fires(r, demo) is False, f"demo: {rid} must NOT fire")
    check(fires(by_id["nstir_approval_conditional"], demo) is None,
          "demo: NSTIR with unknown road/ROW must be unknown")

    # naming.json
    names = naming["names"]
    check(len(names) == 30, f"expected 30 names, got {len(names)}")
    for k, v in {"Construction Plan - Building": "A-102-ConstructionPlan",
                 "Elevations - Building": "A-201-Elevations",
                 "A11 Certification of Field Review": "A11-FieldReviewCertificate",
                 "Location Certificate -Building": "LOC",
                 "NSTIR Approval - Building": "NSTIR"}.items():
        check(names.get(k) == v, f"naming mismatch {k}")

    # PDFs
    for pdf in ("commercial-renovation-required-documents-table.pdf",
                "document-naming-conventions.pdf",
                "leasehold-required-documents-b201-excerpt.pdf"):
        p = os.path.join(REG_DIR, "pdfs", pdf)
        check(os.path.isfile(p) and os.path.getsize(p) > 50000, f"PDF missing/small: {pdf}")

    # required companion files
    for f in ("research.md", "source-quotes.md", "CHECKLIST.md", "naming.json", "rules.json"):
        check(os.path.isfile(os.path.join(REG_DIR, f)), f"missing {f}")

    if failures:
        print(f"FAIL ({len(failures)}):")
        for m in failures:
            print(" -", m)
        return 1
    print(f"PASS: {len(rules)} rules, {len(names)} names, demo scenario OK, PDFs present.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
