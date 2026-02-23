/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["xlsx"],
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      { source: "/api/agentsmith/:path*", destination: "http://raiser-agentsmith-backend:4000/api/v1/:path*" },
      { source: "/api/cortex/:path*", destination: "http://raiser-cortex:3011/api/:path*" },
      { source: "/api/content-intel/:path*", destination: "http://raiser-content-intel:3015/api/:path*" },
      { source: "/api/innotion/:path*", destination: "http://raiser-outline:3000/api/:path*" },
      { source: "/api/apify/:path*", destination: "http://raiser-apify:8000/:path*" },
    ];
  },
};

module.exports = nextConfig;
