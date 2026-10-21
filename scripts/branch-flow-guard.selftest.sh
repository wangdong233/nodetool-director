#!/usr/bin/env bash
# branch-flow-guard.selftest.sh — probe matrix for the enforcement hook.
# Every rule gets at least one deny probe and one allow probe; the hook runs
# in unit mode (env-injected state, no live git side effects). Mirrors the
# happier-platform selftest discipline: a guard without probes is a wish.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# 活动副本(本机 hooks-local)优先,仓库正式副本兜底 —— 两者须同步修改
HOOK="$ROOT/.agents/hooks-local/branch-flow-guard.sh"
[ -f "$HOOK" ] || HOOK="$ROOT/scripts/branch-flow-guard.sh"
PASS=0; FAIL=0

probe() { # name expect(0=allow,2=deny) env... -- payload
  local name="$1" expect="$2"; shift 2
  local envs=() ; while [ "$1" != "--" ]; do envs+=("$1"); shift; done; shift
  local out rc
  out=$(env "${envs[@]}" BRANCH_FLOW_UNIT=1 bash "$HOOK" <<< "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"$1\"}}" 2>&1); rc=$?
  if [ "$rc" = "$expect" ]; then PASS=$((PASS+1)); echo "ok   $name"
  else FAIL=$((FAIL+1)); echo "FAIL $name (rc=$rc want=$expect) ${out:0:120}"; fi
}

G="git"

# R1 main write protection
probe "R1 commit on main denied"        2 BRANCH_FLOW_BRANCH=main -- "$G commit -m x"
probe "R1 cherry-pick on main denied"   2 BRANCH_FLOW_BRANCH=main -- "$G cherry-pick abc"
probe "R1 rebase on main denied"        2 BRANCH_FLOW_BRANCH=main -- "$G rebase main"
probe "R1 reset on main denied"         2 BRANCH_FLOW_BRANCH=main -- "$G reset HEAD~1"
probe "R1 ff-only merge on main ok"     0 BRANCH_FLOW_BRANCH=main -- "$G merge --ff-only FETCH_HEAD"
probe "R1 plain merge on main denied"   2 BRANCH_FLOW_BRANCH=main -- "$G merge FETCH_HEAD"
probe "R1 commit on master ok"          0 BRANCH_FLOW_BRANCH=master -- "$G commit -m x"
probe "R1 read-only status ok"          0 BRANCH_FLOW_BRANCH=main -- "$G status"

# R2 i18n feat-first on master
probe "R2 locale staged w/o parity denied" 2 BRANCH_FLOW_BRANCH=master BRANCH_FLOW_STAGED=$'web/src/i18n/locales/zh-CN/editor.json' BRANCH_FLOW_FEAT_PARITY=0 -- "$G commit -m x"
probe "R2 locale staged with parity ok"    0 BRANCH_FLOW_BRANCH=master BRANCH_FLOW_STAGED=$'web/src/i18n/locales/zh-CN/editor.json' BRANCH_FLOW_FEAT_PARITY=1 -- "$G commit -m x"
probe "R2 non-i18n file ok"                0 BRANCH_FLOW_BRANCH=master BRANCH_FLOW_STAGED=$'web/src/components/Foo.tsx' -- "$G commit -m x"
probe "R2 i18n file on feat itself ok"     0 BRANCH_FLOW_BRANCH=feat/i18n-zh BRANCH_FLOW_STAGED=$'web/src/i18n/locales/zh-CN/editor.json' -- "$G commit -m x"

# R3 feat purity
probe "R3 fork doc onto feat denied"    2 BRANCH_FLOW_BRANCH=feat/i18n-zh BRANCH_FLOW_STAGED='docs/fork-branches.md' -- "$G commit -m x"
probe "R3 scanner onto feat denied"     2 BRANCH_FLOW_BRANCH=feat/i18n-zh BRANCH_FLOW_STAGED='scripts/fork-integrity.mjs' -- "$G commit -m x"
probe "R3 mediagen onto feat denied"    2 BRANCH_FLOW_BRANCH=feat/i18n-zh BRANCH_FLOW_STAGED='packages/mediagen-nodes/src/x.ts' -- "$G commit -m x"
probe "R3 i18n content on feat ok"      0 BRANCH_FLOW_BRANCH=feat/i18n-zh BRANCH_FLOW_STAGED='web/src/i18n/locales/en/x.json' -- "$G commit -m x"
probe "R3 fork doc on master ok"        0 BRANCH_FLOW_BRANCH=master BRANCH_FLOW_STAGED='docs/fork-branches.md' -- "$G commit -m x"

# R4 destructive
probe "R4 reset --hard denied"          2 BRANCH_FLOW_BRANCH=master -- "$G reset --hard HEAD~1"
probe "R4 branch -D denied"             2 BRANCH_FLOW_BRANCH=master -- "$G branch -D feat/x"
probe "R4 clean -f denied"              2 BRANCH_FLOW_BRANCH=master -- "$G clean -f"
probe "R4 push --force denied"          2 BRANCH_FLOW_BRANCH=master -- "$G push --force origin master"
probe "R4 force-with-lease ok"          0 BRANCH_FLOW_BRANCH=master -- "$G push --force-with-lease=master:abc123 origin master"
probe "R4 branch -d merged ok"          0 BRANCH_FLOW_BRANCH=master -- "$G branch -d feat/old"

# R5 push target
probe "R5 push to origin ok"            0 BRANCH_FLOW_BRANCH=master -- "$G push origin master"
probe "R5 push to upstream denied"      2 BRANCH_FLOW_BRANCH=master -- "$G push upstream master"

# R6 branch lock
LIVE_LOCK='{"scope":"111@aaaaaa","branch":"feat/i18n-zh","ts":'"$(( $(date +%s) - 600 ))"'}'
probe "R6 foreign live lock denied"     2 BRANCH_FLOW_BRANCH=master BRANCH_FLOW_SCOPE=222@bbbbbb BRANCH_FLOW_LOCK_JSON="$LIVE_LOCK" BRANCH_FLOW_LOCK_HOLDER_ALIVE=1 -- "$G checkout master"
probe "R6 same session ok"              0 BRANCH_FLOW_BRANCH=feat/i18n-zh BRANCH_FLOW_SCOPE=111@aaaaaa BRANCH_FLOW_LOCK_JSON="$LIVE_LOCK" BRANCH_FLOW_LOCK_HOLDER_ALIVE=1 -- "$G checkout master"
probe "R6 dead holder ok"               0 BRANCH_FLOW_BRANCH=master BRANCH_FLOW_SCOPE=222@bbbbbb BRANCH_FLOW_LOCK_JSON="$LIVE_LOCK" BRANCH_FLOW_LOCK_HOLDER_ALIVE=0 -- "$G checkout master"
OLD_LOCK='{"scope":"111@aaaaaa","branch":"feat/i18n-zh","ts":'"$(( $(date +%s) - 20000 ))"'}'
probe "R6 stale lock (>4h) ok"          0 BRANCH_FLOW_BRANCH=master BRANCH_FLOW_SCOPE=222@bbbbbb BRANCH_FLOW_LOCK_JSON="$OLD_LOCK" BRANCH_FLOW_LOCK_HOLDER_ALIVE=1 -- "$G checkout master"
probe "R6 no lock ok"                   0 BRANCH_FLOW_BRANCH=master -- "$G checkout master"

echo
echo "pass=$PASS fail=$FAIL"
[ $FAIL -eq 0 ]
