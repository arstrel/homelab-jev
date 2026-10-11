CREATE INDEX "pending_ready" ON "jev"."pending_jobs" USING btree ("state","available_at");--> statement-breakpoint
CREATE INDEX "links_task" ON "jev"."task_links" USING btree ("task_id");