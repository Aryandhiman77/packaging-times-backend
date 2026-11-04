import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";

import { Admin } from "../models/index.js";
import { schemas, validateBody } from "../middleware/joi.js";
import { asyncHandler } from "../middleware/validate.js";

import {
  clearAdminCookie,
  requireAdmin,
  setAdminCookie,
  requireTrustedOrigin,
} from "../middleware/auth.js";

const router = Router();

router.post(
  "/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
  requireTrustedOrigin,
  validateBody(schemas.login),
  asyncHandler(async (req, res) => {
    const admin = await Admin.findOne({
      email: req.body.email,
    });

    const valid = admin
      ? await bcrypt.compare(
          req.body.password,
          admin.passwordHash
        )
      : false;

    if (!valid) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const session = setAdminCookie(res, admin);

    await Admin.updateOne(
      { _id: admin._id },
      {
        $set: {
          lastLoginAt: new Date(),
        },
      }
    );

    res.json({
      data: {
        email: admin.email,
        accessToken: session.token,
        tokenType: "Bearer",
        expiresAt: session.expiresAt,
        dailyResetAt: session.dailyResetAt,
      },
    });
  })
);

router.get("/me", requireAdmin, (req, res) => {
  res.json({
    data: {
      email: req.admin.email,
    },
  });
});

router.post(
  "/logout",
  requireTrustedOrigin,
  requireAdmin,
  asyncHandler(async (req, res) => {
    await Admin.updateOne(
      { _id: req.admin._id },
      { $inc: { authVersion: 1 } },
    );

    clearAdminCookie(res);

    res.json({
      message: "Signed out.",
    });
  }),
);

export default router;
