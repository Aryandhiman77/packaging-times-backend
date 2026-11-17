import "dotenv/config";

import mongoose from "mongoose";

import {
  Banner,
  ContentPage,
  PackagingBrief,
} from "../src/models/index.js";
import { trendPages } from "./content/trendsContent.js";

const homePages = [
  {
    category: "home",
    title: "The Cereal Box Finally Gets a Zipper",
    slug: "cheerios-ziploc-pantryseal-1",
    order: 1,
    status: "published",
    metaTitle: "Cheerios Adds Ziploc PantrySeal | Packaging Times",
    metaDescription:
      "Monthly Feature Story: Cheerios and Ziploc introduce a resealable PantrySeal inner bag for the traditional cereal carton.",
    robots: "index,follow",
    seoImage: "",
    html: `
      <div class="monthly-feature-header">
        <p class="monthly-feature-kicker">Monthly Feature Story</p>
        <p class="monthly-feature-page">Page 1 of 3</p>
      </div>
      <h1>The Cereal Box Finally Gets a Zipper: Cheerios Puts Ziploc Inside the Carton</h1>
      <p>For decades, consumers have opened a cereal carton, torn apart the inner bag, poured a bowl and then tried to close everything back up again. Fold the bag. Roll it over. Use a clip. Stuff it back inside the carton. Or transfer the cereal into another container.</p>
      <p>General Mills says consumers have been asking for something better for years.</p>
      <p>Now Cheerios and Ziploc have teamed up on <strong>Ziploc PantrySeal</strong>, a resealable flexible inner bag designed specifically for the traditional cereal carton. The first packages are being offered with Cheerios and Honey Nut Cheerios. General Mills launched the new format through Walmart.com on October 27, 2026, with broader retail distribution planned afterward.</p>
      <p>This is not simply a zipper attached to the top of an ordinary cereal bag.</p>
      <p>The new inner package is designed to open only partway across the top. That partial opening creates a controlled <strong>pouring area</strong>, allowing cereal to be poured from the bag without having the entire mouth of the liner hanging open.</p>
      <p>Then the consumer reseals the Ziploc-style closure while the flexible package remains inside the familiar paperboard cereal carton.</p>
      <p>That combination makes the package particularly interesting from a packaging standpoint.</p>
      <p>The carton remains the billboard.</p>
      <p>The flexible package remains the primary product-protection component.</p>
      <p>But now the inner package becomes an active convenience feature rather than simply the bag that consumers throw away when the cereal is gone.</p>
      <p>General Mills says the idea addresses a very real behavior problem: <strong>90% of cereal consumers surveyed said they already take some additional step to keep cereal fresh</strong>, whether folding or rolling the liner, clipping it closed or transferring the cereal somewhere else.</p>
      <p>Sometimes the most interesting packaging innovation is not a completely new package.</p>
      <p>Sometimes it is fixing something consumers have been fighting with for decades.</p>
    `,
  },
  {
    category: "home",
    title: "A Simple Idea at Cereal-Scale Speed",
    slug: "cheerios-ziploc-pantryseal-2",
    order: 2,
    status: "published",
    metaTitle: "PantrySeal at Cereal-Scale Speed | Packaging Times",
    metaDescription:
      "Part two of the Packaging Times Monthly Feature Story examines the production challenge behind Cheerios PantrySeal.",
    robots: "index,follow",
    seoImage: "",
    html: `
      <div class="monthly-feature-header">
        <p class="monthly-feature-kicker">Feature Story - Continued</p>
        <p class="monthly-feature-page">Page 2 of 3</p>
      </div>
      <h1>A Simple Idea — Until You Try to Make It Run at Cereal-Scale Speed</h1>
      <p>Putting a resealable closure into a cereal bag sounds straightforward.</p>
      <p>Doing it while producing one of America's largest cereal brands is another matter.</p>
      <p>General Mills says nearly <strong>one box of Cheerios is produced every second</strong>, meaning the new liner had to work at enormous production volumes while maintaining the familiar Cheerios package and product flow. The new PantrySeal package is being produced in Buffalo, New York — the same location where Cheerios was first produced in 1941.</p>
      <p>That is where the packaging story becomes more interesting than the marketing announcement.</p>
      <p>Any major change to an inner flexible package can potentially affect:</p>
      <ul>
        <li>film handling,</li>
        <li>sealing,</li>
        <li>filling,</li>
        <li>line speed,</li>
        <li>package dimensions,</li>
        <li>carton loading,</li>
        <li>product protection,</li>
        <li>material cost,</li>
        <li>equipment adjustments,</li>
        <li>and quality control.</li>
      </ul>
      <p>General Mills has not publicly disclosed the complete film structure, zipper construction, sealing specifications or equipment modifications behind PantrySeal. That information will be worth watching as the package reaches wider distribution.</p>
      <p>What the company has explained is the consumer-facing objective: make the package easier to <strong>open, pour and reseal</strong> while preserving the traditional cereal-carton experience.</p>
      <p>And that raises another interesting packaging question.</p>
      <p>For years, packaging developers have debated whether the traditional cereal carton itself is necessary.</p>
      <p>Flexible pouches can potentially eliminate the outer carton entirely. Yet cereal cartons remain powerful merchandising tools. They stand upright, provide large printable front and back.</p>
    `,
  },
  {
    category: "home",
    title: "Could the Zipper Become Expected?",
    slug: "cheerios-ziploc-pantryseal-3",
    order: 3,
    status: "published",
    metaTitle: "Will Cereal Zippers Become Expected? | Packaging Times",
    metaDescription:
      "Part three asks whether resealable cereal packaging could become the next expected feature across the aisle.",
    robots: "index,follow",
    seoImage: "",
    html: `
      <div class="monthly-feature-header">
        <p class="monthly-feature-kicker">Feature Story - Continued</p>
        <p class="monthly-feature-page">Page 3 of 3</p>
      </div>
      <h1>Could the Zipper Become the Next Expected Feature in the Cereal Aisle?</h1>
      <p>One successful packaging convenience feature has a way of becoming an expectation.</p>
      <p>Resealable cheese packages were once unusual.</p>
      <p>So were zipper-equipped coffee bags, stand-up pouches, easy-open closures and microwaveable package features.</p>
      <p>Once consumers become accustomed to a better way of opening, closing, storing or dispensing a product, competitors eventually have to decide whether the feature is merely interesting — or whether their own package suddenly feels outdated.</p>
      <p>That could be the bigger story behind Cheerios with Ziploc PantrySeal.</p>
      <p>General Mills says it receives hundreds of thousands of requests, comments and reactions annually concerning easier cereal resealing. The company partnered with Ziploc, a brand whose zipper technology dates back decades, to address that consumer frustration directly inside the cereal package.</p>
      <p>If consumers respond positively, other cereal companies will be watching.</p>
      <p>So will flexible packaging converters, zipper manufacturers, film suppliers, packaging-equipment companies and brand owners in categories far beyond cereal.</p>
      <p>Dry snacks, crackers, granola, pet treats and other products packaged inside cartons could potentially face the same basic question:</p>
      <p><strong>If consumers keep trying to close our package after opening it, why wasn't resealability designed into the package in the first place?</strong></p>
      <p>There are also questions Packaging Times will continue watching.</p>
      <p>Will consumers accept a potential package-cost increase for the added convenience?</p>
      <p>Will the new format operate at the same production efficiencies as conventional cereal liners?</p>
      <p>Will the zipper and altered bag construction affect material usage or recyclability?</p>
      <p>Could brands eventually eliminate the carton entirely and move to a high-quality resealable flexible package?</p>
      <p>Or does the traditional cereal carton still provide too much branding, shelf presence and familiarity to disappear?</p>
    `,
  },
];

const packagingBriefHtml = `
  <h1>PACKAGING BRIEF</h1>
  <h2>THE PSYCHOLOGY OF PACKAGING: WHY THE PACKAGE OFTEN SELLS BEFORE THE PRODUCT DOES</h2>
  <p>Before a consumer tastes the coffee, opens the cookie, pours the cereal or tries the product, something else has already made the first impression:</p>
  <p><strong>The package.</strong></p>
  <p>Packaging is often the first physical and visual contact between a product and a potential customer. Color, structure, graphics, size, material and even the way a package feels can influence whether someone stops, looks, picks it up — or walks past it.</p>
  <p>That makes packaging more than protection.</p>
  <p>It is part of the selling process.</p>
  <h2>FIRST IMPRESSIONS HAPPEN FAST</h2>
  <p>On a crowded retail shelf, consumers are surrounded by competing colors, shapes, claims and brands.</p>
  <p>A package has only a short opportunity to communicate:</p>
  <p><strong>What is this?<br>Who is it for?<br>Why is it different?<br>Why should I buy it?</strong></p>
  <p>A premium-looking carton may suggest quality before the product is ever seen.</p>
  <p>A natural paper texture may suggest simplicity or sustainability.</p>
  <p>A resealable pouch can communicate convenience.</p>
  <p>A heavy tin or rigid container may make the product feel more substantial and valuable.</p>
  <p>None of those impressions happen by accident when packaging is developed correctly.</p>
  <h2>FAMILIARITY ALSO MATTERS</h2>
  <p>Consumers often like something new — but not so new that they no longer understand what they are buying.</p>
  <p>That creates an interesting packaging challenge.</p>
  <p>A brand wants to stand out while still looking appropriate for its product category.</p>
  <p>Coffee should still somehow feel like coffee.</p>
  <p>A snack package should still be recognizable as a snack.</p>
  <p>A premium food package may need to look different without becoming confusing.</p>
  <p>Successful packaging often balances <strong>familiarity with distinction.</strong></p>
  <h2>THE PACKAGE MAKES A PROMISE</h2>
  <p>Packaging creates expectations about what is inside.</p>
  <p>If the package looks premium and the product does not deliver, the packaging may actually work against the brand.</p>
  <p>If the product is excellent but the package looks inexpensive, outdated or difficult to use, consumers may never discover how good the product is.</p>
  <p>The package and product have to tell the same story.</p>
  <p>Good packaging protects the product.</p>
  <p>Better packaging makes the product easier to use.</p>
  <p>Great packaging can also make someone want to pick it up.</p>
  <h2>PACKAGING TIMES BRIEF</h2>
  <p>Packaging decisions should never be based only on appearance.</p>
  <p>Structure, protection, manufacturing, distribution and cost all matter.</p>
  <p>But when two competing products perform similarly, the package may be the difference between the one that gets noticed — and the one that stays on the shelf.</p>
  <p class="packaging-brief-final">THE PACKAGE DOES NOT REPLACE A GOOD PRODUCT. IT HELPS GIVE THE PRODUCT A CHANCE TO BE CHOSEN.</p>
`;

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  await ContentPage.updateMany(
    { category: { $in: ["flexibles", "rigid", "advertising", "trends"] } },
    { $set: { status: "draft" } },
  );

  for (const page of [...homePages, ...trendPages]) {
    await ContentPage.updateOne(
      { category: page.category, slug: page.slug },
      { $set: page },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  const firstHomePage = await ContentPage.findOne({
    category: "home",
    status: "published",
  })
    .sort({ order: 1, createdAt: 1, _id: 1 })
    .select("_id")
    .lean();

  if (firstHomePage) {
    const legacyBanners = await Banner.find({
      page: { $nin: ["home", "global"] },
    })
      .sort({ priority: -1, updatedAt: -1 })
      .select("_id slot")
      .lean();

    for (const banner of legacyBanners) {
      const slotAlreadyUsed = await Banner.exists({
        page: "home",
        contentPage: firstHomePage._id,
        slot: banner.slot,
      });

      if (slotAlreadyUsed) {
        await Banner.updateOne(
          { _id: banner._id },
          { $set: { isActive: false } },
        );
      } else {
        await Banner.updateOne(
          { _id: banner._id },
          {
            $set: {
              page: "home",
              contentPage: firstHomePage._id,
              isActive: true,
            },
          },
        );
      }
    }
  }

  await PackagingBrief.updateOne(
    { key: "main" },
    { $set: { html: packagingBriefHtml } },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  console.log(
    "Seeded 3 Home pages, 6 Trends pages and Packaging Brief; unpublished empty categories and migrated legacy ads into Home Page 1.",
  );
}

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
