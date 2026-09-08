ALTER TABLE "evidence" ADD COLUMN "basis" text;--> statement-breakpoint
ALTER TABLE "evidence" ADD COLUMN "basis_source_id" text;--> statement-breakpoint
ALTER TABLE "evidence" ADD COLUMN "peers" integer;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_basis_source_id_sources_id_fk" FOREIGN KEY ("basis_source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_comparison_is_complete" CHECK (("evidence"."basis" is null and "evidence"."basis_source_id" is null and "evidence"."peers" is null)
          or ("evidence"."basis" is not null and "evidence"."basis_source_id" is not null and "evidence"."peers" is not null));