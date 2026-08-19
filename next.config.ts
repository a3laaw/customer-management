import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* تجاوز أخطاء TypeScript عند البناء */
  typescript: {
    ignoreBuildErrors: true,
  },
  /* تجاوز أخطاء ESLint عند البناء */
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  /* السماح ببناء الصفحات حتى لو فشل prerender بعضها
     (مفيد لـ _not-found التي تعتمد على env vars غير متوفرة في build time) */
  experimental: {
    // معالجة الأخطاء في الـ prerender بشكل أكثر مرونة
    prerender: { bypassRequestIsolation: true },
  },
};

export default nextConfig;
