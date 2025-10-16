#!/bin/bash

# Apply prescreen migration using psql
# This script connects directly to Supabase and runs the migration SQL

echo "🔄 Applying prescreen fields migration..."
echo ""

# Read the migration SQL
MIGRATION_SQL=$(cat supabase/migrations/add_prescreen_fields.sql)

# Execute using Supabase connection
# You'll need to get the connection string from Supabase Dashboard > Settings > Database

echo "📋 Please run this SQL in your Supabase SQL Editor:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/sql/new"
echo "2. Paste the following SQL:"
echo ""
echo "=================================================================================="
cat supabase/migrations/add_prescreen_fields.sql
echo "=================================================================================="
echo ""
echo "3. Click 'Run' to execute"
echo ""
echo "✅ After running, the prescreen feature will be ready to use!"
