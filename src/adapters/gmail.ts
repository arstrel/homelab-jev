import { google } from "googleapis";
import type { googleAuth } from "./google.js";

export async function checkGmail(auth: ReturnType<typeof googleAuth>) {
  await google
    .gmail({ version: "v1", auth })
    .users.getProfile({ userId: "me" }, { timeout: 5000, retry: false });
}
