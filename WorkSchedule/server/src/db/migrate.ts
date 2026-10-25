import { sql } from "./index.js";

await sql`
  CREATE TABLE IF NOT EXISTS users (
    id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          text NOT NULL,
    email         text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    role          text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    created_at    timestamptz NOT NULL DEFAULT now()
  )
`;


await sql`
  CREATE TABLE IF NOT EXISTS shifts (
    id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time    timestamptz NOT NULL,
    end_time      timestamptz NOT NULL,
    CHECK (end_time > start_time)
  )
`;

await sql`
  ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected'))
`;

// The DB itself refuses two active (not rejected) shifts of one employee that overlap in time.
// Needed when two requests arrive at the same moment: both pass the check in the controller.
await sql`CREATE EXTENSION IF NOT EXISTS btree_gist`;

await sql`
  DO $$ BEGIN
    ALTER TABLE shifts ADD CONSTRAINT shifts_no_overlap
      EXCLUDE USING gist (user_id WITH =, tstzrange(start_time, end_time) WITH &&)
      WHERE (status <> 'rejected');
  EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
  END $$
`;

console.log("Migration done");
