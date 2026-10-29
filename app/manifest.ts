import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Magazin hisob-kitob",
    short_name: "Magazin",
    description: "Oziq-ovqat magazini savdo, ombor va moliya boshqaruvi",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f8",
    theme_color: "#102a24",
    lang: "uz",
    orientation: "portrait",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
