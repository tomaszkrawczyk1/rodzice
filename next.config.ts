import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "60mb" } },
  // OCR działa lokalnie (WASM + worker): pakiety muszą zostać poza bundlem, a ich pliki w wersji standalone
  serverExternalPackages: ["tesseract.js", "mupdf"],
  // worker tesseract jest ładowany dynamicznie, więc jego zależności trzeba wskazać ręcznie
  outputFileTracingIncludes: { "/api/parser": [...["tesseract.js", "tesseract.js-core", "mupdf", "bmp-js", "idb-keyval", "is-url", "node-fetch", "whatwg-url", "tr46", "webidl-conversions", "opencollective-postinstall", "regenerator-runtime", "wasm-feature-detect", "zlibjs"].map((p) => `./node_modules/${p}/**/*`), "./public/ocr/**/*"] },
};
export default config;
