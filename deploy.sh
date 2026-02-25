#!/bin/bash

# Deploy to Vercel
# Run this script from the project root

echo "Deploying Product Image Studio to Vercel..."
echo ""

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Login to Vercel (if not already logged in)
echo "Make sure you're logged into Vercel:"
echo "  vercel login"
echo ""

# Deploy to production
echo "Deploying..."
vercel --prod --yes

echo ""
echo "Done! Your app should be live on Vercel."
