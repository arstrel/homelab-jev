import { spawn } from "node:child_process";
import { createServer, type RequestListener } from "node:http";

// The server only has the built HTML in memory. It cannot serve repository paths.
export function viewerHandler(html: string): RequestListener {
  return (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    if (request.headers.host && !/^127\.0\.0\.1(?::\d+)?$/.test(request.headers.host)) {
      response.writeHead(403).end();
      return;
    }
    if (
      !["GET", "HEAD"].includes(request.method ?? "") ||
      !["/", "/viz.html"].includes(request.url ?? "")
    ) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(request.method === "HEAD" ? undefined : html);
  };
}
export async function serveViewer(html: string, port: number, open: boolean) {
  const server = createServer(viewerHandler(html));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const url = `http://127.0.0.1:${actualPort}/viz.html`;
  console.log(`OKF graph: ${url} (Ctrl-C to stop)`);
  if (open) {
    const command =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "explorer"
          : "xdg-open";
    const child = spawn(command, [url], { stdio: "ignore" });
    child.on("error", () => console.warn(`Open ${url} in your browser.`));
    child.on("exit", (code) => {
      if (code) console.warn(`Open ${url} in your browser.`);
    });
  }
  const close = () => server.close();
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  server.once("close", () => {
    process.off("SIGINT", close);
    process.off("SIGTERM", close);
  });
  return server;
}
