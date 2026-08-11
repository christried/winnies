CREATE TYPE "public"."challenge_status" AS ENUM('todo', 'active', 'won');--> statement-breakpoint
CREATE TABLE "challenge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"winnie_id" uuid NOT NULL,
	"game" text NOT NULL,
	"spec" text DEFAULT '' NOT NULL,
	"status" "challenge_status" DEFAULT 'todo' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL,
	"target" integer DEFAULT 0 NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"accumulated_seconds" integer DEFAULT 0 NOT NULL,
	"running_since" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "winnie" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"share_slug" uuid DEFAULT gen_random_uuid() NOT NULL,
	"players_on" boolean DEFAULT false NOT NULL,
	"total_accumulated_seconds" integer DEFAULT 0 NOT NULL,
	"total_running_since" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenge" ADD CONSTRAINT "challenge_winnie_id_winnie_id_fk" FOREIGN KEY ("winnie_id") REFERENCES "public"."winnie"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "challenge_winnie_id_index" ON "challenge" USING btree ("winnie_id");--> statement-breakpoint
CREATE INDEX "winnie_owner_id_index" ON "winnie" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "winnie_share_slug_index" ON "winnie" USING btree ("share_slug");