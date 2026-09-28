#!/usr/bin/env python3
"""Page-sweep classifier — the F-09 loop's adjudication step.
Reads a JSON array of {line, url} produced by the browser extractor,
classifies each Latin line against expected-english.json, prints FINDING lines.
Usage: classify_sweep.py <extract.json>
"""
import json, sys, re

EXPECT = json.load(open(
    "/Users/wangdong/Documents/Project/项目/aigc-nodetool/director/i18n-worklists/expected-english.json",
    encoding="utf-8"))
EXACT = set(EXPECT["exact"])
PREFIX = tuple(EXPECT["prefix"])
CONTAINS = tuple(EXPECT["contains"])

def classify(line: str) -> str:
    s = line.strip()
    if not re.search(r"[A-Za-z]{3,}", s):
        return "skip"          # no real words
    if re.search(r"[一-鿿]", s):
        return "skip"          # mixed CJK line — CJK carries it
    if s in EXACT:
        return "expected"
    if s.startswith(PREFIX):
        return "expected"
    if any(c in s for c in CONTAINS):
        return "expected"
    # pure symbol/number/ident lines (worker:local, key=VALUE, 3D, v1.2)
    if not re.search(r"[a-z]", s):
        return "expected"      # ALLCAPS/symbols — codes & acronyms
    return "FINDING"

data = json.load(open(sys.argv[1], encoding="utf-8"))
findings = []
for item in data:
    for line in item["lines"]:
        if classify(line) == "FINDING":
            findings.append({"url": item["url"], "line": line.strip()})
for f in findings:
    print(f'FINDING [{f["url"]}] {f["line"]}')
print(f"total findings: {len(findings)}")
