<<<<<<< HEAD
# Certified Developer Test | ZERO ENGINEER

A local Node.js + Express + SQLite assessment application. The included certificate background and logo crop are derived from the supplied ZERO ENGINEER certificate image.

## Requirements
- Node.js LTS (18+ recommended)
- npm
- VS Code (optional)

## Windows setup
1. Extract the ZIP and open `certified-developer-test` in VS Code.
2. Open Terminal → New Terminal.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Set `SESSION_SECRET` to a long random value (32+ characters), and set a strong `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
6. Initialize SQLite and seed the assessment: `npm run init-db`.
7. Create the first administrator: `npm run create-admin`.
8. Start the site: `npm start`.
9. Open `http://localhost:3000`.

The initial assessment is **Introduction to Web Design**, 50 seeded MCQs, 30 minutes, 60% pass threshold. Database file defaults to `database/certified-developer-test.db`.

## Data and security
- Correct answers remain server-side and are not included in student question responses.
- Scoring and certificate eligibility are calculated on the server.
- Admin routes require a session. Passwords use bcrypt hashing. Session cookies are HttpOnly and SameSite Strict; login attempts are rate-limited.
- Set `NODE_ENV=production`, use HTTPS, and configure trusted proxy settings correctly when deployed behind a reverse proxy. The app enables secure cookies in production.
- Browser tab/fullscreen restrictions are best-effort and can be bypassed; they are not a true kiosk environment.
- Back up the SQLite database by stopping the server and copying `database/certified-developer-test.db`. If using WAL mode in a future configuration, back up via SQLite's online backup API or include WAL files safely.

## Administration
- Login through “Administrator login” on the landing page.
- Question Management allows adding/deleting questions. Assessment Settings controls title, duration, passing threshold, attempts, enabled state and violation policy. Results allows viewing results and CSV export.
- To edit a question, use the database or extend the admin interface with an edit form; the API includes `PUT /api/admin/questions/:id` for updates.
- Assessment creation is available through `POST /api/admin/assessments`; the current dashboard focuses on settings for existing assessments.
- Branding: replace `public/assets/zero-engineer-logo.png` with an appropriately sized logo image. Certificate background is `public/assets/zero-engineer-certificate.png`; preserve the aspect ratio and recalibrate `public/js/certificate.js` coordinates after changing the template.
- Database schema is in `database/schema.sql`; sample MCQs and initialization are in `server/seed.js`.

## Tests
Run `npm test`. See `tests/test-plan.md` for the acceptance checklist. Run the server and verify all flows before public deployment; this project has not undergone an independent penetration test.

## Limitations to verify before production
- This is a practical starter implementation, not a certified/accredited examination service.
- Certificate text coordinates are initial estimates for the supplied 1536×1087 image. Use the developer-only alignment workflow described in the project request to verify coordinates before issuing real certificates; student-facing output uses one canvas renderer.
- Add CSRF tokens to state-changing admin routes before production deployment if expanding authentication beyond SameSite cookie protections.
- Certificate PNG is generated client-side after server-side eligibility; no public verification endpoint is claimed.
=======
# zero-engineer-assestment
ZERO ENGINEER Certified Developer Test — An online MCQ assessment platform with automated scoring, student certificates, and administrator dashboard.

