ALTER TABLE "areas" ADD COLUMN "image_state" text DEFAULT 'unavailable' NOT NULL;--> statement-breakpoint
ALTER TABLE "areas" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "areas" ADD COLUMN "image_artist" text;--> statement-breakpoint
ALTER TABLE "areas" ADD COLUMN "image_licence" text;--> statement-breakpoint
ALTER TABLE "areas" ADD COLUMN "image_description_url" text;--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_image_state_matches_url" CHECK (("areas"."image_state" = 'known' and "areas"."image_url" is not null)
        or ("areas"."image_state" in ('unknown', 'unavailable') and "areas"."image_url" is null));