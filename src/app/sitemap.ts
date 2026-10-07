import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return ["", "/pricing", "/features", "/faq", "/privacy", "/terms"].map(
    (path) => ({
      url: `${baseUrl.replace(/\/$/, "")}${path}`,
      lastModified: new Date(),
      changeFrequency: path === "" ? "weekly" : "monthly",
      priority: path === "" ? 1 : 0.6,
    }),
  );
}
