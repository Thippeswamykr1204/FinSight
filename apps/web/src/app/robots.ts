import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing", "/features", "/faq"],
      disallow: [
        "/dashboard",
        "/transactions",
        "/api/",
        "/app",
        "/auth/",
        "/sign-in",
        "/sign-up",
      ],
    },
    sitemap: `${baseUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
