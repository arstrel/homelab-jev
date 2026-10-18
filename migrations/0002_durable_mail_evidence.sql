CREATE TABLE "jev"."mail_evidence_versions" (
	"mailbox" text NOT NULL,
	"source_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"schema_version" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "mail_evidence_versions_mailbox_source_id_fingerprint_pk" PRIMARY KEY("mailbox","source_id","fingerprint"),
	CONSTRAINT "evidence_identity" CHECK (coalesce("jev"."mail_evidence_versions"."evidence"->'source'->>'mailbox' = "jev"."mail_evidence_versions"."mailbox" and "jev"."mail_evidence_versions"."evidence"->'source'->>'threadId' = "jev"."mail_evidence_versions"."source_id" and "jev"."mail_evidence_versions"."evidence"->>'schemaVersion' = "jev"."mail_evidence_versions"."schema_version", false)),
	CONSTRAINT "evidence_complete" CHECK (coalesce("jev"."mail_evidence_versions"."schema_version" = 'mail-evidence/v1' and "jev"."mail_evidence_versions"."evidence"->'coverage'->>'messageBodies' = 'complete', false))
);
--> statement-breakpoint
ALTER TABLE "jev"."pending_jobs" ADD COLUMN "evidence_fingerprint" text;--> statement-breakpoint
ALTER TABLE "jev"."sources" ADD COLUMN "observation" jsonb;--> statement-breakpoint
ALTER TABLE "jev"."mail_evidence_versions" ADD CONSTRAINT "mail_evidence_versions_mailbox_source_id_sources_mailbox_source_id_fk" FOREIGN KEY ("mailbox","source_id") REFERENCES "jev"."sources"("mailbox","source_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jev"."pending_jobs" ADD CONSTRAINT "pending_jobs_mailbox_source_id_evidence_fingerprint_mail_evidence_versions_mailbox_source_id_fingerprint_fk" FOREIGN KEY ("mailbox","source_id","evidence_fingerprint") REFERENCES "jev"."mail_evidence_versions"("mailbox","source_id","fingerprint") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jev"."pending_jobs" ADD CONSTRAINT "job_evidence_identity" CHECK ("jev"."pending_jobs"."evidence_fingerprint" is null or "jev"."pending_jobs"."evidence_fingerprint" = "jev"."pending_jobs"."fingerprint");
--> statement-breakpoint
-- Immutable evidence is retained for exact pending-job replay.
CREATE FUNCTION "jev"."reject_mail_evidence_update"() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN
  RAISE EXCEPTION 'mail evidence versions are immutable';
END; $$;
--> statement-breakpoint
CREATE TRIGGER "mail_evidence_immutable" BEFORE UPDATE ON "jev"."mail_evidence_versions"
FOR EACH ROW EXECUTE FUNCTION "jev"."reject_mail_evidence_update"();
