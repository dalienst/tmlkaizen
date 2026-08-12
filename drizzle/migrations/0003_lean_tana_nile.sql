CREATE TABLE "managers_departments" (
	"manager_user_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	CONSTRAINT "managers_departments_manager_user_id_department_id_pk" PRIMARY KEY("manager_user_id","department_id")
);
--> statement-breakpoint
ALTER TABLE "managers_departments" ADD CONSTRAINT "managers_departments_manager_user_id_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managers_departments" ADD CONSTRAINT "managers_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;