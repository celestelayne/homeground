CREATE TYPE "public"."evidence_state" AS ENUM('known', 'estimated', 'unknown', 'unavailable', 'stale');--> statement-breakpoint
CREATE TABLE "area_boundaries" (
	"code" text PRIMARY KEY NOT NULL,
	"geojson" jsonb NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "areas" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"postcodes" text[] NOT NULL,
	"department_code" text NOT NULL,
	"department_name" text NOT NULL,
	"region_code" text NOT NULL,
	"region_name" text NOT NULL,
	"intercommunality_code" text,
	"intercommunality_name" text,
	"centre_latitude" double precision NOT NULL,
	"centre_longitude" double precision NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"area_code" text NOT NULL,
	"metric" text NOT NULL,
	"value" double precision,
	"unit" text,
	"state" "evidence_state" NOT NULL,
	"source_id" text NOT NULL,
	"observed_at" timestamp with time zone,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"method" text NOT NULL,
	"method_version" integer NOT NULL,
	CONSTRAINT "evidence_absence_has_no_value" CHECK (("evidence"."state" in ('unknown', 'unavailable') and "evidence"."value" is null and "evidence"."unit" is null)
          or ("evidence"."state" in ('known', 'estimated', 'stale') and "evidence"."value" is not null and "evidence"."unit" is not null))
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"publisher" text NOT NULL,
	"description" text NOT NULL,
	"url" text NOT NULL,
	"cadence" text NOT NULL,
	"coverage" text NOT NULL,
	"licence" text NOT NULL,
	"limitations" text[] NOT NULL,
	CONSTRAINT "sources_state_a_limitation" CHECK (cardinality("sources"."limitations") >= 1)
);
--> statement-breakpoint
ALTER TABLE "area_boundaries" ADD CONSTRAINT "area_boundaries_code_areas_code_fk" FOREIGN KEY ("code") REFERENCES "public"."areas"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_area_code_areas_code_fk" FOREIGN KEY ("area_code") REFERENCES "public"."areas"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_one_per_observation" ON "evidence" USING btree ("area_code","metric","observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_one_undated_per_metric" ON "evidence" USING btree ("area_code","metric") WHERE "evidence"."observed_at" is null;--> statement-breakpoint
CREATE INDEX "evidence_by_area" ON "evidence" USING btree ("area_code","metric");