CREATE TABLE "weather_monthly" (
	"station_id" text NOT NULL,
	"year_month" text NOT NULL,
	"rainfall" double precision,
	"rain_days" integer,
	"heavy_rain_days" integer,
	"mean_max" double precision,
	"mean_min" double precision,
	"days_above_30" integer,
	"days_above_35" integer,
	"nights_above_20" integer,
	"frost_days" integer,
	"sunshine_minutes" integer,
	CONSTRAINT "weather_monthly_station_id_year_month_pk" PRIMARY KEY("station_id","year_month")
);
--> statement-breakpoint
CREATE TABLE "weather_stations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"altitude" integer
);
--> statement-breakpoint
CREATE INDEX "weather_monthly_by_station" ON "weather_monthly" USING btree ("station_id");