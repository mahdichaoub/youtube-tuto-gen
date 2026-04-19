import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LearnAgent",
    short_name: "LearnAgent",
    description:
      "Submit a YouTube URL + what you're building — get a project-specific action plan in under 90 seconds.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#f59e0b",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
