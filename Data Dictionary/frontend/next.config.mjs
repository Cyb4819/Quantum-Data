/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      // Marquer sqlite3 comme externe pour qu'il ne soit pas bundlé
      config.externals.push('sqlite3');
    }
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        module: false,
        perf_hooks: false,
      };
    }
    return config;
  },

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;