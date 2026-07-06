#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

// Load from .env file manually
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");
const envFile = readFileSync(envPath, "utf-8");
const envVars = {};
envFile.split("\n").forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

console.log("🔄 Applying ingredient source schema migration...\n");
console.log("⚠️  This migration must be run in Supabase SQL Editor\n");

console.log("📋 Please copy and run this SQL in Supabase SQL Editor:");
console.log("   Dashboard → SQL Editor → New Query\n");

console.log("─".repeat(60));
console.log(`
-- Step 1: Create enum type
DO $$ BEGIN
  CREATE TYPE ingredient_source AS ENUM ('invoice', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Step 2: Add column
ALTER TABLE ingredients 
  ADD COLUMN IF NOT EXISTS source ingredient_source NOT NULL DEFAULT 'manual';

-- Step 3: Tag invoice-based ingredients
UPDATE ingredients 
SET source = 'invoice' 
WHERE source_invoice_id IS NOT NULL;

-- Step 4: Tag manual ingredients  
UPDATE ingredients 
SET source = 'manual' 
WHERE source_invoice_id IS NULL;
`);
console.log("─".repeat(60));

console.log("\n📊 Checking current ingredient data...\n");

// Check current ingredients
const { data: ingredients, error } = await supabase
  .from("ingredients")
  .select("id, name, source_invoice_id");

if (error) {
  console.error("❌ Error fetching ingredients:", error.message);
  console.log("\n💡 This is expected if the migration hasn't been run yet.");
  process.exit(1);
}

const withInvoice = ingredients.filter(i => i.source_invoice_id !== null).length;
const withoutInvoice = ingredients.filter(i => i.source_invoice_id === null).length;

console.log(`📈 Total ingredients: ${ingredients.length}`);
console.log(`📄 With invoice ID (will be tagged 'invoice'): ${withInvoice}`);
console.log(`💰 Without invoice ID (will be tagged 'manual'): ${withoutInvoice}`);

console.log("\n✨ After running the SQL above:");
console.log(`   • ${withInvoice} ingredients will show blue "Invoice" badges`);
console.log(`   • ${withoutInvoice} ingredients will show amber "Manual" badges`);

console.log("\n🔄 Refresh your browser after running the SQL!\n");

process.exit(0);
