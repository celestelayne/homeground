CREATE TABLE "health_zoning" (
	"code" text NOT NULL,
	"profession" text NOT NULL,
	"level" text NOT NULL,
	"decreed_at" timestamp with time zone,
	"catchment" text,
	CONSTRAINT "health_zoning_code_profession_pk" PRIMARY KEY("code","profession")
);
--> statement-breakpoint
ALTER TABLE "evidence" DROP CONSTRAINT "evidence_comparison_is_complete";--> statement-breakpoint
ALTER TABLE "evidence" DROP CONSTRAINT "evidence_absence_has_no_value";--> statement-breakpoint
ALTER TABLE "evidence" ADD COLUMN "category" text;--> statement-breakpoint
CREATE INDEX "health_zoning_by_profession" ON "health_zoning" USING btree ("profession","level");--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_basis_is_attributed" CHECK (("evidence"."basis" is null and "evidence"."basis_source_id" is null and "evidence"."peers" is null)
          or ("evidence"."basis" is not null and "evidence"."basis_source_id" is not null));--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_absence_has_no_value" CHECK (("evidence"."state" in ('unknown', 'unavailable') and "evidence"."value" is null and "evidence"."unit" is null and "evidence"."category" is null)
          or ("evidence"."state" in ('known', 'estimated', 'stale')
              and (("evidence"."value" is not null and "evidence"."unit" is not null and "evidence"."category" is null)
                or ("evidence"."category" is not null and "evidence"."value" is null and "evidence"."unit" is null))));