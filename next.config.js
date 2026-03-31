/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required when using a custom server with Socket.IO
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    });
    return config;
  },
};

module.exports = nextConfig;
