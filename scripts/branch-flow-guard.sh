#!/usr/bin/env bash
# branch-flow-guard.sh — PreToolUse(Bash) hook. Mechanical enforcement of
# docs/fork-branches.md, modeled on the happier-platform branch-flow-guard:
# the governance doc states the rules, THIS hook makes a CC session unable
# to break them. Rules (numbers match the doc's §5):
#   R1 main 写保护      — commit/cherry-pick/rebase/reset on main denied;
#                         merge on main only with --ff-only (the §3.1 sync path)
#   R2 i18n feat-first  — committing i18n content (web/src/i18n/**) on master
#                         requires the exact blobs to already exist on
#                         feat/i18n-zh (2026-10-21 incident: repeated
#                         master-first i18n rounds violating rule 5)
#   R3 feat 纯度        — on feat/i18n-zh: fork-governance files and the
#                         mediagen pack are off-limits (红线, 2026-10-12)
#   R4 破坏性 git       — reset --hard / branch -D / clean -f / push --force
#                         denied (--force-with-lease allowed)
#   R5 push 目标        — pushes only to origin
#   R6 分支锁           — a checkout by a different LIVE session within 4h
#                         is denied until coordinated (SendMessage first)
# Unit mode for the selftest: BRANCH_FLOW_UNIT=1 with env-provided state.
set -uo pipefail

CMD=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.tool_input?.command??"")}catch{console.log("")}})')
[ -z "$CMD" ] && exit 0

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOC="docs/fork-branches.md §5 (branch-flow-guard)"
deny() { printf '%s\n' "⛔ 分支治理拦截($1): $2" "  合规路径: $3" "  规则文档: $DOC" >&2; exit 2; }

# ---- what git operation is this? -------------------------------------------
read -r -a TOKS <<< "$(printf '%s' "$CMD" | tr '|' ' ')"
first="${TOKS[0]}"; [ "${first##*/}" = "git" ] || exit 0
sub=""; i=1
while [ $i -lt ${#TOKS[@]} ]; do
  t="${TOKS[$i]}"
  case "$t" in
    -C) i=$((i+2)); continue ;;
    -*) ;;
    *) sub="$t"; break ;;
  esac
  i=$((i+1))
done
[ -z "$sub" ] && exit 0
args="${TOKS[*]:$((i+1))}"

# ---- context (live, or env-injected in unit mode) --------------------------
UNIT="${BRANCH_FLOW_UNIT:-0}"
if [ "$UNIT" = "1" ]; then
  BRANCH="${BRANCH_FLOW_BRANCH:-}"
  STAGED="${BRANCH_FLOW_STAGED:-}"
  SCOPE="${BRANCH_FLOW_SCOPE:-unit-scope}"
  LOCK_JSON="${BRANCH_FLOW_LOCK_JSON:-}"
else
  BRANCH="$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null || true)"
  STAGED="$(git -C "$REPO_ROOT" diff --cached --name-only 2>/dev/null || true)"
  CG="$(cat /proc/self/cgroup 2>/dev/null | awk -F: '{print $3}' | head -1)"
  SCOPE="$(printf '%s' "$CG" | grep -oE '[0-9]+' | head -1)${CG:+@$(printf '%s' "$CG" | md5sum | cut -c1-6)}"
  LOCK_JSON="$(cat "$REPO_ROOT/.git/branch-lock.json" 2>/dev/null || true)"
fi

I18N_RE='^web/src/i18n/'
GOV_FILES=" docs/fork-branches.md docs/fork-index.yaml scripts/fork-integrity.mjs .github/workflows/fork-integrity.yml .github/workflows/web-tsc-gate.yml "

case "$sub" in
  # ---- R1: main is pull-only ----------------------------------------------
  commit|cherry-pick|rebase|reset)
    [ "$BRANCH" = "main" ] && deny R1 "main 只进不出,禁在 main 上 $sub" "§3.1:fetch upstream → main 上 merge --ff-only → 合并进 master"
    ;;&
  merge)
    if [ "$BRANCH" = "main" ] && ! printf '%s' "$CMD" | grep -q -- '--ff-only'; then
      deny R1 "main 上只许 fast-forward 合并(--ff-only)" "§3.1 步骤②:git merge --ff-only FETCH_HEAD"
    fi
    ;;&
  commit|merge|cherry-pick)
    # ---- R2: i18n content on master must already exist on feat -------------
    if [ "$BRANCH" = "master" ] && [ -n "$STAGED" ]; then
      bad=""
      while IFS= read -r f; do
        printf '%s' "$f" | grep -qE "$I18N_RE" || continue
        if [ "$UNIT" = "1" ]; then
          [ "${BRANCH_FLOW_FEAT_PARITY:-0}" = "1" ] || bad="$bad $f"
        else
          sb="$(git -C "$REPO_ROOT" rev-parse --verify ":$f" 2>/dev/null || echo none)"
          fb="$(git -C "$REPO_ROOT" rev-parse --verify "feat/i18n-zh:$f" 2>/dev/null || echo missing)"
          [ "$sb" = "$fb" ] || bad="$bad $f"
        fi
      done <<< "$STAGED"
      [ -n "$bad" ] && deny R2 "i18n 内容必须先落在 feat/i18n-zh,以下暂存文件与 feat 不一致:$bad" "先在 feat/i18n-zh 提交并推送,再回 master 执行 git checkout feat/i18n-zh -- <文件> 后提交"
    fi
    # ---- R3: feat purity ----------------------------------------------------
    if [ "$BRANCH" = "feat/i18n-zh" ] && [ -n "$STAGED" ]; then
      bad=""
      while IFS= read -r f; do
        case "$f" in
          packages/mediagen-nodes/*) bad="$bad $f[扩展包红线]" ;;
          *) printf '%s' "$GOV_FILES" | grep -q " $f " && bad="$bad $f[治理文件]" ;;
        esac
      done <<< "$STAGED"
      [ -n "$bad" ] && deny R3 "feat/i18n-zh 是纯净贡献分支,以下文件禁入:$bad" "治理/扩展内容属于 master;从本分支的暂存区移除它们"
    fi
    ;;
  # ---- R4: destructive ------------------------------------------------------
  reset|branch|clean)
    case "$CMD" in
      *"reset --hard"*) deny R4 "reset --hard 会抹掉未提交工作" "git stash → reset → stash pop;或逐文件 checkout" ;;
      *"branch -D"*)    deny R4 "branch -D 强删未合并分支" "git branch -d(已合并才许删);确要废弃先打 backup/ 前缀标签" ;;
      *"clean -f"*)     deny R4 "clean -f 不可逆删除未跟踪文件" "git clean -n 先列清单,逐个处理" ;;
    esac
    ;;
  push)
    # R4 force + R5 remote policy
    printf '%s' "$CMD" | grep -qE -- '--force([ =]|$)' && ! printf '%s' "$CMD" | grep -q -- '--force-with-lease' && \
      deny R4 "push --force 改写远端历史" "--force-with-lease=<分支>:<期望oid>(§2 铁律 7)"
    rt=""
    for t in "${TOKS[@]:$((i+1))}"; do
      case "$t" in -*) ;; *) rt="$t"; break ;; esac
    done
    rt="${rt:-origin}"
    case "$rt" in origin) ;; *) deny R5 "推送目标只能是 origin,当前:$rt" "§1 表:所有分支仅推自己的 origin" ;; esac
    ;;
  # ---- R6: branch lock ------------------------------------------------------
  checkout|switch)
    tgt=""
    for t in "${TOKS[@]:$((i+1))}"; do
      case "$t" in -b|-B|--) ;; *) tgt="$t"; break ;; esac
    done
    [ -z "$tgt" ] && exit 0
    if [ -n "$LOCK_JSON" ]; then
      lk_scope="$(printf '%s' "$LOCK_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.scope||"")}catch{console.log("")}})')"
      lk_branch="$(printf '%s' "$LOCK_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.branch||"")}catch{console.log("")}})')"
      lk_ts="$(printf '%s' "$LOCK_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.ts||0)}catch{console.log(0)}})')"
      now=$(date +%s); age=$(( now - lk_ts ))
      if [ -n "$lk_scope" ] && [ "$lk_scope" != "$SCOPE" ] && [ "$lk_branch" != "$tgt" ] && [ $age -lt 14400 ]; then
        if [ "$UNIT" = "1" ]; then
          [ "${BRANCH_FLOW_LOCK_HOLDER_ALIVE:-1}" = "1" ] && deny R6 "分支 $lk_branch 正被另一会话占用(锁龄 $((age/60)) 分钟<4h)" "SendMessage 与占用会话协调,或等其释放;陈锁可 rm .git/branch-lock.json(先确认对方已退出)"
        else
          lk_pid="${lk_scope%%@*}"
          if [ -d "/proc/$lk_pid" ]; then
            deny R6 "分支 $lk_branch 正被另一会话(pid $lk_pid)占用(锁龄 $((age/60)) 分钟<4h)" "SendMessage 与占用会话协调,或等其释放;陈锁可 rm .git/branch-lock.json(先确认对方已退出)"
          fi
        fi
      fi
    fi
    [ "$UNIT" = "0" ] && printf '{"scope":"%s","branch":"%s","ts":%s}' "$SCOPE" "$tgt" "$(date +%s)" > "$REPO_ROOT/.git/branch-lock.json"
    ;;
esac
exit 0
