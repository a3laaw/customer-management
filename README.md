# نظام إدارة العملاء والعقود والفواتير (نسخة ويب)

نظام ويب داخلي لإدارة العملاء والعقود والفواتير وكشوف الحساب — مبني بـ Next.js 16 + TypeScript + Prisma + NextAuth.

## المميزات

- **تسجيل دخول آمن** بـ NextAuth (admin/manager/user) + JWT sessions + bcrypt
- **Dashboard** بإحصائيات حية + آخر الفواتير + إجراءات سريعة
- **العملاء**: CRUD + بحث فوري + عرض العقود والفواتير لكل عميل
- **العقود**: CRUD + حساب المبلغ المتبقي تلقائيًا
- **الفواتير**: CRUD + منع تجاوز المبلغ المتبقي من العقد (تحقق حيّ في الواجهة)
- **كشف الحساب**: جدول حركة (عقد + فواتير) + رصيد جاري + طباعة/تصدير PDF
- **PDF عربي A4**: فاتورة + كشف حساب بدعم RTL كامل وخط Tajawal
- **الإعدادات**: بيانات الشركة + شعار (base64) + عملة + تنزيل نسخة احتياطية
- **إدارة المستخدمين**: admin only — إضافة/تعديل/حذف المستخدمين
- **ثيمات**: Light/Dark + تبديل فوري
- **RTL عربي** كامل عبر كل الواجهة
- **متجاوب** مع الموبايل والتابلت والـ PC

## التقنيات

- **Framework**: Next.js 16 (App Router) + Turbopack
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **Database**: Prisma ORM + SQLite (محلي) / PostgreSQL (للإنتاج عبر Supabase)
- **Auth**: NextAuth.js v4 (Credentials + JWT)
- **State**: TanStack Query + Zustand
- **Forms**: React Hook Form + Zod
- **PDF**: pdf-lib + @pdf-lib/fontkit + خط Tajawal
- **Icons**: Lucide React

## التشغيل محليًا

### المتطلبات
- Node.js 18+ أو Bun
- Python غير مطلوب (هذه نسخة ويب فقط)

### الخطوات

```bash
# 1. تثبيت الحزم
bun install
# أو: npm install

# 2. نسخ ملف البيئة
cp .env.example .env
# عدّل القيم في .env (NEXTAUTH_SECRET خاصة)

# 3. تهيئة قاعدة البيانات
bun run db:push
# أو: npx prisma db push --accept-data-loss

# 4. تشغيل الخادم
bun run dev
# أو: npm run dev
```

ثم افتح المتصفح على `http://localhost:3000`

### أول مرة:

1. ستنتقل تلقائيًا إلى `/login`
2. اضغط زر **«إنشاء مستخدم admin افتراضي»** في أسفل صفحة الدخول
3. سجّل الدخول:
   - اسم المستخدم: `admin`
   - كلمة المرور: `admin123`
4. ⚠️ **غيّر كلمة المرور فورًا** من صفحة «المستخدمون»

## النشر على Vercel + Supabase

### الخطوة 1: رفع المشروع على GitHub

```bash
git init
git add .
git commit -m "Initial commit: نظام إدارة العملاء والعقود والفواتير"
git branch -M main
git remote add origin https://github.com/USERNAME/customer-management.git
git push -u origin main
```

### الخطوة 2: إعداد قاعدة البيانات على Supabase

1. أنشئ حسابًا على [supabase.com](https://supabase.com) (مجاني)
2. أنشئ مشروعًا جديدًا
3. اذهب إلى **Settings → Database**
4. انسخ **Connection string** (تنسيق: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`)
5. غيّر `provider` في `prisma/schema.prisma` من `sqlite` إلى `postgresql`
6. شغّل `bun run db:push` لإنشاء الجداول في Supabase

### الخطوة 3: النشر على Vercel

1. أنشئ حسابًا على [vercel.com](https://vercel.com) (مجاني)
2. **New Project → Import** مستودع GitHub
3. أضف **Environment Variables**:
   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Connection string من Supabase |
   | `NEXTAUTH_SECRET` | شغّل `openssl rand -base64 32` محليًا وانسخ الناتج |
   | `NEXTAUTH_URL` | رابط النشر (مثل `https://your-app.vercel.app`) |
4. اضغط **Deploy** — سينشر خلال 2-3 دقائق

### الخطوة 4: الإعداد الأولي للإنتاج

1. افتح رابط Vercel
2. اضغط **«إنشاء مستخدم admin افتراضي»** على صفحة الدخول
3. سجّل الدخول بـ `admin` / `admin123`
4. **غيّر كلمة المرور فورًا** من صفحة «المستخدمون»
5. أضف مستخدمين آخرين للأدوار (manager / user)

## حساب افتراضي للديمو

```
اسم المستخدم: admin
كلمة المرور: admin123
```

⚠️ **غيّر كلمة المرور فور أول دخول**

## هيكل المشروع

```
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Dashboard
│   ├── login/page.tsx            # تسجيل الدخول
│   ├── customers/page.tsx
│   ├── contracts/page.tsx
│   ├── invoices/page.tsx
│   ├── statement/page.tsx
│   ├── settings/page.tsx
│   ├── users/page.tsx
│   ├── layout.tsx + globals.css
│   └── api/
│       ├── auth/[...nextauth]/   # NextAuth endpoints
│       ├── customers/[id]/       # + contracts + invoices
│       ├── contracts/[id]/       # + summary
│       ├── invoices/[id]/        # + pdf
│       ├── statement/[contractId]/pdf
│       ├── stats / settings / users / backup / seed
├── src/
│   ├── lib/
│   │   ├── db.ts                 # Prisma client
│   │   ├── auth.ts               # NextAuth config
│   │   ├── utils.ts              # أدوات مساعدة + توليد الأرقام
│   │   └── pdf-base.ts           # مكتبة PDF عربي
│   ├── components/
│   │   ├── app-shell.tsx + sidebar.tsx + topbar.tsx + user-menu.tsx
│   │   ├── theme-provider.tsx + theme-toggle.tsx + mobile-nav.tsx + providers.tsx
│   │   ├── ui/                   # shadcn/ui components (45+ مكون)
│   │   └── views/                # صفحات العميل (Customer views)
│   │       ├── dashboard-client.tsx
│   │       ├── customers-view.tsx
│   │       ├── contracts-view.tsx
│   │       ├── invoices-view.tsx
│   │       ├── statement-view.tsx
│   │       ├── settings-view.tsx
│   │       └── users-view.tsx
│   └── hooks/
├── prisma/
│   └── schema.prisma             # 5 نماذج: User, Customer, Contract, Invoice, Settings
├── public/
│   └── fonts/                    # خط Tajawal (3 أوزان)
├── .env.example                  # متغيرات البيئة المرجعية
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## قواعد الأعمال المطبّقة

1. ✅ لا يمكن إنشاء فاتورة تتجاوز المبلغ المتبقي من العقد
2. ✅ لا يمكن إدخال مبالغ سالبة أو صفرية
3. ✅ لا يمكن حذف عميل مرتبط بعقود/فواتير
4. ✅ لا يمكن حذف عقد مرتبط بفواتير
5. ✅ لا يمكن تقليل قيمة العقد عن إجمالي فواتيره
6. ✅ الأرقام تُولّد تلقائيًا: CUST-0001, CON-0001, INV-0001
7. ✅ الصلاحيات: admin (كل شيء) / manager (إضافة/تعديل) / user (عرض فقط)
8. ✅ لا تظهر أخطاء تقنية للمستخدم - رسائل عربية واضحة

## الأمان

- كلمات المرور مشفّرة بـ bcrypt (10 rounds)
- JWT sessions مع `NEXTAUTH_SECRET`
- كل API routes محمية بـ `getServerSession`
- صلاحيات بناءً على الأدوار (admin/manager/user)
- لا CORS مفتوحة (نفس الأصل فقط)

## الترخيص

- الكود: مخصص للاستخدام التجاري والشخصي
- خط Tajawal: SIL Open Font License 1.1
