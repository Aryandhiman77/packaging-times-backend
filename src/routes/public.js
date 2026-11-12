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
  PackagingBrief,
  STORY_CATEGORIES,
} from "../models/index.js";

import { asyncHandler } from "../middleware/validate.js";
import { servedImageUrl } from "../utils/upload.js";

import { deliverSubmission } from "../services/notifications.js";

const router = Router();
const DEFAULT_PACKAGING_BRIEF_HTML = "<h1>PACKAGING BRIEF</h1><p></p>";

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

router.get(
  "/packaging-brief",
  asyncHandler(async (_req, res) => {
    const item = await PackagingBrief.findOne({ key: "main" })
      .select("html updatedAt")
      .lean();

    res.json({
      data: {
        ...(item || { updatedAt: null }),
        html: item?.html?.trim() || DEFAULT_PACKAGING_BRIEF_HTML,
      },
    });
  }),
);

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
    const requestedContentPage = String(req.query.contentPage || "")
      .trim()
      .toLowerCase();
    let scopedContentPage = null;

    if (STORY_CATEGORIES.includes(page)) {
      const pageQuery = {
        category: page,
        status: "published",
      };

      if (requestedContentPage) {
        pageQuery.slug = requestedContentPage;
      }

      scopedContentPage = await ContentPage.findOne(pageQuery)
        .sort({ order: 1, createdAt: 1, _id: 1 })
        .select("_id")
        .lean();
    }

    const allowedScopes = [{ contentPage: null }];

    if (scopedContentPage) {
      allowedScopes.push({ contentPage: scopedContentPage._id });
    }

    const items = await Banner.find({
      page: { $in: ["global", page] },
      isActive: true,
      $or: allowedScopes,
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
    const scopedId = scopedContentPage ? String(scopedContentPage._id) : "";

    const ordered = [
      ...items.filter(
        (x) =>
          x.page === page &&
          scopedId &&
          String(x.contentPage || "") === scopedId,
      ),
      ...items.filter((x) => x.page === page && !x.contentPage),
      ...items.filter((x) => x.page === "global" && !x.contentPage),
    ];

    for (const item of ordered) {
      if (!slots[item.slot]) {
        slots[item.slot] = {
          ...item,
          imageUrl: servedImageUrl(item.imageUrl),
        };
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
    const { firstName, lastName, ...details } = req.body;
    const existing = await Subscriber.exists({ email: details.email });
    await Subscriber.findOneAndUpdate(
      { email: details.email },
      {
        $set: {
          ...details,
          firstName,
          lastName,
          name: `${firstName} ${lastName}`.trim(),
          active: true,
          unsubscribedAt: null,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    res.status(existing ? 200 : 201).json({
      message: "Your free Packaging Times subscription has been received.",
    });
  }),
);

router.post(
  "/subscription/find",
  formLimit,
  validateBody(schemas.subscriptionLookup),
  asyncHandler(async (req, res) => {
    const subscriber = await Subscriber.findOne({ email: req.body.email })
      .select(
        "email firstName lastName company jobTitle interests emailPreferences active",
      )
      .lean();

    if (!subscriber) {
      return res.status(404).json({ message: "Subscription not found." });
    }

    res.json({ data: subscriber });
  }),
);

router.patch(
  "/subscription",
  formLimit,
  validateBody(schemas.subscriptionUpdate),
  asyncHandler(async (req, res) => {
    const { email, firstName, lastName, ...details } = req.body;
    const subscriber = await Subscriber.findOneAndUpdate(
      { email },
      {
        $set: {
          ...details,
          firstName,
          lastName,
          name: `${firstName} ${lastName}`.trim(),
          active: true,
          unsubscribedAt: null,
        },
      },
      { new: true, runValidators: true },
    );

    if (!subscriber) {
      return res.status(404).json({ message: "Subscription not found." });
    }

    res.json({ message: "Your subscription preferences have been saved." });
  }),
);

router.patch(
  "/subscription/email",
  formLimit,
  validateBody(schemas.subscriptionEmail),
  asyncHandler(async (req, res) => {
    const { currentEmail, newEmail, confirmEmail } = req.body;
    if (newEmail !== confirmEmail) {
      return res.status(422).json({ message: "New e-mail addresses do not match." });
    }

    const alreadyUsed =
      currentEmail === newEmail
        ? false
        : await Subscriber.exists({ email: newEmail });
    if (alreadyUsed && currentEmail !== newEmail) {
      return res.status(409).json({ message: "That e-mail address is already subscribed." });
    }

    const subscriber = await Subscriber.findOneAndUpdate(
      { email: currentEmail },
      { $set: { email: newEmail } },
      { new: true, runValidators: true },
    );
    if (!subscriber) {
      return res.status(404).json({ message: "Subscription not found." });
    }

    res.json({ message: "Your e-mail address has been updated.", data: { email: newEmail } });
  }),
);

router.post(
  "/subscription/unsubscribe",
  formLimit,
  validateBody(schemas.subscriptionUnsubscribe),
  asyncHandler(async (req, res) => {
    const subscriber = await Subscriber.findOneAndUpdate(
      { email: req.body.email },
      { $set: { active: false, unsubscribedAt: new Date() } },
      { new: true },
    );
    if (!subscriber) {
      return res.status(404).json({ message: "Subscription not found." });
    }

    res.json({ message: "You have been unsubscribed from Packaging Times e-mail communications." });
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
