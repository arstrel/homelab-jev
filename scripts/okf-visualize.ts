import { parseArgs } from "node:util";
import { buildViewer } from "./okf-command.js";
import { serveViewer } from "./okf-server.js";

const { values } = parseArgs({
  options: {
    "no-open": { type: "boolean", default: false },
    port: { type: "string", default: "8770" },
  },
  allowPositionals: false,
});
const port = Number(values.port);
if (!/^\d+$/.test(values.port ?? "") || !Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("--port must be between 1 and 65535");
await serveViewer(buildViewer(), port, !values["no-open"]);
