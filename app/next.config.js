/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  images: {
    unoptimized: true, // This stops Next.js from reprocessing large AI images in Dev mode, fixing the UI hang
  },
};

module.exports = nextConfig;
