import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Biar folder 'out' otomatis terbuat untuk Capacitor
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ['192.168.0.114'], // Tambahkan IP network kamu di sini
};

export default nextConfig;