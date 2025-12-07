#!/bin/bash
# Supabase CLI Setup Script
# Run this to link your project and apply migrations

echo "🔐 Setting up Supabase CLI..."
echo ""
echo "Please run the following commands:"
echo ""
echo "1. Export your access token:"
echo "   export SUPABASE_ACCESS_TOKEN='your-token-here'"
echo ""
echo "2. Link the project:"
echo "   supabase link --project-ref elfsjkvlfhmmtpfoswxs"
echo ""
echo "3. Apply the migration:"
echo "   supabase db push"
echo ""
echo "Or manually apply via Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/elfsjkvlfhmmtpfoswxs/sql/new"
echo "   Then paste the contents of: supabase/migrations/add_player_status.sql"
