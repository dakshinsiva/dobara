import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dobara",
    short_name: "Dobara",
    description: "The proactive retention agent for consumer brands. Voice check-ins that bring customers back.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f2",
    theme_color: "#0f766e",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
