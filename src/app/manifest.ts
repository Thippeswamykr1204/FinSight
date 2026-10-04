import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinSight",
    short_name: "FinSight",
    description: "A calmer way to understand your money.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5f7f6",
    theme_color: "#f5f7f6",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
