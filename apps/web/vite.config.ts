import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";

const pagePathRedirect = (): Plugin => ({
  name: "page-path-redirect",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const match = req.url?.match(
        /^\/(app|login|sharecodes|password_reset)(\?.*)?$/,
      );
      if (match) {
        res.statusCode = 301;
        res.setHeader("Location", `/${match[1]}/${match[2] ?? ""}`);
        res.end();
        return;
      }
      next();
    });
  },
});

const LP_ORIGIN = "https://lightlist.app";
const LP_DEFAULT_PATH = "/en/";
const LP_FAQ_KEYS = ["free", "share", "devices", "account"];
const LP_LANGUAGES = [
  { code: "ja", path: "/", ogLocale: "ja_JP", dir: "ltr" },
  { code: "en", path: "/en/", ogLocale: "en_US", dir: "ltr" },
  { code: "es", path: "/es/", ogLocale: "es_ES", dir: "ltr" },
  { code: "de", path: "/de/", ogLocale: "de_DE", dir: "ltr" },
  { code: "fr", path: "/fr/", ogLocale: "fr_FR", dir: "ltr" },
  { code: "ko", path: "/ko/", ogLocale: "ko_KR", dir: "ltr" },
  { code: "zh-CN", path: "/zh-cn/", ogLocale: "zh_CN", dir: "ltr" },
  { code: "hi", path: "/hi/", ogLocale: "hi_IN", dir: "ltr" },
  { code: "ar", path: "/ar/", ogLocale: "ar_AR", dir: "rtl" },
  { code: "pt-BR", path: "/pt-br/", ogLocale: "pt_BR", dir: "ltr" },
  { code: "id", path: "/id/", ogLocale: "id_ID", dir: "ltr" },
] as const;

const LEGAL_CONTACT = "support@lightlist.app";
const LEGAL_PAGES = [
  { key: "privacy", slug: "privacy" },
  { key: "terms", slug: "terms" },
  { key: "support", slug: "support" },
  { key: "accountDeletion", slug: "account-deletion" },
] as const;

type LpLanguage = (typeof LP_LANGUAGES)[number];
type LegalPage = (typeof LEGAL_PAGES)[number];
type LegalDocument = {
  title: string;
  description: string;
  intro: string[];
  sections: {
    heading: string;
    body?: string[];
    steps?: string[];
    list?: string[];
  }[];
};
type LegalLocale = { updated: string } & Record<
  LegalPage["key"],
  LegalDocument
>;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const lpAlternateLinks = (indent: string, tag: string, slug = "") =>
  [
    ...LP_LANGUAGES.map(
      ({ code, path }) =>
        `${indent}<${tag} rel="alternate" hreflang="${code}" href="${LP_ORIGIN}${path}${slug}" />`,
    ),
    `${indent}<${tag} rel="alternate" hreflang="x-default" href="${LP_ORIGIN}${LP_DEFAULT_PATH}${slug}" />`,
  ].join("\n");

const readLpLocales = (): Record<string, Record<string, string>> =>
  JSON.parse(
    readFileSync(resolve(import.meta.dirname, "src/lp-locales.json"), "utf8"),
  );

const readLegalLocale = (code: string): LegalLocale =>
  JSON.parse(
    readFileSync(
      resolve(import.meta.dirname, `src/legal/${code}.json`),
      "utf8",
    ),
  );

const legalPath = (language: LpLanguage, page: LegalPage) =>
  `${language.path}${page.slug}/`;

const localizeLegalLinks = (html: string, language: LpLanguage) =>
  LEGAL_PAGES.reduce(
    (result, page) =>
      result.replaceAll(
        `href="/${page.slug}/"`,
        `href="${legalPath(language, page)}"`,
      ),
    html,
  );

const legalText = (value: string) =>
  escapeHtml(value).replaceAll(
    LEGAL_CONTACT,
    `<a href="mailto:${LEGAL_CONTACT}">${LEGAL_CONTACT}</a>`,
  );

const legalList = (tag: string, items: string[] | undefined) =>
  items
    ? `<${tag}>${items.map((item) => `<li>${legalText(item)}</li>`).join("")}</${tag}>`
    : "";

const localizeLegalHtml = (
  source: string,
  language: LpLanguage,
  page: LegalPage,
) => {
  const locale = readLegalLocale(language.code);
  const lpLocales = readLpLocales();
  const document = locale[page.key];
  const pageUrl = `${LP_ORIGIN}${legalPath(language, page)}`;
  const paragraphs = (items: string[] | undefined, className = "") =>
    (items ?? [])
      .map(
        (item, index) =>
          `<p${className && index === 0 ? ` class="${className}"` : ""}>${legalText(item)}</p>`,
      )
      .join("");
  const content = [
    `<h1>${escapeHtml(document.title)}</h1>`,
    `<p class="ll-legal-updated">${escapeHtml(locale.updated)}</p>`,
    paragraphs(document.intro, "ll-legal-intro"),
    ...document.sections.map(
      (section) =>
        `<section><h2>${escapeHtml(section.heading)}</h2>${paragraphs(section.body)}${legalList("ol", section.steps)}${legalList("ul", section.list)}</section>`,
    ),
  ].join("\n");
  const nav = LEGAL_PAGES.map(
    (entry) =>
      `<a href="${legalPath(language, entry)}"${entry.key === page.key ? ' aria-current="page"' : ""}>${escapeHtml(locale[entry.key].title)}</a>`,
  ).join("");

  return source
    .replace(
      /<html lang="[^"]*" dir="[^"]*">/,
      () => `<html lang="${language.code}" dir="${language.dir}">`,
    )
    .replace(
      /<title>[^<]*<\/title>/,
      () => `<title>${escapeHtml(document.title)} | Lightlist</title>`,
    )
    .replace(
      /(<meta\s+name="description"\s+content=")[^"]*"/,
      (_, head: string) => `${head}${escapeHtml(document.description)}"`,
    )
    .replace(
      /(<link rel="canonical" href=")[^"]*"/,
      (_, head: string) => `${head}${pageUrl}"`,
    )
    .replace(
      /(<([a-z0-9]+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)[^<]*(<\/\2>)/g,
      (_, open: string, _tag: string, key: string, close: string) =>
        `${open}${escapeHtml(lpLocales[language.code][key] ?? lpLocales.ja[key])}${close}`,
    )
    .replaceAll('href="/"', `href="${language.path}"`)
    .replace("<!--legal:content-->", () => content)
    .replace("<!--legal:nav-->", () => nav)
    .replace(
      "</head>",
      () => `${lpAlternateLinks("    ", "link", `${page.slug}/`)}\n  </head>`,
    );
};

const localizeLandingHtml = (source: string, path: string) => {
  const language =
    LP_LANGUAGES.find((entry) => entry.path === path) ?? LP_LANGUAGES[0];
  const locales = readLpLocales();
  const legal = readLegalLocale(language.code);
  const legalTitles: Record<string, string> = Object.fromEntries(
    LEGAL_PAGES.map(({ key }) => [`legal.${key}.title`, legal[key].title]),
  );
  const t = (key: string) =>
    legalTitles[key] ?? locales[language.code][key] ?? locales.ja[key];
  const pageUrl = `${LP_ORIGIN}${language.path}`;
  const title = t("pages.index.seo.title");
  const description = t("pages.index.seo.description");

  let html = source
    .replace(
      /<html lang="[^"]*" dir="[^"]*">/,
      () => `<html lang="${language.code}" dir="${language.dir}">`,
    )
    .replace(
      /<title>[^<]*<\/title>/,
      () => `<title>${escapeHtml(title)}</title>`,
    )
    .replace(
      /(<link rel="canonical" href=")[^"]*"/,
      (_, head: string) => `${head}${pageUrl}"`,
    )
    .replace(
      /(<([a-z0-9]+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)[^<]*(<\/\2>)/g,
      (_, open: string, _tag: string, key: string, close: string) =>
        `${open}${escapeHtml(t(key))}${close}`,
    )
    .replace(
      /(<img\b[^>]*?\salt=")[^"]*("[^>]*\sdata-i18n-alt="([^"]+)")/g,
      (_, head: string, rest: string, key: string) =>
        `${head}${escapeHtml(t(key))}${rest}`,
    )
    .replace(
      `<option value="${language.code}">`,
      () => `<option value="${language.code}" selected>`,
    );

  const metas: [string, string][] = [
    ['name="description"', description],
    ['name="keywords"', t("pages.index.seo.keywords")],
    ['property="og:title"', title],
    ['property="og:description"', description],
    ['property="og:url"', pageUrl],
    ['property="og:locale"', language.ogLocale],
    ['property="og:image:alt"', t("pages.index.preview.desktopAlt")],
    ['name="twitter:title"', title],
    ['name="twitter:description"', description],
  ];
  for (const [attribute, content] of metas) {
    html = html.replace(
      new RegExp(`(<meta\\s+${attribute}\\s+content=")[^"]*"`),
      (_, head: string) => `${head}${escapeHtml(content)}"`,
    );
  }

  if (language.code !== "ja") {
    html = html.replaceAll(
      'href="/login/"',
      `href="/login/?lang=${language.code}"`,
    );
  }
  html = localizeLegalLinks(html, language);

  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Lightlist",
        url: pageUrl,
        description,
        inLanguage: language.code,
        applicationCategory: "ProductivityApplication",
        operatingSystem: "Web",
        image: `${LP_ORIGIN}/og-image.png`,
        offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
      },
      {
        "@type": "FAQPage",
        inLanguage: language.code,
        mainEntity: LP_FAQ_KEYS.map((key) => ({
          "@type": "Question",
          name: t(`pages.index.faq.${key}.question`),
          acceptedAnswer: {
            "@type": "Answer",
            text: t(`pages.index.faq.${key}.answer`),
          },
        })),
      },
    ],
  }).replace(/</g, "\\u003c");

  return html.replace(
    "</head>",
    () =>
      `${lpAlternateLinks("    ", "link")}\n    <script type="application/ld+json">${structuredData}</script>\n  </head>`,
  );
};

const LEGAL_ROUTES = LP_LANGUAGES.flatMap((language) =>
  LEGAL_PAGES.map((page) => ({
    language,
    page,
    path: legalPath(language, page),
  })),
);

const findLegalRoute = (pathname: string | undefined) =>
  LEGAL_ROUTES.find(({ path }) => path === pathname);

const landingPages = (): Plugin => {
  let outDir = "";
  let isBuild = false;
  return {
    name: "landing-pages",
    configResolved(config) {
      outDir = config.build.outDir;
      isBuild = config.command === "build";
    },
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const pathname = req.url?.split("?")[0];
        if (
          LP_LANGUAGES.some(({ path }) => path !== "/" && path === pathname)
        ) {
          req.url = "/index.html";
        } else if (findLegalRoute(pathname)) {
          req.url = "/legal/index.html";
        }
        next();
      });
    },
    transformIndexHtml(html, ctx) {
      if (!ctx.server) return html;
      const pathname = (ctx.originalUrl ?? "/").split("?")[0];
      if (ctx.path === "/legal/index.html") {
        const route = findLegalRoute(pathname) ?? LEGAL_ROUTES[0];
        return localizeLegalHtml(html, route.language, route.page);
      }
      if (ctx.path !== "/index.html") return html;
      return localizeLandingHtml(html, pathname);
    },
    closeBundle() {
      const indexPath = resolve(outDir, "index.html");
      if (!isBuild || !existsSync(indexPath)) return;
      const source = readFileSync(indexPath, "utf8");
      for (const { path } of LP_LANGUAGES) {
        const dir = resolve(outDir, `.${path}`);
        mkdirSync(dir, { recursive: true });
        writeFileSync(
          resolve(dir, "index.html"),
          localizeLandingHtml(source, path),
        );
      }
      const legalDir = resolve(outDir, "legal");
      const legalSource = readFileSync(resolve(legalDir, "index.html"), "utf8");
      rmSync(legalDir, { recursive: true });
      for (const { language, page, path } of LEGAL_ROUTES) {
        const dir = resolve(outDir, `.${path}`);
        mkdirSync(dir, { recursive: true });
        writeFileSync(
          resolve(dir, "index.html"),
          localizeLegalHtml(legalSource, language, page),
        );
      }
      writeFileSync(
        resolve(outDir, "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${LP_LANGUAGES.map(
          ({ path }) =>
            `  <url>\n    <loc>${LP_ORIGIN}${path}</loc>\n${lpAlternateLinks("    ", "xhtml:link")}\n  </url>`,
        ).join("\n")}\n${LEGAL_ROUTES.map(
          ({ page, path }) =>
            `  <url>\n    <loc>${LP_ORIGIN}${path}</loc>\n${lpAlternateLinks("    ", "xhtml:link", `${page.slug}/`)}\n  </url>`,
        ).join("\n")}\n</urlset>\n`,
      );
    },
  };
};

export default defineConfig({
  root: resolve(import.meta.dirname, "html"),
  base: "/",
  appType: "mpa",
  plugins: [pagePathRedirect(), landingPages(), react()],
  publicDir: resolve(import.meta.dirname, "public"),
  resolve: {
    alias: {
      "/src": resolve(import.meta.dirname, "src"),
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  envDir: import.meta.dirname,
  build: {
    outDir: resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 550,
    rolldownOptions: {
      input: {
        index: resolve(import.meta.dirname, "html/index.html"),
        legal: resolve(import.meta.dirname, "html/legal/index.html"),
        login: resolve(import.meta.dirname, "html/login/index.html"),
        app: resolve(import.meta.dirname, "html/app/index.html"),
        passwordReset: resolve(
          import.meta.dirname,
          "html/password_reset/index.html",
        ),
        sharecodes: resolve(import.meta.dirname, "html/sharecodes/index.html"),
        notFound: resolve(import.meta.dirname, "html/404.html"),
        serverError: resolve(import.meta.dirname, "html/500.html"),
      },
      output: {
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            {
              name: "firebase-analytics",
              test: /node_modules\/(?:firebase\/analytics|@firebase\/analytics)/,
            },
            {
              name: "firebase-auth",
              test: /node_modules\/(?:firebase\/auth|@firebase\/auth)/,
            },
            {
              name: "firebase-firestore",
              test: /node_modules\/(?:firebase\/firestore|@firebase\/firestore)\//,
            },
            {
              name: "firebase-core",
              test: /node_modules\/(?:@firebase|firebase|idb|re2js)\//,
            },
            {
              name: "date-fns-default",
              test: /node_modules\/date-fns\/locale\/(?:en-US(?:\/|\.js|$)|_lib(?:\/|\.js|$))/,
            },
            { name: "date-fns", test: /node_modules\/date-fns\/(?!locale\/)/ },
            {
              name: "i18n",
              test: /node_modules\/(?:@babel\/runtime|html-parse-stringify|i18next|react-i18next|use-sync-external-store)\//,
            },
            {
              name: "app-ui",
              test: /node_modules\/(?:@dnd-kit|@preact\/signals-core|@radix-ui|aria-hidden|cmdk|detect-node-es|get-nonce|react-remove-scroll|react-remove-scroll-bar|react-style-singleton|tslib|use-callback-ref|use-sidecar)\//,
            },
            {
              name: "react-vendor",
              test: /node_modules\/(?:react|react-dom|scheduler)\//,
            },
          ],
        },
      },
    },
  },
});
