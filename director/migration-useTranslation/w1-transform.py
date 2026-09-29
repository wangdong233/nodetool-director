#!/usr/bin/env python3
"""
W1 batch transformer — useTranslation migration for batches B1/B5/B9/B13.

Derived from the B0-proven director/migration-useTranslation/b0-transform.py
(same single-pass string-aware engine; refusal lists kept verbatim). Changes
vs B0, all noted for the batch report:

  1. memo_call_region() REWRITTEN. B0's version walked out one paren level
     with match_back anchored at the callback body start; for EXPRESSION-
     bodied memo arrows (`useMemo(() => (<>...</>), [deps])`) the anchor sits
     ON an open paren, match_back goes negative and returns -1 -> B0 would
     have hard-aborted (this path never ran in B0: zero memo-body sites).
     New form anchors on the `useMemo` identifier before the callback and
     skips optional generics, so both block and expression arrows resolve.
  2. Import specifier removal now chains the second re.sub on new_stmt (B0
     applied both on the original stmt — harmless for first/last position,
     dead for middle) and adds the middle-position pattern.
  3. esbuild verification picks the loader by extension (.ts vs .tsx).
  4. Batch mode: --batch <B1|B5|B9|B13> walks the batch's directory set,
     collects files containing `i18n.t(` (excluding __tests__), refuses
     DANGER_10/SHADOW_16 basenames, transforms the rest. A per-file failure
     marks that file `aborted-manual` (left untouched) and continues — safer
     than B0's process-wide abort, which skipped esbuild verification of the
     already-written outputs. Exit code stays non-zero when any file failed.
  5. Dry-run report splits kept sites into kept_param_default (site inside a
     component's parameter/signature region) vs kept_module (module scope /
     non-component helper), per the batch protocol's category list.

Usage:
  python3 w1-transform.py --dry --batch B1
  python3 w1-transform.py --batch B1
  python3 w1-transform.py [--dry] <file.tsx>...
Run from anywhere; paths must be inside the worktree.
"""
import re
import subprocess
import sys
import os
import json

HOOK = "const { t } = useTranslation();"
USE_TRANSLATION_IMPORT = 'import { useTranslation } from "react-i18next";'

BATCH_DIRS = {
    "B1": ["properties", "inputs", "color_picker", "widgets", "buttons",
           "audio", "audio_editor", "content", "settings"],
    "B5": ["menus", "panels", "context_menus"],
    "B9": ["chat"],
    "B13": ["setup"],
}

# Defense-in-depth refusals (A §3 preamble): t-shadow 16 + danger 10.
SHADOW_16 = {
    "MessageView", "CompositorEditorCanvas", "NodeInfoPanel",
    "ExternalMcpServersSection", "PropertyInput", "OutputNode", "PreviewNode",
    "AdsrPreview", "SynthKnob", "ClipTimeRemap", "ClipAdjustments",
    "ClipCustomCurves", "TranscriptEditor", "TrackEffectsPanel", "LayerItem",
    "SketchLayersPanel",
}
DANGER_10 = {
    "src/index.tsx", "MessageView.tsx", "Model3DViewer.tsx",
    "OutputContextMenu.tsx", "ConnectableNodes.tsx", "MediaChatComposer.tsx",
    "StoryboardBoard.tsx", "SketchLayersPanel.tsx", "APIKeysTab.tsx",
    "ClipMaskMatte.tsx",
}


def fail(msg):
    print(f"TRANSFORM-ABORT: {msg}")
    sys.exit(1)


def mask(src):
    """Same-length mask: comment interiors + string interiors -> spaces.
    Delimiters and newlines are preserved so every span computed on the mask
    maps 1:1 onto the original source."""
    out = []
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        if src.startswith("/*", i):
            j = src.find("*/", i + 2)
            j = n if j < 0 else j + 2
            out.append("".join(ch if ch == "\n" else " " for ch in src[i:j]))
            i = j
            continue
        if src.startswith("//", i):
            j = src.find("\n", i)
            j = n if j < 0 else j
            out.append(" " * (j - i))
            i = j
            continue
        if c == "`":
            # W1 fix (B0 gap #4): template literals keep their ${...}
            # interpolation interiors VERBATIM — they are expressions. B0
            # masked backtick-to-backtick wholesale, so `i18n.t(` inside an
            # interpolation was invisible: never classified (must be
            # kept_event when in a callback) and never counted in the
            # import-removal refs scan, which then removed a live import
            # (TS2304, DataframeProperty). Length stays 1:1.
            out.append("`")
            j = i + 1
            while j < n:
                ch = src[j]
                if ch == "\\":
                    out.append("  ")
                    j += 2
                    continue
                if ch == "`":
                    break
                if ch == "$" and j + 1 < n and src[j + 1] == "{":
                    k = j + 2
                    depth = 1
                    while k < n and depth > 0:
                        c2 = src[k]
                        if c2 in "\"'":
                            q2 = c2
                            k += 1
                            while k < n:
                                if src[k] == "\\":
                                    k += 2
                                    continue
                                if src[k] == q2:
                                    break
                                k += 1
                        elif c2 == "{":
                            depth += 1
                        elif c2 == "}":
                            depth -= 1
                            if depth == 0:
                                break
                        k += 1
                    out.append("${" + src[j + 2:k] + "}")
                    j = k + 1
                    continue
                out.append(ch if ch == "\n" else " ")
                j += 1
            out.append("`")
            i = j + 1
            continue
        if c in "\"'":
            q = c
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == q:
                    break
                j += 1
            j = min(j, n - 1)
            out.append(q + " " * (j - i - 1) + q)
            i = j + 1
            continue
        out.append(c)
        i += 1
    return "".join(out)


def match_fwd(m, pos, open_ch, close_ch):
    """Position of the matching close for the opener at pos (on masked text)."""
    depth = 0
    for i in range(pos, len(m)):
        if m[i] == open_ch:
            depth += 1
        elif m[i] == close_ch:
            depth -= 1
            if depth == 0:
                return i
    return -1


def match_back(m, pos, open_ch, close_ch):
    depth = 0
    for i in range(pos, -1, -1):
        if m[i] == close_ch:
            depth += 1
        elif m[i] == open_ch:
            depth -= 1
            if depth == 0:
                return i
    return -1


def find_bodies(m):
    """All function bodies on the masked text.
    Each record: dict(start, end, kind, name, paren_start) where start..end is
    the BODY span (block: brace-to-brace; expression arrow: paren-to-paren)."""
    bodies = []

    # --- arrow functions ---
    for mm in re.finditer(r"=>", m):
        k = mm.end()
        while k < len(m) and m[k] in " \t":
            k += 1
        if k < len(m) and m[k] == "{":
            end = match_fwd(m, k, "{", "}")
            if end < 0:
                continue
            bodies.append({"start": k, "end": end, "block": True,
                           "arrow_at": mm.start()})
        elif k < len(m) and m[k] == "(":
            end = match_fwd(m, k, "(", ")")
            if end < 0:
                continue
            bodies.append({"start": k, "end": end, "block": False,
                           "arrow_at": mm.start()})

    # --- function declarations (optional generics between name and params) ---
    for mm in re.finditer(
            r"function\s+([A-Za-z_$][\w$]*)\s*(?:<[^<>]*(?:<[^<>]*>[^<>]*)*>)?\s*\(",
            m):
        pclose = match_fwd(m, mm.end() - 1, "(", ")")
        if pclose < 0:
            continue
        # skip an optional `: ReturnType` annotation, then land on the body `{`.
        # A `{` at group-depth 0 opens the BODY when the previous non-ws char
        # is an identifier char, `)`, `}` or `>`; otherwise it is an object
        # type's brace (preceded by `:` `<` `,` `|` `&` `(`) and is skipped as
        # a balanced group.
        k = pclose + 1
        while k < len(m) and m[k] in " \t\n\r":
            k += 1
        if k < len(m) and m[k] == ":":
            k += 1
            depth = 0
            prev = ":"
            while k < len(m):
                ch = m[k]
                if ch in "([{":
                    if depth == 0 and ch == "{":
                        if prev and (prev.isalnum() or prev in "_$)>}"):
                            break  # body brace
                    depth += 1
                elif ch in ")]}":
                    depth -= 1
                if not ch in " \t\n\r":
                    prev = ch
                k += 1
            else:
                continue
        if k < len(m) and m[k] == "{":
            end = match_fwd(m, k, "{", "}")
            if end < 0:
                continue
            bodies.append({"start": k, "end": end, "block": True,
                           "name": mm.group(1), "arrow_at": None})

    # classify each body by what precedes it
    for b in bodies:
        b.setdefault("name", None)
        b["kind"] = classify(m, b)
    return bodies


def classify(m, b):
    """component | cb-callback | effect-callback | memo-callback | helper"""
    # what call precedes this function? Walk back from the function's start
    # (for arrows: from the arrow/param list; for function decls: the keyword)
    if b.get("arrow_at") is not None:
        probe = b["arrow_at"]
    else:
        probe = b["start"]
    # find the innermost unclosed '(' before the function begins
    p = probe - 1
    # for arrows with param lists, step over the params: find '(' that opens them
    if b.get("arrow_at") is not None:
        pclose = m.rfind(")", 0, b["arrow_at"] + 1)
        popen = match_back(m, pclose, "(", ")") if pclose >= 0 else -1
        p = (popen - 1) if popen >= 0 else (b["arrow_at"] - 1)
    # walk back over whitespace/generics to the preceding identifier
    k = p
    while k >= 0 and m[k] in " \t\n":
        k -= 1
    # W1 fix (B0 gap #5): skip a trailing `async` keyword. `useCallback(
    # async (e) => {...})` landed the probe on "async", so the callback was
    # classified "helper" and its event-phase sites got replaced with the
    # render-captured t instead of kept on global i18n (R4).
    if (k >= 5 and m[k - 4:k + 1] == "async"
            and not (m[k - 5].isalnum() or m[k - 5] in "_$")):
        k -= 5
        while k >= 0 and m[k] in " \t\n":
            k -= 1
    # kparen: sitting on a '(' (if any) — the position the memo/forwardRef
    # direct-argument probe needs. If we sit on the CALL's '(' (e.g.
    # `useCallback(\n  (tag) => {`), step over it to reach the callee ident.
    kparen = k
    ident = ""
    if k >= 0 and m[k] == "(":
        k -= 1
        while k >= 0 and m[k] in " \t\n":
            k -= 1
        while k >= 0 and (m[k].isalnum() or m[k] in "_$"):
            ident = m[k] + ident
            k -= 1
    if ident in ("useCallback", "useEffect", "useMemo"):
        return {"useCallback": "cb-callback",
                "useEffect": "effect-callback",
                "useMemo": "memo-callback"}[ident]
    # component? named function with uppercase first letter
    if b.get("name") and b["name"][:1].isupper():
        return "component"
    # const NAME = <...> arrow  (uppercase NAME)
    if b.get("arrow_at") is not None:
        for kend in {k, kparen}:
            seg = m[max(0, kend - 120):kend + 1]
            mm = re.search(
                r"const\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]*?)?=\s*$", seg, re.S)
            if mm and mm.group(1)[:1].isupper():
                return "component"
        # direct argument of memo( / forwardRef(  (possibly with generics)
        seg2 = m[max(0, kparen - 160):kparen + 1]
        if re.search(r"(?:memo|forwardRef)\s*(?:<[^<>]*>)?\s*\(\s*$", seg2,
                     re.S):
            return "component"
    return "helper"


def enclosing(m, bodies, pos):
    """Bodies containing pos, innermost first."""
    hits = [b for b in bodies if b["start"] <= pos <= b["end"]]
    hits.sort(key=lambda b: (b["end"] - b["start"]))
    return hits


def first_statement_insert(src, body_start):
    """Return (pos, text) for inserting the hook as the first statement.
    k points AT the first statement's first char; the statement's own leading
    indent already sits in src before k, so the hook goes at k and the indent
    is re-emitted after the newline to keep the first statement's column."""
    k = body_start + 1
    while k < len(src) and src[k] in " \t\n\r":
        k += 1
    line_start = src.rfind("\n", 0, k) + 1
    indent = src[line_start:k] if line_start < k else "  "
    if "\n" in src[body_start + 1:k]:
        # first statement is on its own line: hook on its own line before it,
        # then re-add the statement's original indent
        return k, HOOK + "\n" + indent
    # first statement shares the brace line
    return k, " " + HOOK + " "


def expression_body_hook_edits(src, body_start, body_end):
    """W1 (B0 gap #3): an EXPRESSION-bodied component arrow
    (`const X = (props) => (<JSX/>);`) has no statement position — the hook
    cannot be inserted as-is. Rewrite the paren body into a block body:
        => ( JSX );   becomes   => { HOOK return ( JSX ); }
    Returns two edits (start-paren, end-paren). esbuild tolerates a statement
    after `=> (` (so B0's verifier stayed green) but tsc raises TS1109/1128 —
    the two files that hit this in B1 were the tell."""
    k = body_start + 1
    while k < len(src) and src[k] in " \t\n\r":
        k += 1
    line_start = src.rfind("\n", 0, k) + 1
    indent = src[line_start:k] if line_start < k else ""
    if "\n" in src[body_start + 1:k]:
        open_edit = (body_start, 1,
                     "{\n" + indent + HOOK + "\n" + indent + "return (")
        close_edit = (body_end, 1, ")\n" + indent + "}")
    else:
        open_edit = (body_start, 1, "{ " + HOOK + " return (")
        close_edit = (body_end, 1, ") }")
    return [open_edit, close_edit]


def memo_call_region(m, memo_body):
    """For a memo-callback body, return the span of the whole useMemo(...) call
    so we can find the trailing deps array.

    W1 REWRITE (B0 bug): B0 anchored on match_back from the callback body
    start. For expression-bodied arrows (`useMemo(() => (<jsx>), [deps])`)
    the body start IS an open paren, the backward depth goes negative and
    never returns 0 -> -1 -> B0 would abort ("cannot bound useMemo call").
    B0 never hit it (zero memo-body sites). New approach: find the `useMemo`
    identifier that precedes the callback, skip its optional generics, and
    take its paren-to-paren span."""
    if memo_body.get("arrow_at") is not None:
        pos = memo_body["arrow_at"]
    else:
        pos = memo_body["start"]
    k = m.rfind("useMemo", 0, pos + 1)
    while k != -1:
        before = m[k - 1] if k > 0 else " "
        if not (before.isalnum() or before in "_$"):
            j = k + len("useMemo")
            while j < len(m) and m[j] in " \t\n":
                j += 1
            if j < len(m) and m[j] == "<":
                depth = 0
                while j < len(m):
                    if m[j] == "<":
                        depth += 1
                    elif m[j] == ">":
                        depth -= 1
                        if depth == 0:
                            break
                    j += 1
                j += 1
                while j < len(m) and m[j] in " \t\n":
                    j += 1
            if j < len(m) and m[j] == "(":
                pend = match_fwd(m, j, "(", ")")
                if pend >= 0:
                    return j, pend
        k = m.rfind("useMemo", 0, k)
    return -1, -1


def find_deps_array(m, call_open, call_close, callback_end):
    """The last top-level [...] argument of the call, after the callback.

    W1 fix (B0 bug #2, never exercised in B0 — zero memo sites): start at
    callback_end + 1. callback_end is itself the callback's LAST character
    (`}` for block arrows, `)` for expression arrows) and counting it sends
    the depth to -1, so the trailing deps array is never recognized."""
    k = callback_end + 1
    depth = 0
    args = []
    cur_start = None
    while k <= call_close:
        ch = m[k] if k < call_close else ","
        if ch in "([{":
            if depth == 0:
                cur_start = k
            depth += 1
        elif ch in ")]}":
            depth -= 1
            if depth == 0:
                args.append((cur_start, k))
        elif ch == "," and depth == 0:
            if cur_start is not None:
                args.append((cur_start, k))
            cur_start = None
        k += 1
    for a, b in reversed(args):
        if m[a] == "[":
            return (a, b)
    return None


def literal_multiset(src):
    return sorted(re.findall(r"[\"'`][a-z0-9]+:[a-zA-Z0-9_.]+[\"'`]", src))


def find_imports(m):
    """[(stmt_start, stmt_end_incl_semicolon)] for every top-level import."""
    out = []
    for mm in re.finditer(r"(?m)^import\s", m):
        start = mm.start()
        k = mm.end()
        while k < len(m):
            if m[k] == ";":
                out.append((start, k))
                break
            k += 1
    return out


class FileFailure(Exception):
    pass


def transform(path, dry=False):
    """Returns a result dict; raises FileFailure for manual-review files."""
    src = open(path).read()
    base = os.path.basename(path)
    if base in DANGER_10:
        return {"path": path, "status": "refused-danger10"}
    if os.path.splitext(base)[0] in SHADOW_16:
        return {"path": path, "status": "refused-shadow16"}

    m = mask(src)
    bodies = find_bodies(m)
    sites = [mm.start() for mm in re.finditer(r"i18n\.t\(", m)]
    if not sites:
        return {"path": path, "status": "no-sites"}

    edits = []           # (pos, old_len, new_text)
    hooks = 0
    memo_fixes = 0
    kept_event = kept_param = kept_module = replaced = 0
    owners = {}          # component body id -> True
    memos_to_fix = set() # memo callback body start
    report_lines = []
    deps_before_after = []
    expr_rewrites = []

    for pos in sites:
        chain = enclosing(m, bodies, pos)
        if any(b["kind"] in ("cb-callback", "effect-callback") for b in chain):
            kept_event += 1
            report_lines.append(f"  keep(event) @{src[:pos].count(chr(10))+1}")
            continue
        comp = next((b for b in chain if b["kind"] == "component"), None)
        if comp is None:
            # classify the kept site: inside a parameter/signature region
            # (before some body's brace), or true module scope. A site with no
            # enclosing body may still be a param DEFAULT of the next body to
            # open (e.g. LanguageModelSelect's destructured placeholder) —
            # signature regions carry no top-level `;` between site and body.
            inner = chain[0] if chain else None
            if inner is not None and pos < inner["start"]:
                kept_param += 1
                report_lines.append(
                    f"  keep(param-default) @{src[:pos].count(chr(10))+1}")
            elif inner is None:
                nxt = min((b["start"] for b in bodies if b["start"] > pos),
                          default=None)
                stmt_sep = False
                if nxt is not None:
                    depth = 0
                    for ch in m[pos:nxt]:
                        if ch in "([{":
                            depth += 1
                        elif ch in ")]}":
                            depth -= 1
                        elif ch == ";" and depth == 0:
                            stmt_sep = True
                            break
                if nxt is not None and nxt - pos <= 600 and not stmt_sep:
                    kept_param += 1
                    report_lines.append(
                        f"  keep(param-default) @{src[:pos].count(chr(10))+1}")
                else:
                    kept_module += 1
                    report_lines.append(
                        f"  keep(module) @{src[:pos].count(chr(10))+1}")
            else:
                kept_module += 1
                report_lines.append(
                    f"  keep(module) @{src[:pos].count(chr(10))+1}")
            continue
        # inside a useMemo callback under this component? (R3)
        for b in chain:
            if b["kind"] == "memo-callback" and comp["start"] < b["start"]:
                memos_to_fix.add(b["start"])
        edits.append((pos, len("i18n.t("), "t("))
        replaced += 1
        owners[id(comp)] = comp

    if not edits:
        return {"path": path, "status": "no-render-sites",
                "sites": len(sites), "kept_event": kept_event,
                "kept_param": kept_param, "kept_module": kept_module,
                "detail": report_lines}

    # hook insertions (first statement of each owning component body)
    for _id, comp in owners.items():
        body_src = m[comp["start"]:comp["end"]]
        if "useTranslation" in body_src:
            report_lines.append("  hook already present, skipped insertion")
            continue
        if comp.get("block", True):
            ipos, itext = first_statement_insert(src, comp["start"])
            edits.append((ipos, 0, itext))
        else:
            # expression-bodied component arrow -> rewrite to block form (W1)
            edits.extend(expression_body_hook_edits(
                src, comp["start"], comp["end"]))
            expr_rewrites.append(
                os.path.basename(path) + f"@{src[:comp['start']].count(chr(10))+1}")
        hooks += 1

    # useMemo deps fixes (R3)
    for memo_start in memos_to_fix:
        memo_body = next(b for b in bodies if b["start"] == memo_start)
        copen, cclose = memo_call_region(m, memo_body)
        if copen < 0 or cclose < 0:
            raise FileFailure(f"{path}: cannot bound useMemo call for deps fix")
        deps = find_deps_array(m, copen, cclose, memo_body["end"])
        if deps is None:
            raise FileFailure(f"{path}: useMemo without deps array at {memo_start}")
        da, db = deps
        deps_text = m[da + 1:db]
        before_line = src[da:db + 1]
        if re.search(r"(?<![\w$.])languageVersion(?![\w$])", deps_text):
            # token -> t
            for tmatch in re.finditer(r"(?<![\w$.])languageVersion(?![\w$])", m[da + 1:db]):
                edits.append((da + 1 + tmatch.start(), len("languageVersion"), "t"))
        elif not re.search(r"(?<![\w$.])t(?![\w$])", deps_text):
            inner = deps_text
            if inner.strip() == "":
                edits.append((da + 1, 0, "t"))
            else:
                stripped = inner.rstrip()
                insert_at = da + 1 + len(stripped)
                edits.append((insert_at, 0, ", t"))
        memo_fixes += 1
        deps_before_after.append(before_line)

    # apply right-to-left
    edits.sort(key=lambda e: e[0], reverse=True)
    out = src
    seen = set()
    for pos, oldlen, newtext in edits:
        key = (pos, oldlen, newtext)
        if key in seen:
            continue
        seen.add(key)
        out = out[:pos] + newtext + out[pos + oldlen:]

    # --- imports (R5) ---
    m2 = mask(out)
    import_spans = find_imports(m2)
    # remaining code refs to i18n. (imports themselves carry no `i18n.`)
    body_mask = list(m2)
    for s, e in import_spans:
        for k in range(s, e + 1):
            if body_mask[k] != "\n":
                body_mask[k] = " "
    refs = len(re.findall(r"\bi18n\.", "".join(body_mask)))

    import_action = "none"
    i18n_import_stmt = None
    for s, e in import_spans:
        stmt = out[s:e + 1]
        if re.match(r"import\s*\{[^}]*\bi18n\b[^}]*\}\s*from", stmt, re.S):
            i18n_import_stmt = (s, e, stmt)
            break

    if refs == 0 and hooks > 0 and i18n_import_stmt:
        s, e, stmt = i18n_import_stmt
        if "\n" in stmt:
            import_action = "flag-multiline-import-manual"
        elif re.match(r"import\s*\{\s*i18n\s*\}\s*from", stmt):
            # in-place replace (F1 root-fix form)
            out = out[:s] + USE_TRANSLATION_IMPORT + out[e + 1:]
            import_action = "in-place-replace"
        else:
            # single-line, multi-specifier: remove the i18n specifier atomically
            # (W1: chain the subs on new_stmt; middle position added)
            new_stmt = re.sub(r"\{\s*i18n\s*,\s*", "{ ", stmt)
            new_stmt = re.sub(r",\s*i18n\s*\}", " }", new_stmt)
            new_stmt = re.sub(r",\s*i18n\s*,", ",", new_stmt)
            if new_stmt == stmt or re.match(
                    r"import\s*\{[^}]*\bi18n\b[^}]*\}\s*from", new_stmt):
                raise FileFailure(
                    f"{path}: specifier removal failed on: {stmt!r}")
            out = out[:s] + new_stmt + out[e + 1:]
            import_action = "specifier-removed"
            import_spans = find_imports(mask(out))
            last_end = max(e for _, e in import_spans)
            out = out[:last_end + 1] + "\n" + USE_TRANSLATION_IMPORT + out[last_end + 1:]
            import_action += "+insert"
    elif hooks > 0:
        # NB: the hook line itself contains the word useTranslation — only an
        # actual react-i18next import statement counts as already imported.
        if not re.search(
                r"import\s*\{[^}]*\}\s*from\s*[\"']react-i18next[\"']", out):
            import_spans2 = find_imports(mask(out))
            if not import_spans2:
                raise FileFailure(f"{path}: no import statement to anchor on")
            last_end = max(e for _, e in import_spans2)
            out = out[:last_end + 1] + "\n" + USE_TRANSLATION_IMPORT + out[last_end + 1:]
            import_action = "insert-after-last-import (i18n kept)"
        else:
            import_action = "already-imported"

    # invariants: quoted ns:key literals byte-identical multiset
    if literal_multiset(src) != literal_multiset(out):
        raise FileFailure(f"{path}: ns:key literal multiset changed — aborting")

    result = {
        "path": path, "status": "transformed" if not dry else "dry-run",
        "sites": len(sites), "replaced": replaced,
        "kept_event": kept_event, "kept_param": kept_param,
        "kept_module": kept_module,
        "hooks": hooks, "memo_deps_fixes": memo_fixes,
        "import_action": import_action, "detail": report_lines,
        "deps_before": deps_before_after, "expr_rewrites": expr_rewrites,
    }
    if not dry:
        open(path, "w").write(out)
    return result


def esbuild_verify(paths, web_dir):
    """One node invocation verifying every output parses (G1 discipline)."""
    script = (
        "const esbuild=require('esbuild');const fs=require('fs');"
        "const files=process.argv.slice(1);"
        "for(const f of files){try{esbuild.transformSync(fs.readFileSync(f,'utf8'),"
        "{loader:f.endsWith('.ts')?'ts':'tsx'});}catch(e){console.error('ESBUILD-FAIL '+f+': '+e.message);"
        "process.exitCode=1;}}"
    )
    r = subprocess.run(["node", "-e", script] + paths, cwd=web_dir,
                       capture_output=True, text=True)
    if r.stdout.strip():
        print(r.stdout.strip())
    if r.stderr.strip():
        print(r.stderr.strip())
    return r.returncode == 0


def collect_batch_files(batch, web_components):
    files = []
    for d in BATCH_DIRS[batch]:
        root = os.path.join(web_components, d)
        for dirpath, dirnames, filenames in os.walk(root):
            if "__tests__" in dirpath.split(os.sep):
                continue
            for f in filenames:
                if not f.endswith((".ts", ".tsx")):
                    continue
                p = os.path.join(dirpath, f)
                try:
                    src = open(p).read()
                except OSError:
                    continue
                if "i18n.t(" in src:
                    files.append(p)
    return sorted(files)


def main():
    args = sys.argv[1:]
    dry = False
    batch = None
    rest = []
    for a in args:
        if a == "--dry":
            dry = True
        elif a == "--batch":
            batch = "PLACEHOLDER"
        else:
            if batch == "PLACEHOLDER":
                batch = a
            else:
                rest.append(a)
    if batch and batch not in BATCH_DIRS:
        fail(f"unknown batch {batch}")
    if not batch and not rest:
        fail("no files given")
    worktree = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    web_dir = os.path.join(worktree, "web")

    if batch:
        files = collect_batch_files(batch, os.path.join(web_dir, "src", "components"))
        print(f"batch {batch} dirs: {BATCH_DIRS[batch]}")
        print(f"collected {len(files)} files containing i18n.t( (tests excluded)")
    else:
        files = rest

    results = []
    failed = []
    for p in files:
        ap = os.path.abspath(p)
        if not ap.startswith(worktree):
            fail(f"path outside worktree: {ap}")
        try:
            results.append(transform(ap, dry=dry))
        except FileFailure as e:
            print(f"FILE-FAILURE {e}")
            failed.append(ap)
            results.append({"path": ap, "status": "aborted-manual"})

    # summary counts by category
    agg = {}
    for r in results:
        if r["status"] in ("transformed", "dry-run"):
            agg["hooked files"] = agg.get("hooked files", 0) + 1
            agg["replaced"] = agg.get("replaced", 0) + r["replaced"]
            agg["hooks inserted"] = agg.get("hooks inserted", 0) + r["hooks"]
            agg["memo deps fixes"] = agg.get("memo deps fixes", 0) + r["memo_deps_fixes"]
            agg["kept_event"] = agg.get("kept_event", 0) + r["kept_event"]
            agg["kept_param_default"] = agg.get("kept_param_default", 0) + r["kept_param"]
            agg["kept_module"] = agg.get("kept_module", 0) + r["kept_module"]
        else:
            agg[r["status"]] = agg.get(r["status"], 0) + 1
    print("\n=== SUMMARY (by category) ===")
    for k in sorted(agg):
        print(f"  {k}: {agg[k]}")

    print("\n=== PER-file ===")
    for r in results:
        st = r["status"]
        extras = {k: r[k] for k in ("sites", "replaced", "hooks",
                                    "memo_deps_fixes", "kept_event",
                                    "kept_param", "kept_module",
                                    "import_action") if k in r}
        print(f"  {os.path.relpath(r['path'], web_dir)}: {st} {extras if extras else ''}")

    if not dry:
        for r in results:
            for line in r.get("detail", []):
                print(os.path.relpath(r["path"], web_dir) + line)

        transformed = [r["path"] for r in results if r["status"] == "transformed"]
        if transformed:
            print(f"\nwalk-roots: {BATCH_DIRS.get(batch) or rest}")
            print(f"esbuild-verifying {len(transformed)} outputs ...")
            if not esbuild_verify(transformed, web_dir):
                fail("esbuild verification failed — files left as written; "
                     "inspect and revert")
            print("esbuild: all outputs parse")
    if failed:
        print(f"\n{len(failed)} FILE-FAILURE files left untouched for manual review")
        sys.exit(2)


if __name__ == "__main__":
    main()
