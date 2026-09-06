CREATE TYPE "public"."property_status" AS ENUM('saved', 'shortlist', 'visit', 'rejected');--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"asking_price" numeric(12, 2),
	"listing_url" text,
	"status" "property_status" DEFAULT 'saved' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "properties_latitude_range" CHECK ("properties"."latitude" between -90 and 90),
	CONSTRAINT "properties_longitude_range" CHECK ("properties"."longitude" between -180 and 180)
);
