import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fijar la raíz del workspace (hay otro lockfile en el home del usuario).
  turbopack: { root: __dirname },
};

export default nextConfig;
