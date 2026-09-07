CREATE TYPE "public"."facility_kind" AS ENUM('pharmacy', 'hospital');--> statement-breakpoint
CREATE TYPE "public"."facility_precision" AS ENUM('exact', 'zone', 'commune');--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" text PRIMARY KEY NOT NULL,
	"area_code" text NOT NULL,
	"kind" "facility_kind" NOT NULL,
	"name" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"precision" "facility_precision" NOT NULL,
	"source_id" text NOT NULL,
	"observed_at" timestamp with time zone,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facilities_latitude_range" CHECK ("facilities"."latitude" between -90 and 90),
	CONSTRAINT "facilities_longitude_range" CHECK ("facilities"."longitude" between -180 and 180)
);
--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "facilities_by_area" ON "facilities" USING btree ("area_code","kind");