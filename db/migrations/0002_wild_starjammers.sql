ALTER TABLE "employees" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_email_unique" UNIQUE("email");