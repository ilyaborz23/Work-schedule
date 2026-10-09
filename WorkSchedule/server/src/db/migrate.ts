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

console.log("Migration done");
