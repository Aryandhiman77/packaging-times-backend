import { Router } from "express";
import { schemas, validateBody, validateId } from "../middleware/joi.js";
import { asyncHandler } from "../middleware/validate.js";
import {
  oneImage,
  saveImage,
  deleteImage,
  servedImageUrl,
} from "../utils/upload.js";
import sanitizeHtml from "sanitize-html";
import {
  Banner,
  News,
  Settings,
  Subscriber,
  Contact,
  AdvertisingInquiry,
  ContentPage,
  PackagingBrief,
  STORY_CATEGORIES,
} from "../models/index.js";

import { deliverSubmission } from "../services/notifications.js";
const router = Router();
const PAGE_SIZE = 10;
const DEFAULT_PACKAGING_BRIEF_HTML = "<h1>PACKAGING BRIEF</h1><p></p>";

const cleanContent = (raw) =>
  sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "div",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "span",
      "figure",
      "figcaption",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "u",
      "s",
    ]),

    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,

      "*": ["class", "style"],

      a: ["href", "name", "target", "rel", "class", "style"],

      img: ["src", "alt", "width", "height", "loading", "style", "class"],
    },

    allowedStyles: {
      "*": {
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(.*\)$/, /^[a-zA-Z]+$/],

        "background-color": [
          /^#[0-9a-fA-F]{3,8}$/,
          /^rgb\(.*\)$/,
          /^[a-zA-Z]+$/,
        ],

        "text-align": [/^(left|right|center|justify)$/],

        "font-size": [/^\d+(?:\.\d+)?(px|em|rem|%)$/],

        "font-family": [
          /^(?:["']?[a-zA-Z][a-zA-Z0-9 -]*["']?)(?:,\s*(?:["']?[a-zA-Z][a-zA-Z0-9 -]*["']?))*$/,
        ],

        "line-height": [
          /^\d+(?:\.\d+)?$/,
          /^\d+(?:\.\d+)?(px|em|rem|%)$/,
        ],
      },
    },

    allowedSchemes: ["http", "https", "mailto"],

    allowProtocolRelative: false,

    transformTags: {
      a: (name, attrs) => ({
        tagName: "a",

        attribs:
          attrs.target === "_blank"
            ? {
                ...attrs,
                rel: "noopener noreferrer",
              }
            : attrs,
      }),
    },
  });

router.get(
  "/packaging-brief",
  asyncHandler(async (_req, res) => {
    const item = await PackagingBrief.findOne({ key: "main" }).lean();
    res.json({
      data: {
        ...(item || { updatedAt: null }),
        html: item?.html?.trim() || DEFAULT_PACKAGING_BRIEF_HTML,
      },
    });
  }),
);

router.patch(
  "/packaging-brief",
  validateBody(schemas.packagingBrief),
  asyncHandler(async (req, res) => {
    const item = await PackagingBrief.findOneAndUpdate(
      { key: "main" },
      { $set: { html: cleanContent(req.body.html) } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

    res.json({ data: item, message: "Packaging Brief content saved." });
  }),
);

const slugTaken = (err) => err?.code === 11000;

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const searchWhere = (value, fields) => {
  const term = String(value || "")
    .trim()
    .slice(0, 120);
  if (!term) return {};
  const regex = new RegExp(escapeRegex(term), "i");
  return { $or: fields.map((field) => ({ [field]: regex })) };
};

async function paginated(
  Model,
  where,
  req,
  sort = { updatedAt: -1, createdAt: -1 },
) {
  const requestedPage = Number.parseInt(req.query.page, 10);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const total = await Model.countDocuments(where);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const items = await Model.find(where)
    .sort(sort)
    .skip((safePage - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();

  return {
    items,
    pagination: {
      page: safePage,
      pageSize: PAGE_SIZE,
      total,
      totalPages,
      hasPrevious: safePage > 1,
      hasNext: safePage < totalPages,
    },
  };
}

const bannerLifecycle = (item, now = Date.now()) => {
  if (item.endsAt && new Date(item.endsAt).getTime() < now) return "expired";
  if (!item.isActive) return "inactive";
  if (item.startsAt && new Date(item.startsAt).getTime() > now)
    return "scheduled";
  return "active";
};

const toBool = (v) => v === true || v === "true";
const bannerData = (b) => ({
  title: b.title,
  altText: b.altText || "",
  page: b.page,
  contentPage: b.contentPage || null,
  slot: b.slot,
  targetUrl: b.targetUrl || "",
  priority: Number(b.priority || 0),
  isActive: b.isActive === undefined ? true : toBool(b.isActive),
  startsAt: b.startsAt ? new Date(b.startsAt) : null,
  endsAt: b.endsAt ? new Date(b.endsAt) : null,
});
function dateRangeOk(data) {
  return !(data.startsAt && data.endsAt && data.startsAt > data.endsAt);
}

async function validateBannerScope(data) {
  if (!data.contentPage) return;

  if (!STORY_CATEGORIES.includes(data.page)) {
    throw Object.assign(
      new Error("Individual content pages can only be selected for category banners."),
      { status: 422 },
    );
  }

  const exists = await ContentPage.exists({
    _id: data.contentPage,
    category: data.page,
  });

  if (!exists) {
    throw Object.assign(
      new Error("The selected content page does not belong to this category."),
      { status: 422 },
    );
  }
}

// Upload an image from the category content editor.

router.post(
  "/content-images",
  oneImage,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(422).json({
        message: "Select an image.",
      });
    }

    const url = await saveImage(req.file);

    res.status(201).json({
      data: {
        url,
      },
    });
  }),
);

// List admin content pages.
// Supports category, status, search and pagination.

router.get(
  "/content-pages",
  asyncHandler(async (req, res) => {
    const where = {
      ...searchWhere(req.query.search, ["title", "slug", "html"]),
    };

    if (req.query.category && req.query.category !== "all") {
      if (!STORY_CATEGORIES.includes(req.query.category)) {
        return res.status(400).json({
          message: "Invalid category.",
        });
      }

      where.category = req.query.category;
    }

    if (req.query.status && req.query.status !== "all") {
      if (!["draft", "published"].includes(req.query.status)) {
        return res.status(400).json({
          message: "Invalid status.",
        });
      }

      where.status = req.query.status;
    }

    const data = await paginated(ContentPage, where, req, {
      category: 1,
      order: 1,
      createdAt: 1,
      _id: 1,
    });

    if (where.category) {
      const latest = await ContentPage.findOne({
        category: where.category,
      })
        .sort({ order: -1 })
        .select("order")
        .lean();

      data.nextOrder = (latest?.order || 0) + 1;
    }

    res.json({
      data,
    });
  }),
);

// Get one admin content page.

router.get(
  "/content-pages/:id",
  validateId,
  asyncHandler(async (req, res) => {
    const item = await ContentPage.findById(req.params.id).lean();

    if (!item) {
      return res.status(404).json({
        message: "Page not found.",
      });
    }

    res.json({
      data: item,
    });
  }),
);

// Lightweight page list used by the banner editor to scope an ad to one
// editor-produced category page.

router.get(
  "/content-page-options/:category",
  asyncHandler(async (req, res) => {
    if (!STORY_CATEGORIES.includes(req.params.category)) {
      return res.status(400).json({ message: "Invalid category." });
    }

    const items = await ContentPage.find({ category: req.params.category })
      .sort({ order: 1, createdAt: 1, _id: 1 })
      .select("title slug order status")
      .lean();

    res.json({ data: items });
  }),
);

// Create a new content page.

router.post(
  "/content-pages",
  validateBody(schemas.contentPage),
  asyncHandler(async (req, res) => {
    try {
      const item = await ContentPage.create({
        ...req.body,

        html: cleanContent(req.body.html),
      });

      res.status(201).json({
        data: item,
      });
    } catch (err) {
      if (slugTaken(err)) {
        return res.status(409).json({
          message: "This category already has a page with that slug.",
        });
      }

      throw err;
    }
  }),
);

// Update an existing content page.

router.patch(
  "/content-pages/:id",
  validateId,
  validateBody(schemas.contentPage),
  asyncHandler(async (req, res) => {
    try {
      const item = await ContentPage.findByIdAndUpdate(
        req.params.id,

        {
          $set: {
            ...req.body,
            html: cleanContent(req.body.html),
          },
        },

        {
          new: true,
          runValidators: true,
        },
      );

      if (!item) {
        return res.status(404).json({
          message: "Page not found.",
        });
      }

      res.json({
        data: item,
      });
    } catch (err) {
      if (slugTaken(err)) {
        return res.status(409).json({
          message: "This category already has a page with that slug.",
        });
      }

      throw err;
    }
  }),
);

// Delete a content page.

router.delete(
  "/content-pages/:id",
  validateId,
  asyncHandler(async (req, res) => {
    const removed = await ContentPage.findByIdAndDelete(req.params.id);

    if (!removed) {
      return res.status(404).json({
        message: "Page not found.",
      });
    }

    const scopedBanners = await Banner.find({ contentPage: removed._id })
      .select("imageUrl")
      .lean();

    await Banner.deleteMany({ contentPage: removed._id });
    await Promise.all(scopedBanners.map((banner) => deleteImage(banner.imageUrl)));

    res.json({
      message: "Page and its page-specific banners deleted.",
    });
  }),
);

router.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const [
      banners,
      news,
      subscribers,
      messages,
      advertisingInquiries,
      unreadContacts,
      unreadAdvertising,
      latestContacts,
      latestAdvertising,
    ] = await Promise.all([
      Banner.countDocuments(),
      News.countDocuments(),
      Subscriber.countDocuments(),
      Contact.countDocuments(),
      AdvertisingInquiry.countDocuments(),
      Contact.countDocuments({ isRead: false }),
      AdvertisingInquiry.countDocuments({ isRead: false }),

      Contact.find().sort({ updatedAt: -1, createdAt: -1 }).limit(5).lean(),

      AdvertisingInquiry.find()
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const latest = [
      ...latestContacts.map((x) => ({
        ...x,
        type: "contact",
      })),

      ...latestAdvertising.map((x) => ({
        ...x,
        type: "advertising",
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt) -
          new Date(a.updatedAt || a.createdAt),
      )
      .slice(0, 7);

    res.json({
      data: {
        banners,
        news,
        subscribers,
        messages,
        advertisingInquiries,
        unreadContacts,
        unreadAdvertising,
        latest,
      },
    });
  }),
);
router.get(
  "/banners",
  asyncHandler(async (req, res) => {
    const now = new Date();
    const where = {
      ...searchWhere(req.query.search, [
        "title",
        "altText",
        "targetUrl",
        "slot",
      ]),
    };

    if (req.query.sitePage && req.query.sitePage !== "all") {
      where.page = req.query.sitePage;
    }

    if (req.query.status === "expired") {
      where.endsAt = { $ne: null, $lt: now };
    } else if (req.query.status === "inactive") {
      where.isActive = false;
    } else if (req.query.status === "scheduled") {
      where.isActive = true;
      where.startsAt = { $gt: now };
      where.$and = [{ $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }];
    } else if (req.query.status === "active") {
      where.isActive = true;
      where.$and = [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ];
    }

    const data = await paginated(Banner, where, req);
    const contentPageIds = data.items
      .map((item) => item.contentPage)
      .filter(Boolean);
    const contentPages = await ContentPage.find({
      _id: { $in: contentPageIds },
    })
      .select("title slug order status")
      .lean();
    const contentPageById = new Map(
      contentPages.map((item) => [String(item._id), item]),
    );

    data.items = data.items.map((item) => ({
      ...item,
      imageUrl: servedImageUrl(item.imageUrl),
      contentPageInfo: item.contentPage
        ? contentPageById.get(String(item.contentPage)) || null
        : null,
      lifecycleStatus: bannerLifecycle(item),
    }));
    res.json({ data });
  }),
);
router.post(
  "/banners",
  oneImage,
  validateBody(schemas.banner),
  asyncHandler(async (req, res) => {
    if (!req.file)
      return res
        .status(422)
        .json({ message: "Choose one image to create a banner." });
    const data = bannerData(req.body);
    await validateBannerScope(data);
    if (!dateRangeOk(data))
      return res
        .status(422)
        .json({ message: "End date must be after start date." });
    const existing = await Banner.exists({
      page: data.page,
      contentPage: data.contentPage,
      slot: data.slot,
    });
    if (existing)
      return res.status(409).json({
        message:
          "A banner already exists in this page and slot. Edit that banner to replace it.",
      });
    const imageUrl = await saveImage(req.file);
    try {
      const item = await Banner.create({ ...data, imageUrl });
      res.status(201).json({ data: item, message: "Banner added." });
    } catch (err) {
      await deleteImage(imageUrl);
      throw err;
    }
  }),
);
router.patch(
  "/banners/:id",
  validateId,
  oneImage,
  validateBody(schemas.banner),
  asyncHandler(async (req, res) => {
    const item = await Banner.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Banner not found." });
    const data = bannerData(req.body);
    await validateBannerScope(data);
    if (!dateRangeOk(data))
      return res
        .status(422)
        .json({ message: "End date must be after start date." });
    const other = await Banner.exists({
      page: data.page,
      contentPage: data.contentPage,
      slot: data.slot,
      _id: { $ne: item._id },
    });
    if (other)
      return res
        .status(409)
        .json({ message: "Another banner uses that page and slot." });
    const oldImage = item.imageUrl,
      newImage = await saveImage(req.file);
    Object.assign(item, data);
    if (newImage) item.imageUrl = newImage;
    try {
      await item.save();
      if (newImage) await deleteImage(oldImage);
      res.json({ data: item, message: "Banner updated." });
    } catch (err) {
      if (newImage) await deleteImage(newImage);
      throw err;
    }
  }),
);
router.delete(
  "/banners/:id",
  validateId,
  asyncHandler(async (req, res) => {
    const item = await Banner.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Banner not found." });
    await deleteImage(item.imageUrl);
    res.json({ message: "Banner deleted." });
  }),
);
router.get(
  "/news",
  asyncHandler(async (req, res) => {
    const where = {
      ...searchWhere(req.query.search, [
        "title",
        "excerpt",
        "body",
        "category",
      ]),
    };
    if (req.query.category && req.query.category !== "all") {
      where.category = req.query.category;
    }
    if (["true", "false"].includes(req.query.published)) {
      where.published = req.query.published === "true";
    }
    if (["true", "false"].includes(req.query.featured)) {
      where.featured = req.query.featured === "true";
    }
    res.json({ data: await paginated(News, where, req) });
  }),
);
const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 75) || "story";
function newsData(b) {
  return {
    title: b.title,
    excerpt: b.excerpt,
    body: b.body,
    category: b.category,

    published: toBool(b.published),
    featured: toBool(b.featured),

    metaTitle: b.metaTitle || "",
    metaDescription: b.metaDescription || "",
    seoImage: b.seoImage || "",
    robots: b.robots || "index,follow",
  };
}
router.post(
  "/news",
  validateBody(schemas.news),
  asyncHandler(async (req, res) => {
    const data = newsData(req.body);
    const slug = slugify(data.title) + "-" + Date.now().toString(36);
    const item = await News.create({ ...data, slug, publishedAt: new Date() });
    res.status(201).json({ data: item, message: "Story added." });
  }),
);
router.patch(
  "/news/:id",
  validateId,
  validateBody(schemas.news),
  asyncHandler(async (req, res) => {
    const item = await News.findByIdAndUpdate(
      req.params.id,
      { $set: newsData(req.body) },
      { new: true, runValidators: true },
    );
    if (!item) return res.status(404).json({ message: "Story not found." });
    res.json({ data: item, message: "Story updated." });
  }),
);
router.delete(
  "/news/:id",
  validateId,
  asyncHandler(async (req, res) => {
    const item = await News.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Story not found." });
    res.json({ message: "Story removed." });
  }),
);
router.get(
  "/settings",
  asyncHandler(async (req, res) =>
    res.json({ data: await Settings.findOne({ key: "main" }).lean() }),
  ),
);
const settingFields = [
  "tagline",
  "heroHeading",
  "heroIntro",
  "mailingAddress",
  "advertisingEmail",
  "trendingEmail",
  "facebook",
  "youtube",
  "linkedin",
  "x",
];
router.patch(
  "/settings",
  validateBody(schemas.settings),
  asyncHandler(async (req, res) => {
    const data = Object.fromEntries(
      settingFields
        .filter((k) => Object.hasOwn(req.body, k))
        .map((k) => [k, req.body[k]]),
    );
    const item = await Settings.findOneAndUpdate(
      { key: "main" },
      { $set: data },
      { new: true, upsert: true, runValidators: true },
    );
    res.json({ data: item, message: "Website settings saved." });
  }),
);
router.get(
  "/subscribers",
  asyncHandler(async (req, res) => {
    const where = searchWhere(req.query.search, [
      "name",
      "firstName",
      "lastName",
      "company",
      "email",
    ]);
    res.json({ data: await paginated(Subscriber, where, req) });
  }),
);

router.delete(
  "/subscribers/:id",
  validateId,
  asyncHandler(async (req, res) => {
    const item = await Subscriber.findByIdAndUpdate(
      req.params.id,
      { $set: { active: false, unsubscribedAt: new Date() } },
      { new: true },
    );
    if (!item)
      return res.status(404).json({ message: "Subscriber not found." });
    res.json({ message: "Subscriber unsubscribed." });
  }),
);
router.get(
  "/messages",
  asyncHandler(async (req, res) => {
    const where = searchWhere(req.query.search, [
      "name",
      "email",
      "subject",
      "message",
      "adminNote",
    ]);
    if (req.query.status && req.query.status !== "all")
      where.status = req.query.status;
    if (["true", "false"].includes(req.query.read)) {
      where.isRead = req.query.read === "true";
    }
    res.json({ data: await paginated(Contact, where, req) });
  }),
);

router.get(
  "/advertising-inquiries",
  asyncHandler(async (req, res) => {
    const where = searchWhere(req.query.search, [
      "name",
      "email",
      "company",
      "placement",
      "budget",
      "message",
      "adminNote",
    ]);
    if (req.query.status && req.query.status !== "all")
      where.status = req.query.status;
    if (["true", "false"].includes(req.query.read)) {
      where.isRead = req.query.read === "true";
    }
    res.json({ data: await paginated(AdvertisingInquiry, where, req) });
  }),
);

const recordModel = (type) =>
  type === "advertising-inquiries" ? AdvertisingInquiry : Contact;

router.patch(
  "/:type/:id",
  validateId,
  validateBody(schemas.tracking),

  asyncHandler(async (req, res) => {
    if (!["messages", "advertising-inquiries"].includes(req.params.type)) {
      return res.status(404).json({
        message: "Unknown enquiry type.",
      });
    }

    const data = await recordModel(req.params.type).findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...req.body,
          isRead: req.body.isRead ?? true,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!data) {
      return res.status(404).json({
        message: "Enquiry not found.",
      });
    }

    res.json({ data });
  }),
);

router.post(
  "/:type/:id/retry-emails",
  validateId,

  asyncHandler(async (req, res) => {
    if (!["messages", "advertising-inquiries"].includes(req.params.type)) {
      return res.status(404).json({
        message: "Unknown enquiry type.",
      });
    }

    const Model = recordModel(req.params.type);

    const doc = await Model.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({
        message: "Enquiry not found.",
      });
    }

    const type = req.params.type === "messages" ? "contact" : "advertising";

    await deliverSubmission(type, doc._id);

    res.json({
      data: await Model.findById(doc._id).lean(),
    });
  }),
);

export default router;
