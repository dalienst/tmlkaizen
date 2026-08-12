ALTER TABLE "locations" ADD COLUMN "code" varchar(100);--> statement-breakpoint
UPDATE "locations" SET "code" = "name" || '_' || floor(random() * 1000000)::text;--> statement-breakpoint
ALTER TABLE "locations" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "location_code_unique" ON "locations" USING btree ("code");