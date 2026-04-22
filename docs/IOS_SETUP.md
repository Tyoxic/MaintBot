# iOS Setup Guide for MaintBot

This guide walks through getting MaintBot onto iPhones via TestFlight.

**Split of responsibility:** Items marked **YOU** require your Apple ID, credit card, or phone and must be done by you. Items marked **CLAUDE** can be automated by the assistant via EAS CLI once credentials are ready.

---

## Phase 1 — Apple Developer Enrollment (you, one-time, 1-2 days)

### Step 1 — Sign up for the Apple Developer Program (**YOU**)

1. Open https://developer.apple.com/programs/enroll/ on any device signed into your Apple ID
2. Click **Start Your Enrollment**
3. Choose **Individual** (not Organization). Individual is $99/yr and is fine for a personal app
4. Fill in your legal name, address, and tax info
5. Pay the $99 USD annual fee with a credit card
6. Wait 24-48 hours for Apple to verify your identity. You'll get an email when approved

### Step 2 — Enable Two-Factor Authentication (**YOU**)

Apple requires 2FA on any Apple ID associated with the Developer Program.

1. On your iPhone, open **Settings → [Your Name] → Sign-In & Security → Two-Factor Authentication**
2. Follow prompts to enable and register your phone number
3. If already on, skip this step

### Step 3 — Accept the Developer Agreement (**YOU**)

After approval email arrives:

1. Sign in to https://appstoreconnect.apple.com
2. A banner will ask you to accept the new Program License Agreement — accept it
3. You'll also see a section for Tax and Banking info — fill it in even though we're not charging for the app (Apple requires it even for free apps)

### Step 4 — Create an App Store Connect API Key (**YOU**)

This lets EAS upload builds on your behalf without needing your Apple password each time.

1. In App Store Connect, go to **Users and Access → Integrations → App Store Connect API**
2. Click **Generate API Key** (or the + button)
3. Name it `MaintBot EAS Upload`
4. Access role: **App Manager** (sufficient for submits; Admin is overkill)
5. Click Generate — you'll get three values:
   - **Issuer ID** (looks like `abc12345-6789-...`)
   - **Key ID** (looks like `ABCDE12345`)
   - **API Key `.p8` file** — **DOWNLOAD IT NOW**. Apple only lets you download it once.
6. Save the `.p8` file to your password manager (or encrypted disk). Also save the Issuer ID and Key ID
7. Share the three pieces with me securely when ready (in chat is fine; we'll clean up afterwards)

### Step 5 — Create the App ID (**CLAUDE, after Step 4**)

Once you share the API key, I run `eas credentials` which:
- Registers the bundle identifier `com.maintbot.app` as an iOS App ID
- Creates the required iOS Distribution Certificate
- Creates an App Store Provisioning Profile
- Stores everything securely in EAS (same pattern as the Android keystore)

You don't need to touch Apple's web dashboard for this — EAS handles it with the API key.

---

## Phase 2 — First Build & TestFlight (CLAUDE drives, ~1 hour)

### Step 6 — Build the iOS app (**CLAUDE**)

```
eas build -p ios --profile production
```

- First build takes ~15-25 min on EAS free tier
- Produces a signed `.ipa` file ready for App Store Connect

### Step 7 — Create the App in App Store Connect (**YOU**, one-time, 2 min)

1. Go to https://appstoreconnect.apple.com/apps
2. Click **+ → New App**
3. Platform: **iOS**
4. Name: `MaintBot`
5. Primary language: English (U.S.)
6. Bundle ID: select `com.maintbot.app` from the dropdown (will appear after Step 5)
7. SKU: `maintbot-ios` (any unique string, just a label)
8. User Access: Full Access
9. Click Create

You don't need to fill in marketing metadata yet — TestFlight only needs the app shell.

### Step 8 — Upload the build (**CLAUDE**)

```
eas submit -p ios --profile production
```

- Uses the API key to upload the `.ipa` to App Store Connect
- Apple processes the build for 15-30 min (you'll get an email when ready)

### Step 9 — Test Flight Setup (**YOU**, 10 min first time)

1. In App Store Connect, open the MaintBot app → **TestFlight** tab
2. Under Test Information, fill in:
   - Beta App Description: `MaintBot — privacy-first vehicle maintenance tracker`
   - Feedback Email: `tyoxic@gmail.com`
   - Privacy Policy URL: `https://tyoxic.github.io/MaintBot/`
3. Add an **Internal Testing Group** for up to 100 testers (no review required)
   - Add emails of your own Apple IDs + close friends
   - They'll get a TestFlight invite email within minutes
4. OR create an **External Testing Group** for up to 10,000 testers via a public link
   - Requires a one-time Beta App Review by Apple (~24h)
   - After approval, you get a shareable link like `https://testflight.apple.com/join/XXXXXX`
   - Anyone with the link installs MaintBot via the TestFlight app

### Step 10 — Testers install (**Testers**, 1 min each)

1. On iPhone, install the free TestFlight app from App Store
2. Open the invite email or tap the public link
3. Tap **Install** → MaintBot downloads via TestFlight
4. Opens just like any installed app; all OTA updates apply automatically

---

## Ongoing — Keeping it fresh

### JS updates (silent, no work)

Same as Android: `eas update --branch preview --platform ios` pushes OTA updates to TestFlight users. They apply automatically. Nothing for you to do.

### Native updates (new `.ipa` every ~3 months minimum)

TestFlight builds expire 90 days after upload. To keep the TestFlight link working long-term, we need to upload a fresh build every ~80 days. I can:
- Set a cron reminder in Claude to rebuild automatically before expiry
- OR you manually run `eas build -p ios --profile production` + `eas submit -p ios` when the expiry warning email arrives

### Full App Store release (optional, later)

If you decide to list MaintBot on the actual App Store (not just TestFlight):
1. Fill in store metadata in App Store Connect: description, keywords, screenshots at required sizes
2. Submit the build for App Review
3. Apple reviews (1-3 days typically) — may request changes
4. Once approved, MaintBot appears on the App Store

This is not required for distributing via TestFlight — you can stay on TestFlight indefinitely.

---

## Gotchas we've already avoided

**Privacy manifest** — `app.json` already declares `privacyManifests` with `NSPrivacyTracking: false`, empty `NSPrivacyCollectedDataTypes`, and the four Required Reason APIs our code uses (file timestamp, user defaults, system boot time, disk space). This prevents the most common iOS submission rejection.

**Non-exempt encryption** — `app.json` sets `ITSAppUsesNonExemptEncryption: false` so you won't be asked about export compliance on every build.

**Permission usage strings** — All `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, etc. are set with user-friendly language. Apple rejects apps with missing or bad permission prompts.

**Bundle identifier reuse** — iOS and Android both use `com.maintbot.app` so analytics and cross-platform tools can correlate. No conflict.

**Privacy policy URL** — `https://tyoxic.github.io/MaintBot/` is live and already includes Apple-specific language.

---

## Contact info to share with me when ready

After Step 4:

```
Issuer ID:    [from App Store Connect → Integrations]
Key ID:       [from the same page]
API Key:      [the .p8 file contents — paste or attach]
```

Once I have these, I run `eas credentials` and the first build.
