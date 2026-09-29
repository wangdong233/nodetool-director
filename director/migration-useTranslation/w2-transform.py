#!/usr/bin/env python3
"""
w2 transformer — useTranslation migration for batches B2/B6/B10/B14
(web/src/components/{node_types,assets,asset_viewer,collections,content,
search,preview,hugging_face,model_menu,timeline}).

Copy of the B0-proven b0-transform.py with w2 fix #1 (expression-arrow
useMemo callbacks: match_back must start before the body's own '(' when the
callback is `() => ({...})` — see memo_call_region).

Implements A-迁移方案 §3 R1/R2/R4/R5 (+R3 deps handling) under C-合并裁定:
  - replace `i18n.t(` -> `t(` ONLY inside component-body spans,
    MINUS useCallback/useEffect callback sub-spans (R4: event phase keeps global)
  - parameter-default sites are outside the body span by construction -> kept
  - module-scope sites (outside any component body) -> kept
  - hook `const { t } = useTranslation();` inserted as FIRST statement of each
    component body that owns >=1 replaced site (R1/R7: works through
    memo()/forwardRef() wrappers because we anchor on the wrapped function body)
  - useMemo bodies: sites replaced AND the memo's deps array fixed
    (languageVersion -> t, else append t) — R3, keeps upgraded preflight green
  - imports per R5: zero remaining code refs -> in-place replace (single-line,
    single-specifier) or specifier removal (single-line, multi-specifier);
    otherwise keep the i18n import and insert the useTranslation import after
    the LAST complete `;`-terminated import statement. Multi-line import
    braces are never edited (F1) — such files are flagged for manual review.
  - every output is verified with esbuild transformSync (G1 discipline)
  - keys are byte-identical by construction (only the `i18n.` prefix is
    dropped); a quoted-literal multiset sanity check runs pre/post anyway.

Single-pass discipline (95 §5 rule 6 / B-R8④): one masked scan builds every
span; all edits are applied right-to-left from one position-sorted list.

Usage:
  python3 b0-transform.py [--dry] <file.tsx>...
Run from anywhere; paths must be inside the worktree.
"""
import re
import subprocess
import sys
import os
import json
import tempfile

HOOK = "const { t } = useTranslation();"
USE_TRANSLATION_IMPORT = 'import { useTranslation } from "react-i18next";'

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


# w2 fix #3: regex-literal awareness. B0's mask treated `/[*_`~]/g` as code,
# so the backtick inside the char class flipped template pairing for the rest
# of the file (real sites hidden inside phantom strings; spans shift). A `/`
# starts a regex only in regex position; `<`/`>` are deliberately NOT in the
# set so JSX `</div>` can never open one.
REGEX_PRECEDING = set("=([{,;:!&|?*+-%~^")
REGEX_KEYWORDS = {
    "return", "typeof", "instanceof", "in", "of", "new", "delete", "void",
    "throw", "do", "else", "case", "yield", "await",
}


def mask(src):
    """Same-length mask: comment interiors + string interiors + regex literal
    interiors -> spaces. Delimiters and newlines are preserved so every span
    computed on the mask maps 1:1 onto the original source."""
    out = []
    state = {"prev_sig": "", "prev_word": ""}

    def note(ch):
        # w2 fix #8: whitespace is TRANSPARENT to the regex-position state.
        # B0-style tracking clobbered prev_sig with ' ' on ` = /re/`, the
        # regex was rejected, and the `/*` INSIDE its char class then opened
        # a phantom block comment that swallowed whole lines of code.
        if ch in " \t\n\r":
            return
        if ch.isalnum() or ch in "_$":
            state["prev_word"] += ch
        else:
            state["prev_word"] = ""
        state["prev_sig"] = ch

    def regex_allowed():
        if state["prev_sig"] == "":
            return True
        if state["prev_sig"] in REGEX_PRECEDING:
            return True
        if state["prev_word"] and state["prev_word"].lower() in REGEX_KEYWORDS:
            return True
        return False

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
            # w2 fix #7: template literals must NOT be masked wholesale —
            # sites inside ${...} were invisible, so their file kept live
            # i18n.t( calls while the import was swapped out (undefined i18n,
            # caught only downstream by G2). Mask only the literal text
            # chunks; emit ${...} interiors verbatim as code (their own
            # quotes/nested templates are self-contained).
            j = i + 1
            out.append("`")
            while j < n:
                ch2 = src[j]
                if ch2 == "\\":
                    out.append("  " if src[j:j + 2] != "\\\n" else " \n")
                    j += 2
                    continue
                if ch2 == "`":
                    out.append("`")
                    j += 1
                    break
                if src.startswith("${", j):
                    out.append("${")
                    j += 2
                    depth = 0
                    while j < n:
                        ch3 = src[j]
                        if ch3 == "{":
                            depth += 1
                        elif ch3 == "}":
                            if depth == 0:
                                break
                            depth -= 1
                        out.append(ch3)
                        j += 1
                    if j < n:
                        out.append("}")
                        j += 1
                    continue
                out.append("\n" if ch2 == "\n" else " ")
                j += 1
            i = j
            note("`")  # a '/' right after a literal is division, never a regex
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
            note(q)  # a '/' right after a literal is division, never a regex
            continue
        if c == "/" and regex_allowed():
            # scan the regex literal; bail to division on newline/no closer
            j = i + 1
            in_class = False
            end = -1
            while j < n:
                ch2 = src[j]
                if ch2 == "\\":
                    j += 2
                    continue
                if ch2 == "\n":
                    break
                if ch2 == "[":
                    in_class = True
                elif ch2 == "]":
                    in_class = False
                elif ch2 == "/" and not in_class:
                    end = j
                    break
                j += 1
            if end >= 0:
                k = end + 1
                while k < n and (src[k].isalpha()):
                    k += 1
                out.append("".join(ch if ch == "\n" else " "
                                   for ch in src[i:k]))
                i = k
                note("/")
                continue
            # not a regex after all — fall through as a plain '/'
        out.append(c)
        note(c)
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


def const_name_before_equals(m, eq_pos):
    """NAME for a declarator whose `=` is at eq_pos (`const NAME <: T> =`),
    else None. w2 fix #4: the B0 regex banned `;`/`=` inside the type
    annotation, so `React.FC<{ a: X; b: Y }>` and `(x) => y` function types
    misclassified components as helpers (render sites silently kept) and
    `T = D` generic defaults broke too. Structured bracket-balanced walk."""
    k = eq_pos - 1
    depth = 0
    words = []      # depth-0 identifiers, nearest-to-`=` first
    cur = ""

    def flush():
        nonlocal cur
        if cur:
            words.append(cur)
            cur = ""

    while k >= 0:
        ch = m[k]
        if ch == ">" and k >= 1 and m[k - 1] == "=":
            # `=>` function-type arrow inside the annotation — not a type-arg
            # closer; skipping both keeps the bracket balance honest
            # (w2 fix #6: `onAdd: () => void` used to strand depth at 1+
            # forever, the `:` separator was never reached, and the
            # component fell back to "helper").
            k -= 2
            continue
        if ch in ">})]":
            flush()
            depth += 1
        elif ch in "<({[":
            if depth == 0:
                return None      # unbalanced opener: not a declarator head
            depth -= 1
            flush()
        elif depth == 0:
            if ch.isalnum() or ch in "_$":
                cur = ch + cur   # walking backward: prepend
                k -= 1
                continue
            flush()
            if ch == ":":
                # annotation separator: NAME is the identifier just left of it
                k -= 1
                while k >= 0 and m[k] in " \t\n":
                    k -= 1
                name = ""
                while k >= 0 and (m[k].isalnum() or m[k] in "_$"):
                    name = m[k] + name
                    k -= 1
                if not name:
                    return None
                head = m[max(0, k - 8):k + 1]
                if not re.search(r"(?:const|let|var)\s*$", head):
                    return None
                return name
            if ch in ";,{}":
                # boundary without annotation: words = [NAME, const|let|var, ...]
                if len(words) < 2 or words[1] not in ("const", "let", "var"):
                    return None
                return words[0]
            if ch not in " \t\n.$|&?'\"":
                return None
        k -= 1
    return None


def classify(m, b):
    """component | cb-callback | effect-callback | memo-callback | helper"""
    # what call precedes this function? Walk back from the function's start
    # (for arrows: from the arrow/param list; for function decls: the keyword)
    if b.get("arrow_at") is not None:
        probe = b["arrow_at"]
    else:
        probe = m.rfind("function", max(0, b["start"] - 200), b["start"] + 1)
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
    # w2 fix #5: skip a preceding `async` keyword — `useCallback(async () => {`
    # used to land the probe on the word `async`, miss the callee, and
    # misclassify the callback body as a helper (its event-phase sites then
    # wrongly counted as replaceable render sites: the stale-t hazard R4
    # exists to prevent).
    if k >= 4 and m[k - 4:k + 1] == "async" and not (
            m[k - 5].isalnum() or m[k - 5] in "_$"):
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
        if k >= 0 and m[k] == "=":
            name = const_name_before_equals(m, k)
            if name and name[:1].isupper():
                return "component"
        # direct argument of memo( / forwardRef(  (possibly with generics)
        seg2 = m[max(0, kparen - 160):kparen + 1]
        if re.search(r"(?:memo|forwardRef)\s*(?:<(?:[^<>]|<[^<>]*>)*>)?\s*\(\s*$",
                     seg2, re.S):
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


def enclosing_paren(m, pos):
    """Innermost unmatched '(' before pos (pos exclusive)."""
    depth = 0
    for i in range(pos - 1, -1, -1):
        if m[i] == ")":
            depth += 1
        elif m[i] == "(":
            depth -= 1
            if depth < 0:
                return i
    return -1


def memo_call_region(m, memo_body):
    """For a memo-callback body, return the span of the whole useMemo(...) call
    so we can find the trailing deps array."""
    # w2 fix #1 (rewritten): the old two-step match_back walk was inverted —
    # match_back returns the opener matching a CLOSE bracket, so using it to
    # step out over the balanced `() =>` params landed on an arbitrary outer
    # paren (B0 never hit this: no expression-arrow memo bodies there).
    # Correct semantics: walk backward with a depth counter; the first '('
    # that makes depth negative is the innermost paren ENCLOSING the callback.
    if memo_body.get("arrow_at") is not None:
        pclose = m.rfind(")", 0, memo_body["arrow_at"] + 1)
        cb_start = (match_back(m, pclose, "(", ")")
                    if pclose >= 0 else memo_body["arrow_at"])
    else:
        cb_start = memo_body["start"]
    popen = enclosing_paren(m, cb_start)
    pend = match_fwd(m, popen, "(", ")") if popen >= 0 else -1
    return popen, pend


def find_deps_array(m, call_open, call_close, callback_end):
    """The last top-level [...] argument of the call, after the callback."""
    # w2 fix #2 (rewritten): the old scan (a) started AT the callback's own
    # closing bracket — depth went to -1 and the deps array was never
    # collected (this killed every expression-arrow memo), and (b) appended
    # the last argument AGAIN at a virtual comma on call_close with a wrong
    # span (start of `[` to the call's `)`). Start after the callback's
    # closer, stop before the call's closer, reset on top-level commas.
    k = callback_end + 1
    depth = 0
    args = []
    cur_start = None
    end = call_close  # the call's own ')' is not part of any argument
    while k < end:
        ch = m[k]
        if ch in "([{":
            if depth == 0:
                cur_start = k
            depth += 1
        elif ch in ")]}":
            if depth == 0:
                cur_start = None  # stray closer — reset defensively
            else:
                depth -= 1
                if depth == 0:
                    args.append((cur_start, k))
        elif ch == "," and depth == 0:
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


def paren_body_insert(src, m, comp):
    """w2 fix #9: expression-arrow component (`const X = () => (<JSX/>)`)
    cannot host a hook statement — convert to a block body in place:
      `=> (\n<ws>EXPR\n<wsC>)` becomes
      `=> {\n<ws>const { t } = useTranslation();\n<ws>return (\n<ws>EXPR\n<wsC>);\n<D>}`
    EXPR bytes are untouched; only wrapper text is inserted."""
    p, e = comp["start"], comp["end"]
    k = p + 1
    while k < len(src) and src[k] in " \t\n\r":
        k += 1
    line_start = src.rfind("\n", 0, k) + 1
    I = src[line_start:k] if line_start < k else "  "
    anchor = comp["arrow_at"] if comp.get("arrow_at") is not None else p
    decl_line = src.rfind("\n", 0, anchor) + 1
    D = re.match(r"[ \t]*", src[decl_line:]).group(0)
    before = "{\n" + I + HOOK + "\n" + I + "return "
    after = ";\n" + D + "}"
    return (p, before), (e + 1, after)


def transform(path, dry=False):
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
    kept_event = kept_param_or_module = replaced = 0
    owners = {}          # component body id -> True
    memos_to_fix = set() # memo callback body start
    report_lines = []

    for pos in sites:
        chain = enclosing(m, bodies, pos)
        if any(b["kind"] in ("cb-callback", "effect-callback") for b in chain):
            kept_event += 1
            report_lines.append(f"  keep(event) @{src[:pos].count(chr(10))+1}")
            continue
        comp = next((b for b in chain if b["kind"] == "component"), None)
        if comp is None:
            kept_param_or_module += 1
            report_lines.append(
                f"  keep(param/module) @{src[:pos].count(chr(10))+1}")
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
                "kept_other": kept_param_or_module,
                "detail": report_lines}

    # hook insertions (first statement of each owning component body)
    for _id, comp in owners.items():
        body_src = m[comp["start"]:comp["end"]]
        if "useTranslation" in body_src:
            report_lines.append("  hook already present, skipped insertion")
            continue
        if comp["block"]:
            ipos, itext = first_statement_insert(src, comp["start"])
            edits.append((ipos, 0, itext))
        else:
            # w2 fix #9: expression-arrow body -> convert to block form
            (p1, t1), (p2, t2) = paren_body_insert(src, m, comp)
            edits.append((p1, 0, t1))
            edits.append((p2, 0, t2))
            report_lines.append(
                f"  expr-arrow -> block body @{src[:comp['start']].count(chr(10))+1}")
        hooks += 1

    # useMemo deps fixes (R3)
    for memo_start in memos_to_fix:
        memo_body = next(b for b in bodies if b["start"] == memo_start)
        copen, cclose = memo_call_region(m, memo_body)
        if copen < 0 or cclose < 0:
            fail(f"{path}: cannot bound useMemo call for deps fix")
        deps = find_deps_array(m, copen, cclose, memo_body["end"])
        if deps is None:
            fail(f"{path}: useMemo without deps array at {memo_start}")
        da, db = deps
        deps_text = m[da + 1:db]
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
    import_zone_end = max((e for _, e in import_spans), default=-1)
    # remaining code refs to i18n. (imports themselves carry no `i18n.`)
    body_mask = m2 if import_zone_end < 0 else (
        m2[:min(s for s, _ in import_spans)] + "".join(
            " " * (e - s + 1) for s, e in import_spans) + m2[import_zone_end + 1:]
    ) if import_spans else m2
    # simpler: blank every import statement, then count
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
            new_stmt = re.sub(r"\{\s*i18n\s*,\s*", "{ ", stmt)
            new_stmt = re.sub(r",\s*i18n\s*\}", " }", new_stmt)
            if new_stmt == stmt or re.match(
                    r"import\s*\{[^}]*\bi18n\b[^}]*\}\s*from", new_stmt):
                fail(f"{path}: specifier removal failed on: {stmt!r}")
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
                fail(f"{path}: no import statement to anchor on")
            last_end = max(e for _, e in import_spans2)
            out = out[:last_end + 1] + "\n" + USE_TRANSLATION_IMPORT + out[last_end + 1:]
            import_action = "insert-after-last-import (i18n kept)"
        else:
            import_action = "already-imported"

    # invariants: quoted ns:key literals byte-identical multiset
    if literal_multiset(src) != literal_multiset(out):
        fail(f"{path}: ns:key literal multiset changed — aborting")

    result = {
        "path": path, "status": "transformed" if not dry else "dry-run",
        "sites": len(sites), "replaced": replaced,
        "kept_event": kept_event, "kept_param_or_module": kept_param_or_module,
        "hooks": hooks, "memo_deps_fixes": memo_fixes,
        "import_action": import_action, "detail": report_lines,
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
        "{loader:'tsx'});}catch(e){console.error('ESBUILD-FAIL '+f+': '+e.message);"
        "process.exitCode=1;}}"
    )
    r = subprocess.run(["node", "-e", script] + paths, cwd=web_dir,
                       capture_output=True, text=True)
    if r.stdout.strip():
        print(r.stdout.strip())
    if r.stderr.strip():
        print(r.stderr.strip())
    return r.returncode == 0


def main():
    args = sys.argv[1:]
    dry = False
    if args and args[0] == "--dry":
        dry = True
        args = args[1:]
    if not args:
        fail("no files given")
    worktree = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    web_dir = os.path.join(worktree, "web")
    results = []
    for p in args:
        ap = os.path.abspath(p)
        if not ap.startswith(worktree):
            fail(f"path outside worktree: {ap}")
        results.append(transform(ap, dry=dry))

    print(json.dumps({os.path.basename(r["path"]): {
        k: v for k, v in r.items() if k not in ("path", "detail")}
        for r in results}, indent=1, ensure_ascii=False))
    for r in results:
        for line in r.get("detail", []):
            print(os.path.basename(r["path"]) + line)

    transformed = [r["path"] for r in results if r["status"] == "transformed"]
    if transformed and not dry:
        print(f"\nwalk-roots: {args}")
        print(f"esbuild-verifying {len(transformed)} outputs ...")
        if not esbuild_verify(transformed, web_dir):
            fail("esbuild verification failed — files left as written; "
                 "inspect and revert")
        print("esbuild: all outputs parse")


if __name__ == "__main__":
    main()
