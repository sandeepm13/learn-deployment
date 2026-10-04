/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@repo/db'],
  serverExternalPackages: ['pg'],
};

export default nextConfig;
