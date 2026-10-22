import { briefText } from "./brief-text.js";
import { todoistTaskLink } from "./todoist-brief.js";

export interface RetroEntry {
  key: string;
  taskId: string;
  at: string;
  basis: "updated" | "created" | "completed" | "comment";
  text: string;
  owner: boolean;
}
export interface RetroRead {
  entries: RetroEntry[];
  complete: boolean;
  scannedTasks: number;
  commentTasks: number;
  undated: number;
  omittedEntries: number;
  attachments: number;
  foreignAuthors: number;
}
export type RetroContext =
  | ({ state: "available"; since: string; until: string; readAt: string } & RetroRead)
  | {
      state: "unavailable";
      since: string;
      until: string;
      readAt: null;
      reason: "missing-retro" | "ambiguous-retro" | "todoist-unavailable" | "read-failed";
    };

export function renderRetroContext(context: RetroContext) {
  const lines = [
    "## Retro feedback",
    "",
    `Source window: ${context.since} through ${context.until}.`,
    "",
  ];
  if (context.state === "unavailable") {
    lines.push(
      `Retro context unavailable: ${context.reason}. No successful empty feedback read is claimed.`,
      "",
    );
    return { markdown: lines.join("\n"), entries: [] as RetroEntry[], complete: false };
  }
  lines.push(
    `Read completed: ${context.readAt}. Coverage: ${context.complete ? "complete within the stated bounded scan" : "INCOMPLETE"}.`,
    `Source tasks scanned: ${context.scannedTasks}; tasks with comments scanned: ${context.commentTasks}; omitted feedback records: ${context.omittedEntries}; undated records: ${context.undated}; unread attachments: ${context.attachments}; non-owner/unknown-author records: ${context.foreignAuthors}.`,
    "Limits: 200 open and 200 completed source tasks, comments on ten distinct tasks (100 comments each), ten feedback records. Older unscanned task comments may be absent. Source change/completion dates are not inferred activity dates. Completing a Retro entry does not complete any other task.",
    "",
  );
  const entries: RetroEntry[] = [];
  let bytes = Buffer.byteLength(lines.join("\n"));
  for (const entry of context.entries) {
    const excerpt = briefText(entry.text);
    const line = `- [Retro source](${todoistTaskLink(entry.taskId)}) — ${entry.at} (${entry.basis}; author ${entry.owner ? "owner" : "unknown/other"}); excerpt: ${excerpt}${entry.text.length > 300 ? " [excerpt shortened; read source]" : ""}.\n`;
    if (bytes + Buffer.byteLength(line) > 10_000) continue;
    bytes += Buffer.byteLength(line) + 1;
    lines.push(line);
    entries.push(entry);
  }
  const omitted = context.entries.length - entries.length;
  lines.push(
    `Displayed feedback records: ${entries.length}; omitted by display bound: ${omitted}.`,
    "",
  );
  if (!entries.length)
    lines.push(
      "_No dated feedback records returned within this bounded window; consult coverage above._",
      "",
    );
  return { markdown: lines.join("\n"), entries, complete: context.complete && omitted === 0 };
}
