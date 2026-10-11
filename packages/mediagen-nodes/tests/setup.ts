import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Every suite shares a throwaway budget-state file so tests never touch the
// developer's real ~/.local/share/nodetool/mediagen-budget.json.
process.env.MEDIAGEN_BUDGET_STATE_PATH = join(mkdtempSync(join(tmpdir(), "mediagen-budget-")), "state.json");
