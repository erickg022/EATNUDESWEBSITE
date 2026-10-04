# NUDES — Email marketing system: build brief

Read this fully before touching any file. Work one phase at a time, show a short plan
first, and ask before anything that touches production (deploys to main, Brevo writes,
env vars).

## Context

- Client: **NUDES**, health bar in Barcelona and Madrid (smoothies, açaí, ceremonial
  matcha, artisan sandwiches). Site: https://www.eatnudes.com — static HTML/CSS/JS in
  this repo, deployed on **Vercel**.
- Email provider: **Brevo** (single opt-in; the sender domain must be authenticated before going live). Square connects to Brevo natively (done by hand, not by us).
- Goal: build once, client self-manages in Brevo. Switching from the developer's test
  Brevo account to the client's must only require changing env vars in Vercel.
- Work happens on the branch `email-system`. Production (`main`) is untouched until merge.

## Real data

Store names, addresses and social links: **take them from this repo's HTML files**
(footer and locations section of the site). Do not invent any. The previz images in
`emails/previz/` contain made-up addresses, logos and icons — never copy those.
Contact email: info@eatnudes.com.

## Folder structure

```
emails/
  EMAIL-BRIEF.md
  previz/          ← design references (welcome.png, birthday.png)
  source/          ← raw assets: logos, product photos, fonts
  build/           ← final email HTML, ready to paste into Brevo
email-assets/      ← final optimized images used in emails (public via Vercel)
api/subscribe.js   ← serverless function: form → Brevo
```

Images in emails use absolute URLs: `https://www.eatnudes.com/email-assets/<file>`

## Phase 1 — Connect the existing signup form

The site **already has a signup form that is currently hidden** in production.
Reuse it; do not build a new one.

1. Find the existing form and report where it is, what fields it has and what it
   currently does on submit.
2. Make sure it has: first name, email, city, postal code, birth date (collected now
   even though the birthday email comes later, so the data exists when it launches),
   and a consent checkbox, unchecked by default, linking to the privacy page.
   Add missing fields in the form's existing style.
3. Add a honeypot field against bots and wire submit to `/api/subscribe` with
   loading, success and error states.
4. Add `api/subscribe.js` (reference file provided). It is **single opt-in**: it creates
   or updates the contact with `POST https://api.brevo.com/v3/contacts`
   (`updateEnabled: true`) and adds it to the list. There is NO double opt-in and no
   confirmation email. Env vars: `BREVO_API_KEY`, `BREVO_LIST_ID` only.
   On success the form redirects to `/gracias.html`.
   Add a small client-side check that suggests a correction for common email domain
   typos (gmial.com, hotmial.com, etc.) before submitting.
   **Never write the API key in any file or commit it.** Ensure `.env*` is in `.gitignore`.
5. Create `privacidad.html` (GDPR draft: purpose of each field, how to unsubscribe,
   contact — developer will review) and `gracias.html` (where the form redirects after signing up),
   both in the site's style, if they don't exist yet.
6. **Visibility:** make the form visible on this branch so it can be tested on the
   Vercel preview URL. It goes live only when the branch is merged.

## Phase 2 — Brevo setup via API

Using `BREVO_API_KEY`:
- Create contact attributes if missing: `CIUDAD` (text), `CODIGO_POSTAL` (text),
  `FECHA_NACIMIENTO` (date). `FIRSTNAME` exists by default.
- Create the list "Registro web" and report its ID.

## Phase 3 — Welcome email

### Design system

- Colors: butter yellow `#F2E49B`, espresso near-black `#1A1410`, off-white `#FAF7EC`.
  No other UI colors.
- Headline type: ultra-bold condensed grotesk, all caps (font in `emails/source/fonts/`,
  or propose a free close match). Body: clean geometric sans, fallback
  `'Helvetica Neue', Arial, sans-serif`.
- Rounded cards, pill buttons, wavy dividers, product cut-outs breaking out of frames.
- Header: espresso bar, white NUDES logo left, outline pills "MENU" and "STORES" right.
- Footer: espresso block, big yellow "EAT BETTER LAST LONGER", social icons (only the
  networks linked on the site), store addresses, unsubscribe link.

### Technical rules

- 600px wide, table-based layout, inline styles, media queries only as enhancement.
- Anything with overlapping layers is a composited image made with Python (Pillow)
  from `emails/source/`: heroes, wavy dividers, footer slogan. Export at 2× (1200px),
  optimized, into `email-assets/`. **Show each hero for approval before building HTML.**
- Everything else is live HTML: copy, bulletproof table buttons, cards, store info,
  footer links. Meaningful `alt` on every image; must make sense with images blocked.
- Brevo merge tags: `{{ contact.FIRSTNAME | default : "" }}`, `{{ unsubscribe }}`,
  `{{ mirror }}`.
- Mark editable zones with `▼ EDITABLE` / `▲ FIN EDITABLE` comments.
- Hidden preheader text in each email.

### Welcome — `emails/build/bienvenida.html` (previz: `welcome.png`)

Sent automatically by a Brevo automation (trigger: contact added to the list
"Registro web") right after signup. The developer creates the automation by hand.

1. Header.
2. Hero (image): espresso rounded card, yellow "WELCOME TO THE CLUB" on three lines,
   hand holding a yellow NUDES MEMBER card, green smoothie breaking out of the frame.
   Below in live HTML: "Ya formas parte de una comunidad que elige sentirse bien,
   cada día." + yellow pill button "VER TIENDAS".
3. "LO QUE TE ESPERA": three yellow rounded cards with line icons —
   REGALO DE CUMPLE ("Un regalo para ti el día de tu cumpleaños." — keep it generic,
   conditions are not defined yet), EVENTOS Y COLLABS, NOVEDADES PRIMERO.
4. Wavy divider (image).
5. "DÓNDE ENCONTRARNOS" card with açaí bowl photo + button "CÓMO LLEGAR".
6. Footer.

## Later (not now)

- **Birthday email** (previz `birthday.png`) — waits until the gift and its conditions
  are defined. The birth date is already being collected from Phase 1.
- **Event/campaign template** — built by the developer in Brevo's drag-and-drop editor,
  not in code, and tested with content from past campaigns.

## Checklist

- [ ] Existing form connected, tested end to end on the preview URL
- [ ] Brevo attributes and list created (ID reported)
- [ ] Hero images approved and in `email-assets/`
- [ ] Welcome HTML in `emails/build/`, test-sent to Gmail (web + mobile)
- [ ] List of manual Brevo steps for the developer
