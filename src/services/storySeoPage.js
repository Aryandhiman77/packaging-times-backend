import fs from "node:fs/promises";
import path from "node:path";

import { News } from "../models/index.js";

const esc = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const absolute = (value) => {
  try {
    const url = new URL(value);

    return ["https:", "http:"].includes(url.protocol)
      ? url.href
      : "";
  } catch {
    return "";
  }
};

const meta = (name, value, property = false) =>
  `<meta ${property ? "property" : "name"}="${name}" content="${esc(value)}">`;

export async function storySeoPage(req, res, next) {
  try {
    const story = await News.findOne({
      slug: req.params.slug,
      published: true,
    }).lean();

    if (!story) {
      return res.status(404).send(
        "Article not found"
      );
    }

    const origin = (
      process.env.PUBLIC_SITE_URL ||
      "https://packagingtimes.com"
    ).replace(/\/$/, "");

    const url =
      `${origin}/story/` +
      encodeURIComponent(story.slug);

    const title =
      story.metaTitle || story.title;

    const description =
      story.metaDescription || story.excerpt;

    const image = absolute(story.seoImage);

    const structured = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",

      url,
      headline: story.title,
      description,
      inLanguage: "en-US",
      isAccessibleForFree: true,

      ...(story.category ? { articleSection: story.category } : {}),

      datePublished:
        story.publishedAt?.toISOString?.(),

      dateModified:
        story.updatedAt?.toISOString?.(),

      mainEntityOfPage: url,

      author: {
        "@type": "Organization",
        name: "Packaging Times",
      },

      publisher: {
        "@type": "Organization",
        name: "Packaging Times",
      },

      ...(image ? { image: [image] } : {}),
    };

    const tags = [
      `<title>${esc(title)}</title>`,

      meta("description", description),
      meta("robots", story.robots || "index,follow"),

      `<link rel="canonical" href="${esc(url)}">`,

      meta("og:type", "article", true),
      meta("og:site_name", "Packaging Times", true),
      meta("og:url", url, true),
      meta("og:title", title, true),
      meta("og:description", description, true),

      ...(story.category
        ? [meta("article:section", story.category, true)]
        : []),

      ...(story.publishedAt
        ? [meta("article:published_time", story.publishedAt.toISOString(), true)]
        : []),

      ...(story.updatedAt
        ? [meta("article:modified_time", story.updatedAt.toISOString(), true)]
        : []),

      meta(
        "twitter:card",
        image ? "summary_large_image" : "summary"
      ),
      meta("twitter:title", title),
      meta("twitter:description", description),

      ...(image
        ? [
            meta("og:image", image, true),
            meta("twitter:image", image),
          ]
        : []),

      `<script type="application/ld+json">${
        JSON.stringify(structured).replace(
          /</g,
          "\\u003c"
        )
      }</script>`,
    ].join("\n");

    const dist = path.resolve(
      process.env.SPA_DIST_DIR ||
      "../client/dist"
    );

    const html = await fs.readFile(
      path.join(dist, "index.html"),
      "utf8"
    );

    const output = html
      .replace(
        /<title>[\s\S]*?<\/title>/i,
        ""
      )
      .replace(
        /<meta\s+name=["']description["'][^>]*>/i,
        ""
      )
      .replace(
        "</head>",
        `${tags}</head>`
      );

    res
      .set("Cache-Control", "no-store")
      .type("html")
      .send(output);
  } catch (error) {
    next(error);
  }
}
