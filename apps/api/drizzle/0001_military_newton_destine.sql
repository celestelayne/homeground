CREATE TYPE "public"."location_tier" AS ENUM('exact', 'zone', 'commune');--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "location_tier" "location_tier" NOT NULL;