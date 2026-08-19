-- ====================================================================
-- نظام إدارة العملاء والعقود والفواتير - مخطط قاعدة بيانات PostgreSQL
-- ليُشغّل على Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ====================================================================

-- تمكين امتداد pgcrypto لتوليد الـ UUID (إن لم يكن مفعّلًا)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============= المستخدمون =============
CREATE TABLE IF NOT EXISTS "User" (
    "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "username"    TEXT UNIQUE NOT NULL,
    "name"        TEXT NOT NULL,
    "password"    TEXT NOT NULL, -- bcrypt hash
    "role"        TEXT NOT NULL DEFAULT 'user', -- 'admin' | 'manager' | 'user'
    "active"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username");

-- ============= العملاء =============
CREATE TABLE IF NOT EXISTS "Customer" (
    "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "customerCode" TEXT UNIQUE NOT NULL, -- CUST-0001
    "name"         TEXT NOT NULL,
    "phone"        TEXT NOT NULL DEFAULT '',
    "address"      TEXT NOT NULL DEFAULT '',
    "email"        TEXT NOT NULL DEFAULT '',
    "notes"        TEXT NOT NULL DEFAULT '',
    "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Customer_name_idx" ON "Customer"("name");
CREATE INDEX IF NOT EXISTS "Customer_phone_idx" ON "Customer"("phone");

-- ============= العقود =============
CREATE TABLE IF NOT EXISTS "Contract" (
    "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "contractNumber" TEXT UNIQUE NOT NULL, -- CON-0001
    "customerId"     TEXT NOT NULL,
    "contractDate"   TEXT NOT NULL, -- YYYY-MM-DD
    "description"    TEXT NOT NULL DEFAULT '',
    "amount"         DOUBLE PRECISION NOT NULL, -- CHECK (amount > 0),
    "notes"          TEXT NOT NULL DEFAULT '',
    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "Contract_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "Contract_customerId_idx" ON "Contract"("customerId");

-- ============= الفواتير =============
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "invoiceNumber" TEXT UNIQUE NOT NULL, -- INV-0001
    "customerId"    TEXT NOT NULL,
    "contractId"    TEXT NOT NULL,
    "invoiceDate"   TEXT NOT NULL, -- YYYY-MM-DD
    "description"   TEXT NOT NULL DEFAULT '',
    "amount"        DOUBLE PRECISION NOT NULL, -- CHECK (amount > 0),
    "notes"         TEXT NOT NULL DEFAULT '',
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "Invoice_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
        ON DELETE RESTRICT,
    CONSTRAINT "Invoice_contractId_fkey"
        FOREIGN KEY ("contractId") REFERENCES "Contract"("id")
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX IF NOT EXISTS "Invoice_contractId_idx" ON "Invoice"("contractId");

-- ============= الإعدادات (صف واحد) =============
CREATE TABLE IF NOT EXISTS "Settings" (
    "id"            TEXT PRIMARY KEY DEFAULT '1',
    "companyName"   TEXT NOT NULL DEFAULT '',
    "companyAddress" TEXT NOT NULL DEFAULT '',
    "companyPhone"  TEXT NOT NULL DEFAULT '',
    "companyEmail"  TEXT NOT NULL DEFAULT '',
    "logoPath"      TEXT NOT NULL DEFAULT '',
    "currency"      TEXT NOT NULL DEFAULT 'د.ك',
    "uiTheme"       TEXT NOT NULL DEFAULT 'light' -- 'light' | 'dark'
);

-- إدراج صف الإعدادات الافتراضي
INSERT INTO "Settings" ("id", "currency", "uiTheme")
VALUES ('1', 'د.ك', 'light')
ON CONFLICT ("id") DO NOTHING;

-- ============= تعليقات الوثائق (للعرض في Supabase) =============
COMMENT ON TABLE "User" IS 'المستخدمون — مع bcrypt hash للكلمة';
COMMENT ON TABLE "Customer" IS 'العملاء';
COMMENT ON TABLE "Contract" IS 'العقود — مرتبطة بعميل واحد';
COMMENT ON TABLE "Invoice" IS 'الفواتير — مرتبطة بعميل وعقد';
COMMENT ON TABLE "Settings" IS 'إعدادات الشركة (صف واحد فقط)';

-- ============= بيانات أولية (admin افتراضي) =============
-- ملاحظة: كلمة المرور هنا هي hash لـ "admin123" (10 rounds bcrypt)
-- يجب تغييرها فور أول تسجيل دخول
INSERT INTO "User" ("username", "name", "password", "role", "active")
SELECT 'admin', 'مدير النظام',
       '$2a$10$8Kvu5ZvB3RHrZQ7sQwLFXuMaJ0mF8nQHvRQX.Q1rYbZ8K1GfQVJY2',
       'admin', true
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "username" = 'admin');

-- ====================================================================
-- لاحظ: Prisma يتوقع أسماء جداول بصيغة PascalCase (User, Customer, إلخ)
-- لو استخدمت مباشرة في SQL Editor، الجداول ستنشأ بنفس الأسماء التي يتوقعها Prisma
-- ====================================================================

-- للتراجع عن كل ما سبق (لو احتجت):
-- DROP TABLE IF EXISTS "Invoice";
-- DROP TABLE IF EXISTS "Contract";
-- DROP TABLE IF EXISTS "Customer";
-- DROP TABLE IF EXISTS "User";
-- DROP TABLE IF EXISTS "Settings";
