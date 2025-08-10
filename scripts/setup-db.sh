#!/bin/bash

echo "🚀 Supabase Database Setup"
echo "=========================="
echo ""

# Check if SUPABASE_DB_PASSWORD is set
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "⚠️  SUPABASE_DB_PASSWORD is not set in your .env file"
    echo ""
    echo "To get your database password:"
    echo "1. Go to: https://supabase.com/dashboard/project/ducrwfvylwdaqpwfbdub/settings/database"
    echo "2. Copy the password from the 'Database Password' section"
    echo "3. Add it to your .env file as: SUPABASE_DB_PASSWORD=your_password"
    echo "4. Run this script again"
    echo ""
    echo "Alternatively, you can run the migration manually:"
    echo "supabase db push -p YOUR_PASSWORD"
    exit 1
fi

echo "✅ Database password found"
echo ""
echo "Running migrations..."
supabase db push -p "$SUPABASE_DB_PASSWORD"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database setup complete!"
else
    echo ""
    echo "❌ Migration failed. Please check your database password."
fi