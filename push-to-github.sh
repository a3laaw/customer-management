#!/usr/bin/env bash
# سكريبت رفع المشروع على GitHub
# قبل التشغيل: أنشئ مستودعًا على GitHub بدون ملفات README
# ثم: ./push-to-github.sh https://github.com/USERNAME/customer-management.git

set -e

if [ -z "$1" ]; then
  echo "الاستخدام: $0 <github-repo-url>"
  echo "مثال: $0 https://github.com/USERNAME/customer-management.git"
  exit 1
fi

REPO_URL="$1"
echo "🚀 جاري الرفع على: $REPO_URL"

# التأكد من وجود git init
if [ ! -d .git ]; then
  git init
  git config user.email "user@example.com"
  git config user.name "Customer Management"
  git add .
  git commit -m "feat: نظام ويب لإدارة العملاء والعقود والفواتير"
  git branch -M main
fi

# إضافة remote
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

# الرفع
echo "📦 جاري الرفع..."
git push -u origin main --force-with-lease

echo ""
echo "✅ تم الرفع بنجاح!"
echo "🔗 افتح: ${REPO_URL%.git}"
echo ""
echo "📋 الخطوات التالية للنشر على Vercel:"
echo "1. ادخل vercel.com → New Project → Import هذا المستودع"
echo "2. أضف Environment Variables:"
echo "   - DATABASE_URL: Supabase connection string"
echo "   - NEXTAUTH_SECRET: openssl rand -base64 32"
echo "   - NEXTAUTH_URL: https://your-app.vercel.app"
echo "3. Deploy 🎉"
