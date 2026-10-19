import { TodoistApi } from "@doist/todoist-sdk";

export function todoistClient(token: string, signal?: AbortSignal) {
  const boundedFetch = async (input: string, init?: RequestInit) => {
    let response: Response;
    try {
      const timeout = AbortSignal.timeout(5000);
      response = await fetch(input, {
        ...init,
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
    } catch {
      // The SDK retries network errors by default. Keep explicit reviewed writes single-attempt.
      throw new Error("Todoist transport unavailable");
    }
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      text: () => response.clone().text(),
      json: () => response.json(),
      arrayBuffer: () => response.arrayBuffer(),
    };
  };
  return new TodoistApi(token, { customFetch: boundedFetch });
}
export async function checkTodoist(token: string) {
  const projects = await todoistClient(token).getProjects({ limit: 1 });
  return { projects: projects.results.length };
}
