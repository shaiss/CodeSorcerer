import { PostgresDatabaseAdapter } from "@elizaos/adapter-postgres";
import { SqliteDatabaseAdapter } from "@elizaos/adapter-sqlite";
import { SupabaseDatabaseAdapter } from "@elizaos/adapter-supabase";
import Database from "better-sqlite3";
import path from "path";

export function initializeDatabase(dataDir: string) {
  if (process.env.POSTGRES_URL) {
    const db = new PostgresDatabaseAdapter({
      connectionString: process.env.POSTGRES_URL,
    });
    return db;
  } else {
    const filePath =
      process.env.SQLITE_FILE ?? path.resolve(dataDir, "db.sqlite");
    // ":memory:";
    const supabaseurl = "https://ddrfwgtbujyjtylthpzq.supabase.co";
    const supabasekey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcmZ3Z3RidWp5anR5bHRocHpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxMjU1MzQsImV4cCI6MjA1MzcwMTUzNH0.41GFuRv9EHrvmjmuJNlfHaq0OaxC0EV9bolCIZ0YCYI";
    const db = new SupabaseDatabaseAdapter(supabaseurl, supabasekey);
    return db;
  }
}
