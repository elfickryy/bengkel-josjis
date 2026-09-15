import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tambahkan baris ini biar Next.js gak protes soal direktori home
  turbopack: {
    root: __dirname,
  },
};

export default function nextConfigWrapper() {
  return nextConfig;
}