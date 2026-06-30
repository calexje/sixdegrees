import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle the SQLite file into the serverless functions that read it; Vercel
  // can't trace a runtime string path on its own.
  outputFileTracingIncludes: {
    "/": [
      "./database/football.db",
      "./database/expert-puzzles.json",
    ],
    "/api/**": ["./database/football.db"],
  },
};

export default nextConfig;
