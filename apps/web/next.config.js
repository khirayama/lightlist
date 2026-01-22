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
};

export default nextConfig;
