CREATE TABLE "commune_disasters" (
	"id" text NOT NULL,
	"code" text NOT NULL,
	"risk_code" text NOT NULL,
	"label" text NOT NULL,
	"began_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"signed_at" timestamp with time zone,
	CONSTRAINT "commune_disasters_id_code_risk_code_began_at_ended_at_pk" PRIMARY KEY("id","code","risk_code","began_at","ended_at")
);
--> statement-breakpoint
CREATE TABLE "commune_radon" (
	"code" text PRIMARY KEY NOT NULL,
	"potential_class" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commune_risks" (
	"code" text NOT NULL,
	"risk_code" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "commune_risks_code_risk_code_pk" PRIMARY KEY("code","risk_code")
);
--> statement-breakpoint
CREATE INDEX "commune_disasters_by_commune" ON "commune_disasters" USING btree ("code");--> statement-breakpoint
CREATE INDEX "commune_risks_by_risk" ON "commune_risks" USING btree ("risk_code");