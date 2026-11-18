import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OncoNourish",
    short_name: "OncoNourish",
    description: "A synthetic prototype for supportive eating and drinking behavior.",
    start_url: "/login",
    display: "standalone",
    background_color: "#f7f8f6",
    theme_color: "#176b5b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
