const nextConfig = {
  transpilePackages: ["@lightlist/sdk"],
  experimental: {
    optimizePackageImports: [
      "@lightlist/sdk",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
