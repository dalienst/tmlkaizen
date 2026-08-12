DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'GROUP_MANAGER') THEN
    ALTER TYPE "public"."user_role" ADD VALUE 'GROUP_MANAGER';
  END IF;
END
$$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group_managers_groups" (
	"group_manager_id" integer NOT NULL,
	"group_id" uuid NOT NULL,
	CONSTRAINT "group_managers_groups_group_manager_id_group_id_pk" PRIMARY KEY("group_manager_id","group_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "group_id" uuid;--> statement-breakpoint
ALTER TABLE "group_managers_groups" DROP CONSTRAINT IF EXISTS "group_managers_groups_group_manager_id_users_id_fk";
ALTER TABLE "group_managers_groups" ADD CONSTRAINT "group_managers_groups_group_manager_id_users_id_fk" FOREIGN KEY ("group_manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_managers_groups" DROP CONSTRAINT IF EXISTS "group_managers_groups_group_id_groups_id_fk";
ALTER TABLE "group_managers_groups" ADD CONSTRAINT "group_managers_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "group_code_unique" ON "groups" USING btree ("code");--> statement-breakpoint
ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "departments_group_id_groups_id_fk";
ALTER TABLE "departments" ADD CONSTRAINT "departments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;