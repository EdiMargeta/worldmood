/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,

  // Allow images from external sources
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'flagcdn.com' },
    ],
  },

  // Webpack config for react-simple-maps
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    })
    return config
  },
}

module.exports = nextConfig
