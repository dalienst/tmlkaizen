CREATE TABLE "gm_locations" (
	"gm_user_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	CONSTRAINT "gm_locations_gm_user_id_location_id_pk" PRIMARY KEY("gm_user_id","location_id")
);
--> statement-breakpoint
ALTER TABLE "gm_locations" ADD CONSTRAINT "gm_locations_gm_user_id_users_id_fk" FOREIGN KEY ("gm_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gm_locations" ADD CONSTRAINT "gm_locations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;