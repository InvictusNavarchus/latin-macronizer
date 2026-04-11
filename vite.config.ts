import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "Latin Wikipedia Macronizer",
        namespace: "https://github.com/InvictusNavarchus",
        version: "0.8.0",
        description: "Macronizes Latin text on la.wikipedia.org using alatius macronizer",
        author: "Invictus",
        match: [
          "*://la.wikipedia.org/wiki/*",
          "*://la.m.wikipedia.org/wiki/*",
        ],
        grant: ["GM_xmlhttpRequest"],
        connect: ["latinmacronizer.navarchus.id"],
        "run-at": "document-idle",
        updateURL:
          "https://raw.githubusercontent.com/InvictusNavarchus/latin-Macronizer/master/latin-macronizer.user.js",
        downloadURL:
          "https://raw.githubusercontent.com/InvictusNavarchus/latin-Macronizer/master/latin-macronizer.user.js",
      },
    }),
  ],
  build: {
    // Keep unminified for Greasy Fork compliance
    minify: false,
  },
});