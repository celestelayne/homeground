CREATE TABLE "bpe_counts" (
	"code" text NOT NULL,
	"facility_type" text NOT NULL,
	"edition" integer NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "bpe_counts_code_facility_type_edition_pk" PRIMARY KEY("code","facility_type","edition"),
	CONSTRAINT "bpe_counts_positive" CHECK ("bpe_counts"."count" > 0)
);
--> statement-breakpoint
CREATE TABLE "commune_density" (
	"code" text PRIMARY KEY NOT NULL,
	"level" integer NOT NULL,
	"label" text NOT NULL,
	"edition" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX "bpe_by_type" ON "bpe_counts" USING btree ("facility_type","edition");