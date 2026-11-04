import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { Admin } from "../models/index.js";

const COOKIE = "pt_admin";
const DAY_MS = 24 * 60 * 60 * 1000;
const RESET_HOUR = 2;
const IST_OFFSET_MS = 330 * 60 * 1000;

const isProd = () => process.env.NODE_ENV === "production";

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: isProd(),
  sameSite: "lax",
  path: "/api",
  ...(maxAge ? { maxAge } : {}),
});

export function nextAdminResetAt(now = Date.now()) {
  const istNow = new Date(now + IST_OFFSET_MS);
  let resetAt =
    Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate(),
      RESET_HOUR,
    ) - IST_OFFSET_MS;

  if (resetAt <= now) resetAt += DAY_MS;
  return resetAt;
}

export function createAdminToken(admin, now = Date.now()) {
  const dailyResetAt = nextAdminResetAt(now);
  const expiresAt = Math.min(now + DAY_MS, dailyResetAt);
  const expiresIn = Math.max(1, Math.floor((expiresAt - now) / 1000));

  const token = jwt.sign(
    {
      sub: String(admin._id),
      version: admin.authVersion,
      jti: crypto.randomUUID(),
    },
    process.env.JWT_SECRET,
    {
      expiresIn,
      issuer: "packaging-times",
      audience: "packaging-times-admin",
    },
  );

  return {
    token,
    expiresAt: new Date(expiresAt).toISOString(),
    dailyResetAt: new Date(dailyResetAt).toISOString(),
    maxAge: expiresAt - now,
  };
}

export function setAdminCookie(res, admin) {
  const session = createAdminToken(admin);
  res.cookie(COOKIE, session.token, cookieOptions(session.maxAge));
  return session;
}

export function clearAdminCookie(res) {
  res.clearCookie(COOKIE, cookieOptions());
}

export async function syncPrimaryAdmin() {
  const email = (process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();

  const password = process.env.ADMIN_PASSWORD || "";
  const secret = process.env.JWT_SECRET || "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      "Set a valid ADMIN_EMAIL in server/.env."
    );
  }

  if (password.length < 8) {
    throw new Error(
      "ADMIN_PASSWORD must contain at least 8 characters."
    );
  }

  if (secret.length < 32) {
    throw new Error(
      "JWT_SECRET must contain at least 32 random characters."
    );
  }

  let admin = await Admin.findOne({
    key: "primary",
  });

  if (!admin) {
    await Admin.create({
      key: "primary",
      email,
      passwordHash: await bcrypt.hash(password, 12),
    });

    return "created";
  }

  const samePassword = await bcrypt.compare(
    password,
    admin.passwordHash
  );

  if (admin.email !== email || !samePassword) {
    admin.email = email;

    if (!samePassword) {
      admin.passwordHash = await bcrypt.hash(
        password,
        12
      );
    }

    admin.authVersion += 1;

    await admin.save();

    return "updated";
  }

  return "unchanged";
}

export async function requireAdmin(req, res, next) {
  try {
    const authorization = req.get("authorization") || "";
    const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    const token = bearer || req.cookies?.[COOKIE];

    if (!token) {
      return res.status(401).json({
        message: "Please sign in again.",
      });
    }

    const data = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        issuer: "packaging-times",
        audience: "packaging-times-admin",
      },
    );

    const admin = await Admin.findById(data.sub);

    if (
      !admin ||
      admin.authVersion !== data.version
    ) {
      return res.status(401).json({
        message: "Session expired. Sign in again.",
      });
    }

    req.admin = admin;
    req.adminToken = data;
    next();
  } catch {
    return res.status(401).json({
      message: "Session expired. Sign in again.",
    });
  }
}

export function requireTrustedOrigin(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const origin = req.get("origin");

  const allowed = (
    process.env.CLIENT_ORIGIN ||
    "http://localhost:5173"
  )
    .split(",")
    .map((value) => value.trim());

  if (!origin || !allowed.includes(origin)) {
    return res.status(403).json({
      message: "Request origin not allowed.",
    });
  }

  next();
}
