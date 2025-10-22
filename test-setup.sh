#!/bin/bash

echo "🧪 Testing Web App Setup"
echo "========================"
echo ""

# Check Node.js
echo "1. Checking Node.js..."
if command -v node &> /dev/null; then
    echo "   ✅ Node.js $(node --version)"
else
    echo "   ❌ Node.js not found"
    exit 1
fi

# Check npm
echo "2. Checking npm..."
if command -v npm &> /dev/null; then
    echo "   ✅ npm $(npm --version)"
else
    echo "   ❌ npm not found"
    exit 1
fi

# Check if in correct directory
echo "3. Checking directory..."
if [ -f "package.json" ]; then
    echo "   ✅ In web-app directory"
else
    echo "   ❌ Not in web-app directory. Run: cd web-app"
    exit 1
fi

# Check dependencies
echo "4. Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "   ✅ Dependencies installed"
else
    echo "   ⚠️  Dependencies not installed. Run: npm install"
    exit 1
fi

# Check .env file
echo "5. Checking .env file..."
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"
    
    # Check for required variables
    if grep -q "OPENROUTER_API_KEY=sk-" .env; then
        echo "   ✅ OpenRouter API key configured"
    else
        echo "   ⚠️  OpenRouter API key not configured"
    fi
    
    if grep -q "JWT_SECRET=" .env && ! grep -q "JWT_SECRET=your_random" .env; then
        echo "   ✅ JWT secret configured"
    else
        echo "   ⚠️  JWT secret needs to be set"
    fi
    
    if grep -q "DATABASE_URL=" .env; then
        echo "   ✅ Database URL configured"
    else
        echo "   ⚠️  Database URL not configured"
    fi
else
    echo "   ❌ .env file not found. Run: cp .env.example .env"
    exit 1
fi

# Check file structure
echo "6. Checking file structure..."
files=(
    "server/index.js"
    "server/config/database.js"
    "server/routes/auth.js"
    "server/routes/prompts.js"
    "server/middleware/auth.js"
    "server/utils/generator.js"
    "public/index.html"
    "public/js/app.js"
    "public/js/api.js"
    "public/css/styles.css"
)

all_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file missing"
        all_exist=false
    fi
done

echo ""
echo "========================"
if [ "$all_exist" = true ]; then
    echo "✅ All checks passed!"
    echo ""
    echo "Ready to start:"
    echo "  npm run dev      # Development mode"
    echo "  npm start        # Production mode"
    echo ""
    echo "Or deploy to Railway:"
    echo "  railway login"
    echo "  railway up"
else
    echo "❌ Some checks failed"
    echo "Please fix the issues above"
fi
