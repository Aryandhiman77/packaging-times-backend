import Joi from "joi";
import mongoose from "mongoose";

import { ALL_PAGES, AD_SLOTS, STORY_CATEGORIES } from "../models/index.js";

const requiredText = (min, max) =>
  Joi.string().trim().min(min).max(max).required();

const email = Joi.string()
  .trim()
  .lowercase()
  .email({ tlds: { allow: false } })
  .required();

const optionalUrl = Joi.string()
  .uri({ scheme: ["http", "https"] })
  .max(1000)
  .allow("")
  .optional();

export const schemas = {
  contentPage: Joi.object({
    category: Joi.string()
      .valid(...STORY_CATEGORIES)
      .required(),

    title: requiredText(2, 180),

    slug: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(120)
      .required(),

    html: Joi.string().min(1).max(200000).required(),

    order: Joi.number().integer().min(1).max(100000).default(1),

    status: Joi.string().valid("draft", "published").default("draft"),

    metaTitle: Joi.string().trim().max(70).allow("").default(""),

    metaDescription: Joi.string().trim().max(170).allow("").default(""),

    seoImage: optionalUrl.default(""),

    robots: Joi.string()
      .valid("index,follow", "noindex,nofollow")
      .default("index,follow"),
  }),
  banner: Joi.object({
    title: requiredText(2, 100),
    altText: Joi.string().trim().max(160).allow("").default(""),
    page: Joi.string()
      .valid(...ALL_PAGES)
      .required(),
    contentPage: Joi.string()
      .custom((value, helpers) =>
        value === "" || mongoose.isValidObjectId(value)
          ? value
          : helpers.error("any.invalid"),
      )
      .allow("", null)
      .default(""),
    slot: Joi.string()
      .valid(...AD_SLOTS)
      .required(),
    targetUrl: optionalUrl,
    priority: Joi.number().integer().min(0).max(1000).default(0),
    isActive: Joi.boolean().default(true),
    startsAt: Joi.date().iso().allow(null, "").optional(),
    endsAt: Joi.date().iso().allow(null, "").optional(),
  }),

  news: Joi.object({
    title: requiredText(5, 180),
    excerpt: requiredText(10, 500),
    body: requiredText(15, 15000),

    category: Joi.string()
      .valid("General", "Flexibles", "Rigid", "Industry News", "Trends")
      .required(),

    published: Joi.boolean().default(true),
    featured: Joi.boolean().default(false),

    metaTitle: Joi.string().trim().max(70).allow("").default(""),

    metaDescription: Joi.string().trim().max(170).allow("").default(""),

    seoImage: optionalUrl.default(""),

    robots: Joi.string()
      .valid("index,follow", "noindex,nofollow")
      .default("index,follow"),
  }),

  settings: Joi.object({
    tagline: Joi.string().trim().min(5).max(150),
    heroHeading: Joi.string().trim().min(3).max(140),
    heroIntro: Joi.string().trim().max(500).allow(""),
    mailingAddress: Joi.string().trim().max(250).allow(""),
    advertisingEmail: email.optional(),
    trendingEmail: email.optional(),
    facebook: optionalUrl,
    youtube: optionalUrl,
    linkedin: optionalUrl,
    x: optionalUrl,
  }).min(1),

  subscribe: Joi.object({
    name: Joi.string().trim().max(120).allow("").optional(),
    email,
  }),

  contact: Joi.object({
    name: requiredText(2, 120),
    email,
    subject: requiredText(3, 160),
    message: requiredText(10, 5000),
  }),

  advertising: Joi.object({
    name: requiredText(2, 120),

    company: Joi.string().trim().max(150).allow("").default(""),

    email,

    phone: Joi.string().trim().max(40).allow("").default(""),

    placement: Joi.string()
      .valid("sidebar", "bottom", "sponsored", "other")
      .required(),

    budget: Joi.string().trim().max(100).allow("").default(""),

    message: requiredText(10, 5000),
  }),

  tracking: Joi.object({
    status: Joi.string()
      .valid("new", "in_progress", "resolved", "closed")
      .required(),

    adminNote: Joi.string().max(5000).allow("").default(""),

    isRead: Joi.boolean().optional(),
  }),

  login: Joi.object({
    email,
    password: Joi.string().min(1).max(200).required(),
  }),
};

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.validate(req.body, {
      abortEarly: false,
      convert: true,
      stripUnknown: true,
    });

    if (result.error) {
      return res.status(422).json({
        message: "Please check the form fields.",
        errors: result.error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    req.body = result.value;
    next();
  };
}

export function validateId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(422).json({
      message: "Invalid record ID.",
    });
  }

  next();
}
