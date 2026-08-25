import { defineConfig } from "vocs/config";

export default defineConfig({
  title: "suricato",
  description: "A small WebGL2 graphics library written in TypeScript",
  sidebar: [
    { text: "Introduction", link: "/" },
    { text: "Getting started", link: "/getting-started" },
    { text: "Rendering", link: "/rendering" },
    { text: "Geometry", link: "/geometry" },
    { text: "Materials", link: "/materials" },
    { text: "Loaders", link: "/loaders" },
    { text: "Math", link: "/math" },
  ],
  socials: [
    {
      icon: "github",
      link: "https://github.com/luis-herasme/graphics-library",
    },
  ],
});
