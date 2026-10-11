import { TodoistApi } from "@doist/todoist-sdk";

export function todoistClient(token: string) {
  // Bound SDK requests; writes will additionally require durable intents in Section 4.
  const boundedFetch = async (input: string, init?: RequestInit) => {
    const response = await fetch(input, { ...init, signal: AbortSignal.timeout(5000) });
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
