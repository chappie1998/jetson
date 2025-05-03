/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('encoding', 'pino-pretty', 'lokijs', 'leveldown', 'source-map-support');
    return config;
  },
}

module.exports = nextConfig 