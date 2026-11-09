import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer (via pdfkit) loads its standard-font files
  // dynamically at runtime — Next's file tracing doesn't always pick that
  // up automatically for the deployed serverless bundle, which produced
  // "Cannot find module .../standard-fonts/Helvetica.cjs" in production.
  // Forcing the whole directory in explicitly fixes it regardless of which
  // bundler (webpack/Turbopack) built the function.
  outputFileTracingIncludes: {
    "/api/students/[id]/monthly-report": ["./node_modules/pdfkit/js/standard-fonts/**/*"],
  },
};

export default nextConfig;
