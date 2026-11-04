import nodemailer from "nodemailer";

import { Contact, AdvertisingInquiry } from "../models/index.js";

const safe = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const lines = (value) => safe(value).replace(/\r?\n/g, "<br/>");

export function emailTemplate({ headline, description, rows = [], button }) {
  const tableRows = rows
    .map(
      ([key, value]) => `
      <tr>
        <td style="
          padding:11px 14px;
          border-bottom:1px solid #e5edf4;
          color:#597087;
          font-size:13px;
          width:35%;
          vertical-align:top;
        ">
          ${safe(key)}
        </td>

        <td style="
          padding:11px 14px;
          border-bottom:1px solid #e5edf4;
          color:#203c53;
          font-size:14px;
          overflow-wrap:anywhere;
        ">
          ${lines(value)}
        </td>
      </tr>`,
    )
    .join("");

  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  >
</head>

<body style="
  margin:0;
  padding:24px 12px;
  background:#f3f7fb;
  font-family:Arial,Helvetica,sans-serif;
  color:#153a58;
">

  <div style="
    max-width:640px;
    margin:auto;
    background:white;
    border-radius:14px;
    overflow:hidden;
    border:1px solid #dfebf4;
  ">

    <div style="
      padding:26px 30px;
      background:#153a58;
      color:white;
    ">
      <div style="font-size:24px;font-weight:700;">
        Packaging Times
      </div>

      <div style="
        font-size:12px;
        letter-spacing:.8px;
        color:#c7e6f7;
        margin-top:5px;
      ">
        PACKAGING NEWS &amp; SUPPLIERS
      </div>
    </div>

    <div style="padding:30px;">
      <h1 style="
        font-size:24px;
        line-height:1.3;
        margin:0 0 12px;
        color:#153a58;
      ">
        ${safe(headline)}
      </h1>

      <p style="
        color:#516779;
        font-size:15px;
        line-height:1.7;
        margin:0 0 24px;
      ">
        ${safe(description)}
      </p>

      ${
        rows.length
          ? `
          <table style="
            width:100%;
            border-collapse:collapse;
            background:#f9fcff;
            border:1px solid #e5edf4;
          ">
            ${tableRows}
          </table>`
          : ""
      }

      ${
        button
          ? `
          <p style="margin:28px 0 0;">
            <a
              href="${safe(button.url)}"
              style="
                background:#226eaa;
                color:#ffffff;
                padding:13px 19px;
                text-decoration:none;
                border-radius:6px;
                font-weight:700;
                display:inline-block;
              "
            >
              ${safe(button.text)}
            </a>
          </p>`
          : ""
      }
    </div>

    <div style="
      padding:18px 30px;
      background:#ecf4fa;
      color:#60778a;
      font-size:12px;
      line-height:1.5;
    ">
      Packaging Times<br>
      This message was sent because of a form submission
      on packagingtimes.com.
    </div>

  </div>
</body>
</html>`;
}

let transport;

function transporter() {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    !process.env.SMTP_FROM
  ) {
    throw new Error("SMTP environment settings are missing.");
  }

  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",

      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },

      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  return transport;
}

const activeSends = new Set();

export async function deliverSubmission(kind, id) {
  const key = `${kind}:${id}`;

  if (activeSends.has(key)) return;

  activeSends.add(key);

  try {
    const Model = kind === "advertising" ? AdvertisingInquiry : Contact;

    const doc = await Model.findById(id);

    if (!doc) return;

    const typeLabel =
      kind === "advertising" ? "Advertising Inquiry" : "Contact Us Message";

    const base = (
      process.env.PUBLIC_SITE_URL || "https://packagingtimes.com"
    ).replace(/\/$/, "");

    const dashboard =
      `${base}/admin/` +
      (kind === "advertising" ? "advertising-inquiries" : "messages");

    const summary =
      kind === "advertising"
        ? [
            ["Name", doc.name],
            ["Email", doc.email],
            ["Company", doc.company],
            ["Phone", doc.phone],
            ["Placement", doc.placement],
            ["Budget", doc.budget],
            ["Message", doc.message],
          ]
        : [
            ["Name", doc.name],
            ["Email", doc.email],
            ["Subject", doc.subject],
            ["Message", doc.message],
          ];

    const jobs = [];

    // ADMIN EMAIL
    if (doc.emailAdminStatus !== "sent") {
      jobs.push(
        (async () => {
          try {
            await transporter().sendMail({
              from: process.env.SMTP_FROM,
              to: process.env.ADMIN_EMAIL,
              replyTo: doc.email,

              subject:
                `[Packaging Times] New ${typeLabel} #` +
                String(doc._id).slice(-6),

              text:
                `New ${typeLabel}\n\n` +
                summary.map(([k, v]) => `${k}: ${v || ""}`).join("\n") +
                `\n\n${dashboard}`,

              html: emailTemplate({
                headline: `New ${typeLabel}`,
                description:
                  "A new enquiry has been saved to your admin dashboard.",
                rows: summary,
                button: {
                  text: "Open Admin Inbox",
                  url: dashboard,
                },
              }),
            });

            await Model.updateOne(
              { _id: id },
              {
                $set: {
                  emailAdminStatus: "sent",
                  emailAdminError: "",
                },
              },
            );
          } catch (err) {
            await Model.updateOne(
              { _id: id },
              {
                $set: {
                  emailAdminStatus: "failed",
                  emailAdminError: String(err.message).slice(0, 300),
                },
              },
            );

            console.warn("Admin email failed:", err.message);
          }
        })(),
      );
    }

    // CLIENT EMAIL
    if (doc.emailClientStatus !== "sent") {
      jobs.push(
        (async () => {
          try {
            await transporter().sendMail({
              from: process.env.SMTP_FROM,
              to: doc.email,

              subject: "Packaging Times: We received your enquiry",

              text:
                `Hello ${doc.name},\n\n` +
                "Thank you for contacting Packaging Times.\n" +
                "Your enquiry has been received.\n\n" +
                `Reference: ${doc._id}\n\n` +
                "Packaging Times",

              html: emailTemplate({
                headline: "We received your enquiry",

                description:
                  `Thank you ${doc.name}. ` +
                  `Your ${kind === "advertising" ? "advertising enquiry" : "message"} ` +
                  "is saved. Our team will review it and reply soon.",

                rows: [
                  ["Reference", String(doc._id)],
                  ["Enquiry Type", typeLabel],
                ],

                button: {
                  text: "Visit Packaging Times",
                  url: base,
                },
              }),
            });

            await Model.updateOne(
              { _id: id },
              {
                $set: {
                  emailClientStatus: "sent",
                  emailClientError: "",
                },
              },
            );
          } catch (err) {
            await Model.updateOne(
              { _id: id },
              {
                $set: {
                  emailClientStatus: "failed",
                  emailClientError: String(err.message).slice(0, 300),
                },
              },
            );

            console.warn("Client email failed:", err.message);
          }
        })(),
      );
    }

    await Promise.all(jobs);
  } finally {
    activeSends.delete(key);
  }
}
