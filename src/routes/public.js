import { Router } from "express";
import rateLimit from "express-rate-limit";

import { schemas, validateBody } from "../middleware/joi.js";

import {
  Banner,
  News,
  Settings,
  Subscriber,
  Contact,
  AdvertisingInquiry,
  ALL_PAGES,
  ContentPage,
  STORY_CATEGORIES,
} from "../models/index.js";

import { asyncHandler } from "../middleware/validate.js";

import { deliverSubmission } from "../services/notifications.js";

const router = Router();

const formLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many submissions. Please try again later.",
  },
});

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "packaging-times-api",
  });
});

// Fetch published page list for a category.
// HTML body is excluded from this list.

router.get(
  "/content-pages/:category",
  asyncHandler(async (req, res) => {
    const { category } = req.params;

    if (!STORY_CATEGORIES.includes(category)) {
      return res.status(404).json({
        message: "Not found.",
      });
    }

    const docs = await ContentPage.find({
      category,
      status: "published",
    })
      .sort({
        order: 1,
        createdAt: 1,
        _id: 1,
      })
      .select(
        "title slug order metaTitle metaDescription seoImage robots createdAt updatedAt",
      )
      .lean();

    res.json({
      data: docs,
    });
  }),
);

// Fetch a single published page by its slug.
// The HTML body is returned for rendering.

router.get(
  "/content-pages/:category/:slug",
  asyncHandler(async (req, res) => {
    const { category, slug } = req.params;

    if (!STORY_CATEGORIES.includes(category)) {
      return res.status(404).json({
        message: "Not found.",
      });
    }

    const item = await ContentPage.findOne({
      category,
      slug,
      status: "published",
    }).lean();

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

router.get(
  "/settings",
  asyncHandler(async (req, res) => {
    res.json({
      data: await Settings.findOne({
        key: "main",
      }).lean(),
    });
  }),
);

router.get(
  "/banners",
  asyncHandler(async (req, res) => {
    const page = String(req.query.page || "home");

    if (!ALL_PAGES.includes(page)) {
      return res.status(400).json({
        message: "Unknown page.",
      });
    }

    const now = new Date();

    const items = await Banner.find({
      page: { $in: ["global", page] },
      isActive: true,
      $and: [
        {
          $or: [{ startsAt: null }, { startsAt: { $lte: now } }],
        },
        {
          $or: [{ endsAt: null }, { endsAt: { $gte: now } }],
        },
      ],
    })
      .sort({
        priority: -1,
        updatedAt: -1,
      })
      .lean();

    const slots = {};

    const ordered = [
      ...items.filter((x) => x.page === page),
      ...items.filter((x) => x.page === "global"),
    ];

    for (const item of ordered) {
      if (!slots[item.slot]) {
        slots[item.slot] = item;
      }
    }

    res.json({ data: slots });
  }),
);

router.get(
  "/news",
  asyncHandler(async (req, res) => {
    const category = req.query.category;
    const where = { published: true };

    if (category) {
      where.category = category;
    }

    const data = await News.find(where)
      .sort({
        featured: -1,
        publishedAt: -1,
      })
      .limit(40)
      .lean();

    res.json({ data });
  }),
);

router.get(
  "/news/:slug",
  asyncHandler(async (req, res) => {
    const data = await News.findOne({
      slug: req.params.slug,
      published: true,
    }).lean();

    if (!data) {
      return res.status(404).json({
        message: "Story not found.",
      });
    }

    res.json({ data });
  }),
);

router.post(
  "/subscribe",
  formLimit,
  validateBody(schemas.subscribe),
  asyncHandler(async (req, res) => {
    const email = req.body.email;

    const result = await Subscriber.updateOne(
      { email },
      {
        $setOnInsert: {
          name: req.body.name || "",
          email,
        },
      },
      { upsert: true },
    );

    res.status(result.upsertedCount ? 201 : 200).json({
      message: "Thanks! Your subscription is saved.",
    });
  }),
);

router.post(
  "/contact",
  formLimit,
  validateBody(schemas.contact),
  asyncHandler(async (req, res) => {
    const doc = await Contact.create(req.body);

    res.status(201).json({
      message: "Your message is saved. We will be in touch.",
      data: {
        reference: doc._id,
      },
    });

    void deliverSubmission("contact", doc._id).catch((err) =>
      console.error("Contact delivery:", err.message),
    );
  }),
);

router.post(
  "/advertising-inquiries",
  formLimit,
  validateBody(schemas.advertising),
  asyncHandler(async (req, res) => {
    const doc = await AdvertisingInquiry.create(req.body);

    res.status(201).json({
      message: "Advertising enquiry received.",
      data: {
        reference: doc._id,
      },
    });

    void deliverSubmission("advertising", doc._id).catch((err) =>
      console.error("Advertising delivery:", err.message),
    );
  }),
);

export default router;
