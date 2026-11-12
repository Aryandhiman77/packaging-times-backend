import mongoose from "mongoose";

const { Schema, model } = mongoose;

export const PAGE_NAMES = [
  "home",
  "flexibles",
  "rigid",
  "advertising",
  "trends",
  "subscribe",
  "contact",
  "shopping-cart",
];

export const ALL_PAGES = ["global", ...PAGE_NAMES];

export const AD_SLOTS = [
  ...["left", "right"].flatMap((side) =>
    [1, 2, 3, 4].map((i) => `${side}-${i}`),
  ),
  "bottom-1",
  "bottom-2",
];

const bannerSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    altText: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    page: {
      type: String,
      enum: ALL_PAGES,
      required: true,
      default: "home",
    },
    slot: {
      type: String,
      enum: AD_SLOTS,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    targetUrl: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 1000,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    endsAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

bannerSchema.index({ page: 1, slot: 1 }, { unique: true });

export const Banner = model("Banner", bannerSchema);

const newsSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    excerpt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 15000,
    },
    category: {
      type: String,
      enum: ["General", "Flexibles", "Rigid", "Industry News", "Trends"],
      default: "Industry News",
    },
    published: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    metaTitle: {
      type: String,
      default: "",
      maxlength: 70,
    },
    metaDescription: {
      type: String,
      default: "",
      maxlength: 170,
    },
    seoImage: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    robots: {
      type: String,
      enum: ["index,follow", "noindex,nofollow"],
      default: "index,follow",
    },
  },
  { timestamps: true },
);

export const News = model("News", newsSchema);

// Every document represents one category content page.

export const STORY_CATEGORIES = ["trends", "flexibles", "rigid", "advertising"];

const contentPageSchema = new Schema(
  {
    category: {
      type: String,
      enum: STORY_CATEGORIES,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },

    html: {
      type: String,
      required: true,
      maxlength: 200000,
    },

    order: {
      type: Number,
      default: 1,
      min: 1,
      max: 100000,
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },

    metaTitle: {
      type: String,
      default: "",
      maxlength: 70,
    },

    metaDescription: {
      type: String,
      default: "",
      maxlength: 170,
    },

    seoImage: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    robots: {
      type: String,
      enum: ["index,follow", "noindex,nofollow"],
      default: "index,follow",
    },
  },
  {
    timestamps: true,
  },
);

// Category + slug must be unique.

contentPageSchema.index({ category: 1, slug: 1 }, { unique: true });

// Used to fetch published pages in the right order.

contentPageSchema.index({
  category: 1,
  status: 1,
  order: 1,
  createdAt: 1,
});

export const ContentPage = model("ContentPage", contentPageSchema);

const settingsSchema = new Schema(
  {
    key: {
      type: String,
      default: "main",
      unique: true,
    },
    tagline: {
      type: String,
      default: "America's Packaging News and Leading Packaging Supplier Guide",
    },
    heroHeading: {
      type: String,
      default: "Packaging News & Industry Insights",
    },
    heroIntro: {
      type: String,
      default: "Packaging news, suppliers and insights for your business.",
    },
    mailingAddress: {
      type: String,
      default: "P.O. Box 732024, Ormond Beach, Florida 32173-2024",
    },
    advertisingEmail: {
      type: String,
      default: "info@packagingtimes.com",
    },
    trendingEmail: {
      type: String,
      default: "trending@packagingtimes.com",
    },
    facebook: { type: String, default: "" },
    youtube: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    x: { type: String, default: "" },
  },
  { timestamps: true },
);

export const Settings = model("Settings", settingsSchema);

export const Subscriber = model(
  "Subscriber",
  new Schema(
    {
      name: {
        type: String,
        trim: true,
        maxlength: 120,
      },
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },
      firstName: { type: String, trim: true, maxlength: 80, default: "" },
      lastName: { type: String, trim: true, maxlength: 80, default: "" },
      company: { type: String, trim: true, maxlength: 150, default: "" },
      jobTitle: { type: String, trim: true, maxlength: 150, default: "" },
      interests: {
        type: [String],
        default: [],
      },
      emailPreferences: {
        type: [String],
        default: [],
      },
      consent: { type: Boolean, default: false },
      active: { type: Boolean, default: true, index: true },
      unsubscribedAt: { type: Date, default: null },
    },
    { timestamps: true },
  ),
);

const tracking = {
  status: {
    type: String,
    enum: ["new", "in_progress", "resolved", "closed"],
    default: "new",
    index: true,
  },
  adminNote: {
    type: String,
    default: "",
    maxlength: 5000,
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  emailAdminStatus: {
    type: String,
    enum: ["pending", "sent", "failed"],
    default: "pending",
  },
  emailClientStatus: {
    type: String,
    enum: ["pending", "sent", "failed"],
    default: "pending",
  },
  emailAdminError: {
    type: String,
    default: "",
    maxlength: 300,
  },
  emailClientError: {
    type: String,
    default: "",
    maxlength: 300,
  },
};

export const Contact = model(
  "Contact",
  new Schema(
    {
      name: {
        type: String,
        required: true,
        maxlength: 120,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },
      subject: {
        type: String,
        required: true,
        maxlength: 160,
      },
      message: {
        type: String,
        required: true,
        maxlength: 5000,
      },
      kind: {
        type: String,
        enum: ["contact", "order"],
        default: "contact",
      },
      ...tracking,
    },
    { timestamps: true },
  ),
);

export const AdvertisingInquiry = model(
  "AdvertisingInquiry",
  new Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
      },
      company: {
        type: String,
        default: "",
        maxlength: 150,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },
      phone: {
        type: String,
        default: "",
        maxlength: 40,
      },
      placement: {
        type: String,
        enum: ["sidebar", "bottom", "sponsored", "other"],
        required: true,
      },
      budget: {
        type: String,
        default: "",
        maxlength: 100,
      },
      message: {
        type: String,
        required: true,
        maxlength: 5000,
      },
      ...tracking,
    },
    { timestamps: true },
  ),
);

export const Admin = model(
  "Admin",
  new Schema(
    {
      key: {
        type: String,
        unique: true,
        required: true,
        default: "primary",
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true,
      },
      passwordHash: {
        type: String,
        required: true,
      },
      authVersion: {
        type: Number,
        default: 1,
        min: 1,
      },
      lastLoginAt: {
        type: Date,
        default: null,
      },
    },
    { timestamps: true },
  ),
);
