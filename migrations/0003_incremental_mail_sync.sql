CREATE TABLE "jev"."mail_retrievals" (
	"mailbox" text NOT NULL,
	"thread_id" text NOT NULL,
	"generation" integer DEFAULT 1 NOT NULL,
	"from_history" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"failure" text,
	CONSTRAINT "mail_retrievals_mailbox_thread_id_pk" PRIMARY KEY("mailbox","thread_id"),
	CONSTRAINT "retrieval_counters" CHECK ("jev"."mail_retrievals"."generation" > 0 and "jev"."mail_retrievals"."attempts" >= 0 and "jev"."mail_retrievals"."from_history" in (0,1))
);
--> statement-breakpoint
CREATE TABLE "jev"."mail_sync_state" (
	"mailbox" text PRIMARY KEY NOT NULL,
	"phase" text NOT NULL,
	"days" integer NOT NULL,
	"window_since" timestamp with time zone NOT NULL,
	"window_until" timestamp with time zone NOT NULL,
	"history_id" text NOT NULL,
	"page_token" text,
	"seen_tokens" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"discovery_checked_at" timestamp with time zone,
	"evidence_synced_at" timestamp with time zone,
	CONSTRAINT "sync_phase" CHECK ("jev"."mail_sync_state"."phase" in ('bootstrap','history','recovery-required')),
	CONSTRAINT "sync_bounds" CHECK ("jev"."mail_sync_state"."days" between 1 and 365 and "jev"."mail_sync_state"."window_since" < "jev"."mail_sync_state"."window_until" and "jev"."mail_sync_state"."revision" >= 0),
	CONSTRAINT "sync_history_id" CHECK ("jev"."mail_sync_state"."history_id" ~ '^[0-9]{1,40}$'),
	CONSTRAINT "sync_tokens" CHECK (jsonb_typeof("jev"."mail_sync_state"."seen_tokens") = 'array' and jsonb_array_length("jev"."mail_sync_state"."seen_tokens") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "jev"."mail_retrievals" ADD CONSTRAINT "mail_retrievals_mailbox_mail_sync_state_mailbox_fk" FOREIGN KEY ("mailbox") REFERENCES "jev"."mail_sync_state"("mailbox") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "retrieval_due" ON "jev"."mail_retrievals" USING btree ("mailbox","available_at");