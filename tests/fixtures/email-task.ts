import type { TaskConversation, TaskProject, TaskReview } from "../../src/domain/email-task.js";
import { emailTaskVersion } from "../../src/domain/email-task.js";
import { fingerprint } from "../../src/domain/mail-evidence.js";
import { threadRead } from "./mail.js";

export const taskProjects: TaskProject[] = [
  { id: "inbox", name: "Inbox", description: "", inbox: true },
  { id: "home", name: "Home", description: "Home maintenance", inbox: false },
  { id: "retro", name: "Retro", description: "Daily reflections", inbox: false },
];
export function taskConversation(id = "t-boiler"): TaskConversation {
  const read = threadRead(id);
  // This fixture represents an unanswered incoming request.
  read.evidence.messages.splice(1);
  return { evidence: read.evidence, directions: ["incoming"] };
}
export function taskResponse(action = "a0", project = "p1") {
  return {
    model: "jev-1.13.0",
    answers: {
      action: { type: "choice", choice: action, confidence: 1, probabilities: { [action]: 1 } },
      project: { type: "choice", choice: project, confidence: 1, probabilities: { [project]: 1 } },
    },
    usage: { input_tokens: 10, output_tokens: 4 },
  };
}
export function taskReview(ids = ["t-boiler"]): TaskReview {
  return {
    version: emailTaskVersion,
    createdAt: "2026-10-19T12:00:00.000Z",
    retroIds: ["retro"],
    candidates: ids.map((sourceId) => ({
      sourceId,
      fingerprint: fingerprint(taskConversation(sourceId).evidence),
      title: "Please send two dates for the boiler inspection.",
      projectId: "home",
      projectName: "Home",
    })),
  };
}
