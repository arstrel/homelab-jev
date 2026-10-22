import { Readable } from "node:stream";
import { google } from "googleapis";
import { z } from "zod";
import type { BriefDrive } from "../application/email-brief.js";
import type { MailBudget } from "../application/mail-budget.js";
import type { BriefPublication } from "../domain/email-brief.js";
import type { googleAuth } from "./google.js";

const owner = "homelab-jev:email-brief:primary:v1";
const metadata = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  trashed: z.boolean(),
  appProperties: z.record(z.string(), z.string()).optional(),
});
function notFound(error: unknown) {
  return (
    typeof error === "object" && error !== null && "code" in error && Number(error.code) === 404
  );
}
export function driveBrief(auth: ReturnType<typeof googleAuth>, budget: MailBudget): BriefDrive {
  const drive = google.drive({ version: "v3", auth });
  const options = () => ({ ...budget.requestOptions(), maxContentLength: 65_536 });
  const get = async (fileId: string) => {
    try {
      const response = await budget.read(() =>
        drive.files.get({ fileId, fields: "id,name,mimeType,trashed,appProperties" }, options()),
      );
      const value = metadata.parse(response.data);
      if (
        value.id !== fileId ||
        value.trashed ||
        value.name !== "jev-current.md" ||
        value.mimeType !== "text/markdown" ||
        value.appProperties?.jevOwner !== owner
      )
        throw new Error("drive-ownership-mismatch");
      return value;
    } catch (error) {
      if (notFound(error)) return undefined;
      throw error;
    }
  };
  return {
    async allocate() {
      const result = await budget.read(() =>
        drive.files.generateIds({ count: 1, space: "drive", type: "files" }, options()),
      );
      const id = result.data.ids?.[0];
      if (!id || !/^[A-Za-z0-9_-]{10,200}$/.test(id)) throw new Error("invalid-drive-id");
      return id;
    },
    async write(destination: BriefPublication, generation: string, markdown: string) {
      if (Buffer.byteLength(markdown) > 65_536) throw new Error("brief-too-large");
      const existing = await get(destination.fileId);
      if (!existing && destination.lastPublished) throw new Error("published-drive-file-missing");
      const requestBody = {
        name: "jev-current.md",
        mimeType: "text/markdown",
        appProperties: { jevOwner: owner, jevGeneration: generation },
      };
      const media = { mimeType: "text/markdown", body: Readable.from([markdown]) };
      if (existing)
        await budget.read(() =>
          drive.files.update(
            { fileId: destination.fileId, requestBody, media, fields: "id" },
            options(),
          ),
        );
      else
        await budget.read(() =>
          drive.files.create(
            { requestBody: { ...requestBody, id: destination.fileId }, media, fields: "id" },
            options(),
          ),
        );
      const confirmed = await get(destination.fileId);
      if (confirmed?.appProperties?.jevGeneration !== generation)
        throw new Error("drive-generation-mismatch");
      const content = await budget.read(() =>
        drive.files.get(
          { fileId: destination.fileId, alt: "media" },
          { ...options(), responseType: "text" },
        ),
      );
      if (content.data !== markdown) throw new Error("drive-content-mismatch");
    },
  };
}
