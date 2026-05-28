"use client";

import { createClient } from "@supabase/supabase-js";

import { supabaseConfig } from "./supabase";

export function createSupabaseBrowserClient() {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    throw new Error("Supabase browser configuration is missing");
  }
  return createClient(supabaseConfig.url, supabaseConfig.anonKey);
}
