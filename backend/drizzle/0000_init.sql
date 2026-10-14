CREATE TYPE "public"."match_result" AS ENUM('white', 'black', 'draw');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('ongoing', 'completed');--> statement-breakpoint
CREATE TYPE "public"."match_termination" AS ENUM('checkmate', 'resignation', 'timeout', 'stalemate', 'draw_agreement', 'threefold_repetition', 'fifty_move_rule', 'insufficient_material');--> statement-breakpoint
CREATE TYPE "public"."tournament_status" AS ENUM('draft', 'open', 'ongoing', 'completed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('coach', 'student');--> statement-breakpoint
CREATE TABLE "active_players" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"match_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"white_id" uuid NOT NULL,
	"black_id" uuid NOT NULL,
	"status" "match_status" DEFAULT 'ongoing' NOT NULL,
	"result" "match_result",
	"termination" "match_termination",
	"pgn" text DEFAULT '' NOT NULL,
	"fen" text NOT NULL,
	"white_time_ms" integer NOT NULL,
	"black_time_ms" integer NOT NULL,
	"turn_started_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "matches_distinct_players_chk" CHECK ("matches"."white_id" <> "matches"."black_id")
);
--> statement-breakpoint
CREATE TABLE "tournament_participants" (
	"tournament_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_participants_tournament_id_user_id_pk" PRIMARY KEY("tournament_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"time_control_minutes" integer NOT NULL,
	"increment_seconds" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"status" "tournament_status" DEFAULT 'draft' NOT NULL,
	"created_by_id" uuid NOT NULL,
	"winner_id" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournaments_time_control_chk" CHECK ("tournaments"."time_control_minutes" between 1 and 180),
	CONSTRAINT "tournaments_increment_chk" CHECK ("tournaments"."increment_seconds" between 0 and 60)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(120) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "active_players" ADD CONSTRAINT "active_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_players" ADD CONSTRAINT "active_players_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_white_id_users_id_fk" FOREIGN KEY ("white_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_black_id_users_id_fk" FOREIGN KEY ("black_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matches_tournament_idx" ON "matches" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "matches_white_idx" ON "matches" USING btree ("white_id");--> statement-breakpoint
CREATE INDEX "matches_black_idx" ON "matches" USING btree ("black_id");--> statement-breakpoint
CREATE INDEX "participants_user_idx" ON "tournament_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tournaments_status_idx" ON "tournaments" USING btree ("status");