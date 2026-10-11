CREATE SCHEMA "jev";
--> statement-breakpoint
CREATE TABLE "jev"."checkpoints" (
	"mailbox" text PRIMARY KEY NOT NULL,
	"history_id" text NOT NULL,
	"synced_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jev"."classifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"model_version" text NOT NULL,
	"result" jsonb NOT NULL,
	"correction" jsonb,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jev"."pending_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mailbox" text NOT NULL,
	"source_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"policy_version" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	CONSTRAINT "job_attempts_nonnegative" CHECK ("jev"."pending_jobs"."attempts" >= 0),
	CONSTRAINT "job_state" CHECK ("jev"."pending_jobs"."state" in ('pending','complete'))
);
--> statement-breakpoint
CREATE TABLE "jev"."sources" (
	"mailbox" text NOT NULL,
	"source_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "sources_mailbox_source_id_pk" PRIMARY KEY("mailbox","source_id")
);
--> statement-breakpoint
CREATE TABLE "jev"."suppressions" (
	"obligation_key" text PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "suppression_reason" CHECK ("jev"."suppressions"."reason" in ('completed','deleted'))
);
--> statement-breakpoint
CREATE TABLE "jev"."task_links" (
	"mailbox" text NOT NULL,
	"source_id" text NOT NULL,
	"obligation_key" text NOT NULL,
	"task_id" text NOT NULL,
	"overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "task_links_mailbox_source_id_obligation_key_pk" PRIMARY KEY("mailbox","source_id","obligation_key")
);
--> statement-breakpoint
CREATE TABLE "jev"."write_intents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"destination" text NOT NULL,
	"obligation_key" text NOT NULL,
	"request_id" uuid NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"outcome" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "intent_state" CHECK ("jev"."write_intents"."state" in ('pending','ambiguous','complete')),
	CONSTRAINT "intent_destination" CHECK ("jev"."write_intents"."destination" in ('todoist','drive'))
);
--> statement-breakpoint
ALTER TABLE "jev"."classifications" ADD CONSTRAINT "classifications_job_id_pending_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jev"."pending_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jev"."pending_jobs" ADD CONSTRAINT "pending_jobs_mailbox_source_id_sources_mailbox_source_id_fk" FOREIGN KEY ("mailbox","source_id") REFERENCES "jev"."sources"("mailbox","source_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jev"."task_links" ADD CONSTRAINT "task_links_mailbox_source_id_sources_mailbox_source_id_fk" FOREIGN KEY ("mailbox","source_id") REFERENCES "jev"."sources"("mailbox","source_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_source_policy" ON "jev"."pending_jobs" USING btree ("mailbox","source_id","fingerprint","policy_version");--> statement-breakpoint
CREATE UNIQUE INDEX "intent_request" ON "jev"."write_intents" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "intent_obligation_destination" ON "jev"."write_intents" USING btree ("obligation_key","destination");