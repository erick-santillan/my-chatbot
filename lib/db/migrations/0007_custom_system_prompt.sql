CREATE TABLE IF NOT EXISTS "SystemPrompt" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "userId" uuid NOT NULL,
        "prompt" text NOT NULL,
        CONSTRAINT "SystemPrompt_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SystemPrompt" ADD CONSTRAINT "SystemPrompt_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
