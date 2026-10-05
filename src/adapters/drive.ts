import { google } from "googleapis";
import type { googleAuth } from "./google.js";

export async function checkDrive(auth: ReturnType<typeof googleAuth>) {
  await google
    .drive({ version: "v3", auth })
    .files.list({ pageSize: 1, fields: "files(id)" }, { timeout: 5000, retry: false });
}
