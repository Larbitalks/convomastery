# ConvoMastery: launch guide

This is the step-by-step list for taking the site from demo to live. Most steps are creating an account and copying a key from one place to another. Plan for one focused afternoon.

## What's built

**For visitors and customers**
- Home page, lesson catalogue with search and filters (level, students, activity, topic area, price), a page for each lesson, pricing, about and contact
- Free accounts with email verification, sign in, forgotten password and password change
- Buying a lesson (card payment through Stripe), free lessons added in one click
- "My library": every lesson the customer owns, downloadable any time
- Emails: account verification and password reset (from Supabase), purchase receipt, and contact form messages sent to you
- SEO: page titles and descriptions per page, Google product data for lessons, sitemap, robots.txt. Share buttons (Facebook, Pinterest, copy link), social links in the footer, Google Analytics

**For you (admin area at /admin)**
- Add and edit lessons: text, sample questions, level, filters, price, cover colour or image, slide previews, and the lesson file itself
- Draft or published, and choose which lessons appear on the home page
- Topic areas, orders and revenue, and contact form messages

**Teaching tools (every signed-in teacher, in their dashboard)**
- Teach from the website: any lesson the teacher owns opens full screen, with keyboard controls, a slide overview, a countdown timer, a random student picker and the class scoreboard
- Classes and students (students don't need accounts). Each class can have a picture, and the Classes page shows each class's average performance. A class's Overview tab shows every student's performance bar, awards, classes and homework
- Start class: from a student's profile, a class screen with the date, a timer, attendance (Present / Late / Absent), colour behaviour buttons you can customise, award buttons, live notes (covered, new words, say it better, other), last class's notes, homework and the lesson's slides. Ending the class saves a summary and a lesson note, and the profile shows a class history with behaviour bars. A Review check (Yes / Partly / No) records whether the student went over the previous lesson. Students only see attendance, behaviour and their overall score if you switch it on for them
- Overall performance: a score out of 100 on each student's profile and a small bar in the Students list, from the last 8 classes: behaviour 25%, exams 20%, homework 15%, attendance 15%, awards 15%, review 10%, with a trend arrow against the 8 classes before. Each behaviour button is set as positive, neutral or negative under Edit buttons
- Exams: on each student's profile, record unit exams (quizzes), mid-terms and finals with a score out of a total you choose (set your usual totals once), plus feedback. Averages per type are shown, students see their results on their progress page, and exams count for 20% of the overall performance score (finals count most)
- Discoveries: award points unlock mountain-themed collectibles (the 1st after 5 points, the 2nd after 15 more, then every 30). Each student collects from the camp of their class (Explorers, Trekkers, Climbers, Mountaineers, Alpinists; classes with other names use their level). Explorers and Trekkers collect cute creature friends, Climbers collect Mountain Legends (creatures with powers), and Mountaineers and Alpinists collect adventure gear and relics, all original ConvoMastery artwork. Each camp has 8, then the set repeats in Silver, Gold and Diamond, so collecting never ends. Move a student up by changing their class in Details: earlier finds stay in an "Earlier camps" shelf. Students see a "My Discoveries" journal and a treasure-chest celebration in class and on their page. Everything is worked out from the awards and class moves already saved, so nothing can be given twice. The collectibles are in `src/lib/discoveries.ts`, with a special-achievements list ready for later
- Student avatars: set by the teacher when adding a student or from the profile (click the circle next to the name, or Details > Edit). The builder has ready-made faces and every part to change (skin, hair or headwear, eyes, mouth, glasses, beard, clothes, colours). Avatars show on the profile, the student's page, the Students list, class Overview, the class screen and the mountain map. Artwork: Avataaars by Pablo Stanley (free for personal and commercial use) via DiceBear
- Mountain map: a "See the mountain map" button in Discoveries opens a full-screen map of the whole mountain (`public/map/overview.webp`) showing how many students are at each camp. Tap a camp to zoom into its own large map (`public/map/<camp>.webp`), where every student stands on the trail by name, further along the more they've found; "Whole mountain" zooms back out. Zoom, drag and pinch work everywhere, and "Who's where" lists everyone. The trail positions on each picture are in `src/lib/discoveries.ts` (CAMP_MAPS); if a picture is replaced, its trail needs marking again. Hide a student with the "Show on the mountain map" switch on their profile
- Student progress codes: share a private code or link with a student or parent. They see a read-only copy of the student's profile (points, exams, homework, feedback and the notes you mark as shared; private notes and contact details stay hidden), with no account needed. They can't change anything, but they can send you messages (up to 10 a day). You get an email and a badge on Students, and you reply on the student's profile
- Student records: a Students page listing everyone across classes, and a record for each student with contact, level, goals, private notes, a dated lesson-notes log, award totals and history, and homework results
- Awards: each class has its own award categories and points (Participation, Great answer and so on, all editable), a scoreboard by lesson, week or all time, and undo
- Homework: set for each student on their own page, with a due date and an optional linked lesson, then marked Done, Late or Missing with feedback. The class page and Classes overview list what needs checking

**Booking and messaging**
- You publish bookable times (one-to-one lesson, trial lesson, teacher training), once or weekly. Customers book in their own time zone, and both of you get a confirmation email
- Customers message you from their dashboard; you reply from the admin inbox. Each side gets an email for new messages, and unread counts show in the menu

**Not built yet**
Subscriptions, paid bookings (bookings are free to make for now), student logins (so students could see their own homework and points), video calls inside the site.

## Before you start

You'll need these accounts. All have free plans that are enough to launch.

| Service | What it does | Cost to start |
|---|---|---|
| GitHub (github.com) | Stores the code | Free |
| Supabase (supabase.com) | Database, accounts, file storage | Free plan |
| Vercel (vercel.com) | Hosts the website | Free plan (Hobby). Their terms ask commercial sites to use Pro, about $20/month |
| Stripe (stripe.com) | Card payments | A fee per sale, no monthly cost |
| Resend (resend.com) | Sends the emails | Free up to 3,000 emails/month |
| A domain name | Your address, e.g. convomastery.com | About $10 to $15/year (Cloudflare Registrar is at cost) |

**Check Stripe first.** Stripe only accepts businesses registered in certain countries (stripe.com/global). If yours isn't on the list, tell Claude which country, and the payment step can be switched to a provider that works there (for example Lemon Squeezy or Paddle). Only the two payment functions in `supabase/functions` change.

## Step 1. Put the code on GitHub

1. Create a new **private** repository called `convomastery`.
2. Upload the contents of this folder (GitHub's "uploading an existing file" link works, or ask Claude to do it once GitHub is connected).

## Step 2. Set up Supabase

1. Create a new project. Pick the region closest to most customers. Save the database password somewhere safe.
2. Open **SQL Editor**, paste in all of `supabase/migrations/0001_init.sql`, and click **Run**. Then do the same, in this order, with `supabase/migrations/0002_teaching_booking_messaging.sql` (classes, homework, awards, bookings, messages), `supabase/migrations/0003_student_records.sql` (student records), then 0004 to 0016 in number order, and `supabase/seed.sql` (starter topic areas). Or run `supabase/setup-all.sql`, which is all of these in one file.
3. Open **Project Settings > API** and copy the **Project URL** and the **anon public key**. You'll need them in step 5.
4. Open **Authentication > URL Configuration**:
   - Site URL: your domain, e.g. `https://www.convomastery.com`
   - Redirect URLs: add `https://www.convomastery.com/**`

## Step 3. Set up emails (Resend)

1. In Resend, add your domain and follow its instructions to add the DNS records. This is what lets you send from `hello@yourdomain.com` without landing in spam.
2. Create an API key.
3. In Supabase, open **Authentication > Emails > SMTP Settings** and turn on custom SMTP with Resend's details (host `smtp.resend.com`, port `465`, user `resend`, password = your API key). Now verification and password-reset emails come from your own address.
4. Optional: edit the wording of those emails under **Authentication > Emails > Templates**.

## Step 4. Set up payments and server functions

Until payments are connected, paid lessons show **Coming soon** and a button to send you a message; free lessons work as normal. When payments are set up, add `VITE_PAYMENTS_ENABLED` = `true` in Vercel (Environment Variables) and redeploy to turn on the Buy buttons.


1. In Stripe, stay in **Test mode** for now. Copy the **secret key** (starts `sk_test_`).
2. Install the Supabase command line tool (supabase.com/docs/guides/cli), then in this folder run:

```
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set SITE_URL=https://www.convomastery.com STRIPE_SECRET_KEY=sk_test_... RESEND_API_KEY=re_... EMAIL_FROM="ConvoMastery <hello@convomastery.com>" ADMIN_EMAIL=your@email.com TIME_ZONE=Asia/Jakarta
supabase functions deploy create-checkout
supabase functions deploy payment-webhook --no-verify-jwt
supabase functions deploy notify-inquiry --no-verify-jwt
supabase functions deploy notify-booking
supabase functions deploy notify-message
supabase functions deploy notify-student-message --no-verify-jwt
```

3. In Stripe, open **Developers > Webhooks > Add endpoint**:
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/payment-webhook`
   - Event: `checkout.session.completed`
   - Copy the **signing secret** (starts `whsec_`) and run `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`

## Step 5. Put the site online (Vercel)

1. In Vercel, click **Add New > Project** and import the GitHub repository. It detects Vite automatically.
2. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from step 2
   - `VITE_SITE_URL` = `https://www.convomastery.com`
   - Optional: `VITE_GA_ID` (Google Analytics, step 7), `VITE_INSTAGRAM_URL`, `VITE_FACEBOOK_URL`, `VITE_YOUTUBE_URL`
3. Click **Deploy**.
4. Under **Settings > Domains**, add your domain and follow the DNS instructions. Vercel sets up the SSL certificate (the padlock) for you.

**Cloudflare (optional):** if you buy the domain through Cloudflare, its DNS and protection come with it. Keep the Vercel records as "DNS only" (grey cloud) so Vercel can manage SSL.

## Step 6. Make yourself the admin

1. On the live site, create an account with your own email and verify it.
2. In Supabase **SQL Editor**, run (with your email):

```
update public.profiles set role = 'admin' where email = 'your@email.com';
```

3. Sign out and back in. **Admin** now appears in the menu.

## Step 7. Google Analytics

Create a GA4 property at analytics.google.com, copy the **Measurement ID** (starts `G-`), add it to Vercel as `VITE_GA_ID` and redeploy. Sign-ups, checkouts, purchases, downloads, shares and contact messages are tracked as events.

## Step 8. Before you announce it

- [ ] Upload your real lessons in the admin area (lesson file, description, sample questions, previews). Mark one as free.
- [ ] For each lesson, upload its slides so buyers can teach it from the website. In PowerPoint choose **File > Save As > PDF**, then upload that PDF under **Slides for teaching on the website** on the lesson's admin page and click **Save lesson**. Each page becomes a slide. Without slides, the presenter shows the sample questions as simple slides.
- [ ] Add your first bookable times under **Admin > Bookings**, then book one with a test account and check both emails arrive.
- [ ] Send a message from a test account and reply from **Admin > Customer messages**.
- [ ] Review the wording on Home, About and Pricing. It was written from your project goals, so check every claim (prices "from $3.99", slide counts, reply times, the About story) and change anything that isn't right.
- [ ] Add a **privacy policy**, **terms of sale** and **refund policy**. These are legally needed when you collect accounts and payments, and Stripe asks for them. A lawyer or a reputable generator for your country is the safe route. Claude can add the pages once you have the text.
- [ ] Do a test purchase with Stripe's test card `4242 4242 4242 4242` (any future date, any CVC). Check that the lesson appears in the library, the download works, and the receipt email arrives.
- [ ] Send yourself a message through the contact form and check it arrives.
- [ ] Switch Stripe to **Live mode**, replace `STRIPE_SECRET_KEY` with the live key, create the webhook again in live mode and update `STRIPE_WEBHOOK_SECRET`.
- [ ] Submit `https://www.convomastery.com/sitemap.xml` in Google Search Console.

## Running it on your own computer (optional)

```
npm install
cp .env.example .env.local   # leave it empty for demo mode, or fill in Supabase details
npm run dev
```

## Where things are

- `src/pages` the pages; `src/pages/admin` the admin area
- `src/lib/api/supabase.ts` how the site talks to the database
- `src/lib/api/demo.ts` the demo mode with sample data
- `supabase/migrations` database tables and security rules
- `src/pages/Teach.tsx` the lesson presenter; `src/pages/ClassDetail.tsx` students, awards and homework
- `supabase/functions` payment, receipt, contact-form, booking and message emails
- `tailwind.config.js` colours and fonts
