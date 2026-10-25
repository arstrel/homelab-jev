CREATE TABLE "jev"."inference_budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"limit_nano" integer NOT NULL,
	"used_nano" integer NOT NULL,
	CONSTRAINT "inference_allowance" CHECK ("jev"."inference_budgets"."used_nano" >= 0 and "jev"."inference_budgets"."used_nano" <= "jev"."inference_budgets"."limit_nano" and "jev"."inference_budgets"."limit_nano" <= 2000000000)
);
