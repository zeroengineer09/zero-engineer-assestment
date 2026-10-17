# ZERO ENGINEER Certified Developer Test


## Email OTP password recovery

Student and teacher login pages provide a **Forgot password?** flow. The server creates a one-time 6-digit OTP, stores only its SHA-256 hash, expires it after 10 minutes, rate-limits requests, and updates the password only after OTP verification.

To enable email delivery, configure these deployment environment variables using your SMTP provider and a sender address verified by that provider:

- `SMTP_HOST`
- `SMTP_PORT` (usually `587`)
- `SMTP_SECURE` (`false` for STARTTLS on port 587; `true` for implicit TLS on port 465)
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM` (a verified no-reply sender, e.g. `ZERO ENGINEER No-Reply <no-reply@your-verified-domain.example>`)

Do not commit real SMTP credentials. Without valid SMTP settings and a verified sender, the UI will show a configuration/delivery error and cannot send OTP emails.
