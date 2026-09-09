import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load server environment variables. Never expose the server credential to client code.
dotenv.config({
  path: path.resolve(__dirname, "..", ".env"),
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServerKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is missing from the server environment.");
}

if (!supabaseServerKey) {
  throw new Error(
    "A server-only Supabase credential is required. Set SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY. Do not use SUPABASE_ANON_KEY for backend writes."
  );
}

export const supabase = createClient(supabaseUrl, supabaseServerKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
