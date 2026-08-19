import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel يدير standalone output تلقائيًا، لا حاجة لـ output: "standalone"
  /* تجاوز أخطاء TypeScript عند البناء */
  typescript: {
    ignoreBuildErrors: true,
  },
  /* تجاوز أخطاء ESLint عند البناء */
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
