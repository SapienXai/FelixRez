/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Use a simpler configuration
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
