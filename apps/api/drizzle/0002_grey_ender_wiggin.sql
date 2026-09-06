ALTER TABLE "properties" ALTER COLUMN "address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "name" text NOT NULL;