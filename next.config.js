/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  env: {
    WORKER_URL: process.env.WORKER_URL,
    API_TOKEN: process.env.API_TOKEN
  }
}

module.exports = nextConfig 