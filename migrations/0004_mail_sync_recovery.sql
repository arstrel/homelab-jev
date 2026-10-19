CREATE TABLE "jev"."mail_recovery_targets" (
	"mailbox" text NOT NULL,
	"thread_id" text NOT NULL,
	CONSTRAINT "mail_recovery_targets_mailbox_thread_id_pk" PRIMARY KEY("mailbox","thread_id")
);
--> statement-breakpoint
ALTER TABLE "jev"."mail_sync_state" DROP CONSTRAINT "sync_phase";--> statement-breakpoint
ALTER TABLE "jev"."mail_sync_state" ADD COLUMN "recovery_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "jev"."mail_sync_state" ADD COLUMN "recovery_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "jev"."mail_sync_state" ADD COLUMN "recovery_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "jev"."mail_sync_state" ADD COLUMN "previous_history_id" text;--> statement-breakpoint
ALTER TABLE "jev"."mail_sync_state" ADD COLUMN "history_gap" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "jev"."mail_sync_state" SET "history_gap" = true WHERE "phase" = 'recovery-required';--> statement-breakpoint
ALTER TABLE "jev"."mail_recovery_targets" ADD CONSTRAINT "mail_recovery_targets_mailbox_mail_sync_state_mailbox_fk" FOREIGN KEY ("mailbox") REFERENCES "jev"."mail_sync_state"("mailbox") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jev"."mail_sync_state" ADD CONSTRAINT "sync_recovery_count" CHECK ("jev"."mail_sync_state"."recovery_count" >= 0);--> statement-breakpoint
ALTER TABLE "jev"."mail_sync_state" ADD CONSTRAINT "sync_phase" CHECK ("jev"."mail_sync_state"."phase" in ('bootstrap','history','recovery-required','recovery-bootstrap','recovery-mapped'));
