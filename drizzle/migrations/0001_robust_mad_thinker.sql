ALTER TABLE "locations" ADD COLUMN "code" varchar(100) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "location_code_unique" ON "locations" USING btree ("code");