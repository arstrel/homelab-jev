import {
  type BriefDecision,
  type BriefEntry,
  type BriefPublication,
  briefInputHash,
  briefModel,
  briefPolicy,
  briefSource,
  type CaptureAnnotation,
  type CaptureRun,
  renderEmailBrief,
  type SavedBriefDecision,
  savedBriefSchema,
} from "../domain/email-brief.js";
import type { TaskConversation } from "../domain/email-task.js";
import { taskExclusion } from "../domain/email-task.js";
import { TriageError, triageResult, triageState } from "../domain/mail-triage.js";
import { type RetroContext, type RetroRead, renderRetroContext } from "../domain/retro.js";
import { type RetroRequest, renderRetroReview, retroResult } from "../domain/retro-review.js";
import {
  renderTodoistContext,
  type TodoistBriefContext,
  type TodoistBriefInventory,
} from "../domain/todoist-brief.js";
import { MailBudget } from "./mail-budget.js";
import type { MailStatusReader, MailTriage, Runtime } from "./ports.js";
import { reviewRetro } from "./review-retro.js";

export interface BriefRecord {
  jobId: string;
  fingerprint: string;
  sourceId: string;
  conversation?: TaskConversation;
  saved?: unknown;
  capture?: CaptureAnnotation;
}
export interface BriefSession {
  sample(
    since: string,
    until: string,
    limit: number,
    jobId?: string,
  ): Promise<{ eligible: number; records: BriefRecord[] }>;
  save(record: BriefRecord, saved: SavedBriefDecision): Promise<void>;
  destination(): Promise<BriefPublication | undefined>;
  reserve(fileId: string): Promise<BriefPublication>;
  publishing(): Promise<void>;
  published(fileId: string, generation: string, at: string): Promise<void>;
}
export interface BriefDatabase {
  exclusive<T>(
    run: (session: BriefSession, signal: AbortSignal) => Promise<T>,
  ): Promise<T | undefined>;
}
export interface BriefDrive {
  allocate(): Promise<string>;
  write(destination: BriefPublication, generation: string, markdown: string): Promise<void>;
}
export interface BriefOptions {
  maxConversations: number;
  days: number;
  maxNew: number;
  retroReview?: boolean;
  classifyPending?: boolean;
  captureTasks?: boolean;
}
export function validateBriefOptions(o: BriefOptions) {
  if (
    !Number.isInteger(o.maxConversations) ||
    o.maxConversations < 1 ||
    o.maxConversations > 20 ||
    !Number.isInteger(o.days) ||
    o.days < 1 ||
    o.days > 30 ||
    !Number.isInteger(o.maxNew) ||
    o.maxNew < 0 ||
    o.maxNew > 20 ||
    (o.retroReview !== undefined && typeof o.retroReview !== "boolean") ||
    (o.classifyPending !== undefined && typeof o.classifyPending !== "boolean") ||
    (o.classifyPending && (o.maxNew !== 0 || o.retroReview)) ||
    (o.captureTasks !== undefined && typeof o.captureTasks !== "boolean") ||
    (o.captureTasks && !o.classifyPending)
  )
    throw new Error("Invalid brief options");
}
export async function publishEmailBrief(
  options: BriefOptions,
  deps: {
    database: BriefDatabase;
    status: MailStatusReader;
    triage: MailTriage;
    drive: (budget: MailBudget) => BriefDrive;
    todoist?: (budget: MailBudget) => { read(): Promise<TodoistBriefInventory> };
    retro?: (budget: MailBudget) => {
      read(projectId: string, since: string, until: string): Promise<RetroRead>;
    };
    retroJudge?: (request: RetroRequest, signal: AbortSignal) => Promise<unknown>;
    clock: Runtime;
    captureRun?: CaptureRun;
    signal?: AbortSignal;
  },
) {
  validateBriefOptions(options);
  const counts = {
    selected: 0,
    eligible: 0,
    newRequests: 0,
    classified: 0,
    cached: 0,
    excluded: 0,
    failed: 0,
    capped: 0,
    inputTokens: 0,
    outputTokens: 0,
    todoist: {
      state: "not-read" as "not-read" | "available" | "unavailable",
      projects: 0,
      tasks: 0,
      shown: 0,
      displayOmitted: 0,
      complete: false,
    },
    retro: {
      state: "not-read" as "not-read" | "available" | "unavailable",
      entries: 0,
      complete: false,
      reviewRequested: options.retroReview ?? false,
      reviewComplete: false,
      suggestions: 0,
      newRequests: 0,
    },
  };
  let phase = "selection";
  try {
    const outcome = await deps.database.exclusive(async (session, ownershipSignal) => {
      const signal = deps.signal
        ? AbortSignal.any([deps.signal, ownershipSignal])
        : ownershipSignal;
      const budget = new MailBudget({ maxRequests: 70 }, signal);
      try {
        budget.assertActive();
        const now = deps.clock.now();
        const until = now.toISOString();
        const since = new Date(now.getTime() - options.days * 86_400_000).toISOString();
        const status = await deps.status.read(now);
        if (status.schemaState !== "ready") throw new Error("schema-not-ready");
        const sample = await session.sample(since, until, options.maxConversations);
        if (sample.records.length > options.maxConversations) throw new Error("invalid-selection");
        counts.selected = sample.records.length;
        counts.eligible = sample.eligible;
        const entries: BriefEntry[] = [];
        phase = "classification";
        for (const record of sample.records) {
          budget.assertActive();
          if (!record.conversation) {
            counts.failed++;
            entries.push({
              sourceId: record.sourceId,
              subject: "(Stored evidence unavailable)",
              receivedAt: null,
              failure: "invalid-evidence",
            });
            continue;
          }
          const conversation = record.conversation;
          const entry: BriefEntry = {
            ...briefSource(conversation),
            ...(record.capture ? { capture: record.capture } : {}),
          };
          const hash = briefInputHash(record.fingerprint, conversation.directions);
          const rule = taskExclusion(conversation);
          let decision: BriefDecision | undefined;
          if (record.saved !== undefined) {
            const cached = savedBriefSchema.safeParse(record.saved);
            if (!cached.success && !rule) {
              entry.failure = "invalid-cache";
            } else if (
              cached.success &&
              cached.data.inputHash === hash &&
              (rule
                ? cached.data.decision.type === "owner-rule" && cached.data.decision.reason === rule
                : cached.data.decision.type === "jev")
            ) {
              decision = cached.data.decision;
              counts.cached++;
            }
          }
          if (!decision && !entry.failure) {
            if (rule) decision = { type: "owner-rule", reason: rule };
            else if (counts.newRequests >= options.maxNew) {
              entry.failure = "new-call-cap";
              counts.capped++;
            } else {
              try {
                const state = triageState(conversation.evidence, conversation.directions);
                counts.newRequests++;
                const raw = await budget.read(() =>
                  deps.triage.judge(state, briefModel, budget.signal),
                );
                budget.assertActive();
                const result = triageResult(raw, briefModel);
                const input = counts.inputTokens + result.usage.input_tokens;
                const output = counts.outputTokens + result.usage.output_tokens;
                if (!Number.isSafeInteger(input) || !Number.isSafeInteger(output))
                  throw new TriageError("invalid-result");
                decision = { type: "jev", result };
                counts.inputTokens = input;
                counts.outputTokens = output;
              } catch (error) {
                if (budget.signal.aborted) throw error;
                entry.failure =
                  error instanceof TriageError
                    ? error.reason === "missing-evidence"
                      ? "invalid-evidence"
                      : error.reason
                    : "provider-error";
              }
            }
            if (decision) {
              phase = "classification-save";
              await session.save(record, { policy: briefPolicy, inputHash: hash, decision });
              phase = "classification";
              if (decision.type === "jev") counts.classified++;
            }
          }
          if (decision?.type === "owner-rule") counts.excluded++;
          if (decision) entry.decision = decision;
          if (entry.failure && entry.failure !== "new-call-cap") counts.failed++;
          entries.push(entry);
        }
        phase = "todoist";
        budget.assertActive();
        const startedAt = deps.clock.now().toISOString();
        let context: TodoistBriefContext;
        try {
          if (deps.todoist) {
            const inventory = await deps.todoist(budget).read();
            budget.assertActive();
            context = {
              ...inventory,
              state: "available",
              startedAt,
              readAt: deps.clock.now().toISOString(),
            };
          } else
            context = { state: "unavailable", startedAt, readAt: null, reason: "missing-token" };
        } catch {
          budget.assertActive();
          context = { state: "unavailable", startedAt, readAt: null, reason: "read-failed" };
        }
        const todoist = renderTodoistContext(context);
        counts.todoist = {
          state: context.state,
          projects: context.state === "available" ? context.projects.length : 0,
          tasks: context.state === "available" ? context.tasks.length : 0,
          shown: todoist.tasks.length,
          displayOmitted: todoist.omitted,
          complete: todoist.complete,
        };
        phase = "retro";
        budget.assertActive();
        let retroContext: RetroContext;
        const retroIds = context.state === "available" ? (context.retroProjectIds ?? []) : [];
        const retroSince = new Date(now.getTime() - 7 * 86_400_000).toISOString();
        try {
          if (context.state !== "available" || !deps.retro)
            retroContext = {
              state: "unavailable",
              since: retroSince,
              until,
              readAt: null,
              reason: "todoist-unavailable",
            };
          else if (retroIds.length !== 1)
            retroContext = {
              state: "unavailable",
              since: retroSince,
              until,
              readAt: null,
              reason: retroIds.length ? "ambiguous-retro" : "missing-retro",
            };
          else {
            const data = await deps.retro(budget).read(retroIds[0] as string, retroSince, until);
            budget.assertActive();
            retroContext = {
              ...data,
              state: "available",
              since: retroSince,
              until,
              readAt: deps.clock.now().toISOString(),
            };
          }
        } catch {
          budget.assertActive();
          retroContext = {
            state: "unavailable",
            since: retroSince,
            until,
            readAt: null,
            reason: "read-failed",
          };
        }
        const retro = renderRetroContext(retroContext);
        counts.retro = {
          ...counts.retro,
          state: retroContext.state,
          entries: retro.entries.length,
          complete: retro.complete,
        };
        phase = "retro-review";
        const review = await reviewRetro(
          retro.entries,
          todoist.tasks,
          options.retroReview ?? false,
          retro.complete && todoist.complete,
          async (request) => {
            budget.assertActive();
            const judge = deps.retroJudge;
            if (counts.newRequests >= options.maxNew || !judge) return undefined;
            counts.newRequests++;
            counts.retro.newRequests++;
            const raw = await budget.read(() => judge(request, budget.signal));
            budget.assertActive();
            const result = retroResult(raw, request);
            const input = counts.inputTokens + result.usage.input_tokens,
              output = counts.outputTokens + result.usage.output_tokens;
            if (!Number.isSafeInteger(input) || !Number.isSafeInteger(output))
              throw new Error("invalid-result");
            counts.inputTokens = input;
            counts.outputTokens = output;
            return raw;
          },
          budget.signal,
        );
        const retroReview = renderRetroReview(review);
        counts.retro.reviewComplete = retroReview.complete;
        counts.retro.suggestions = review.suggestions.length;
        budget.assertActive();
        phase = "publication";
        budget.assertActive();
        const drive = deps.drive(budget);
        let destination = await session.destination();
        if (!destination) destination = await session.reserve(await drive.allocate());
        const generation = deps.clock.id();
        const generatedAt = deps.clock.now().toISOString();
        const markdown = renderEmailBrief({
          generation,
          generatedAt,
          since,
          until,
          eligible: sample.eligible,
          status,
          entries,
          ...(deps.captureRun ? { captureRun: deps.captureRun } : {}),
          todoist,
          retro,
          retroReview: retroReview.markdown,
        });
        await session.publishing();
        await drive.write(destination, generation, markdown);
        budget.assertActive();
        phase = "publication-save";
        await session.published(destination.fileId, generation, deps.clock.now().toISOString());
        return {
          ...counts,
          published: true,
          generation,
          url: `https://drive.google.com/file/d/${destination.fileId}/view`,
          overlapping: false,
          exitCode:
            counts.failed ||
            counts.capped ||
            !todoist.complete ||
            !retro.complete ||
            (options.retroReview && !retroReview.complete)
              ? 1
              : 0,
        };
      } finally {
        budget.close();
      }
    });
    return outcome ?? { ...counts, published: false, overlapping: true, exitCode: 0 };
  } catch {
    return {
      ...counts,
      published: false,
      overlapping: false,
      failure: deps.signal?.aborted ? "cancelled" : phase,
      exitCode: 1,
    };
  }
}
