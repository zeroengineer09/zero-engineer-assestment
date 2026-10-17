const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { get, run } = require('./database');
const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many reset attempts. Try again in 15 minutes.' } });
function mailer() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) return null;
  let nodemailer; try { nodemailer = require('nodemailer'); } catch { return null; }
  return nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT || 587), secure: SMTP_SECURE === 'true', auth: { user: SMTP_USER, pass: SMTP_PASS } });
}
function tableFor(role) { return role === 'student' ? 'student_accounts' : role === 'teacher' ? 'teachers' : null; }
router.post('/request', limiter, async (req, res) => {
  const role = String(req.body.role || '').toLowerCase();
  const email = String(req.body.email || '').trim().toLowerCase();
  const table = tableFor(role);
  if (!table || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Choose Student or Teacher and enter a valid registered email.' });
  const transport = mailer();
  if (!transport) return res.status(503).json({ error: 'Password reset email is not configured yet. The owner must configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM in deployment variables.' });
  try {
    const account = await get(`SELECT id, email, full_name FROM ${table} WHERE lower(email)=? AND active=1`, [email]);
    // Keep the response identical for existing and unknown addresses.
    if (account) {
      const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');
      await run('DELETE FROM password_reset_otps WHERE lower(email)=lower(?) OR expires_at < datetime(\'now\')', [email]);
      await run('INSERT INTO password_reset_otps (email, account_type, otp_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, datetime(\'now\', \'+10 minutes\'), 0, datetime(\'now\'))', [email, role, tokenHash]);
      try {
        await transport.sendMail({ from: process.env.MAIL_FROM, to: account.email, subject: 'ZERO ENGINEER password reset code', text: `Hello ${account.full_name},\n\nYour password reset code is ${otp}. It expires in 10 minutes.\n\nIf you did not request this, ignore this email.\n\nZERO ENGINEER no-reply`, html: `<p>Hello ${String(account.full_name).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))},</p><p>Your ZERO ENGINEER password reset code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${otp}</p><p>This code expires in 10 minutes. If you did not request this, ignore this email.</p><p>ZERO ENGINEER · No-reply</p>` });
      } catch (mailErr) { console.error('Password reset email failed:', mailErr.message); await run('DELETE FROM password_reset_otps WHERE lower(email)=lower(?)', [email]); return res.status(502).json({ error: 'Unable to send the reset email. Check the configured SMTP settings.' }); }
    }
    res.json({ ok: true, message: 'If that email is registered, a 6-digit OTP has been sent. Check your inbox and spam folder.' });
  } catch (e) { console.error('Password reset request failed:', e); res.status(500).json({ error: 'Unable to start password reset.' }); }
});
router.post('/verify', limiter, async (req, res) => {
  const role = String(req.body.role || '').toLowerCase(); const email = String(req.body.email || '').trim().toLowerCase(); const otp = String(req.body.otp || '').trim(); const next = String(req.body.newPassword || ''); const table = tableFor(role);
  if (!table || !email || !/^\d{6}$/.test(otp)) return res.status(400).json({ error: 'Enter the email and 6-digit OTP.' });
  if (next.length < 8 || !/[a-z]/.test(next) || !/[A-Z]/.test(next) || !/[0-9]/.test(next)) return res.status(400).json({ error: 'New password must be at least 8 characters and include uppercase, lowercase and a number.' });
  try {
    const row = await get('SELECT * FROM password_reset_otps WHERE lower(email)=lower(?) AND account_type=? AND expires_at > datetime(\'now\') ORDER BY id DESC LIMIT 1', [email, role]);
    if (!row || row.attempts >= 5) return res.status(400).json({ error: 'OTP is invalid or expired. Request a new code.' });
    const hash = crypto.createHash('sha256').update(otp).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(row.otp_hash))) { await run('UPDATE password_reset_otps SET attempts=attempts+1 WHERE id=?', [row.id]); return res.status(400).json({ error: 'OTP is incorrect.' }); }
    const account = await get(`SELECT id FROM ${table} WHERE lower(email)=? AND active=1`, [email]);
    if (!account) return res.status(400).json({ error: 'OTP is invalid or expired. Request a new code.' });
    await run(`UPDATE ${table} SET password_hash=?, must_change_password=0, password_changed_at=datetime('now') WHERE id=?`, [await bcrypt.hash(next, 12), account.id]);
    await run('DELETE FROM password_reset_otps WHERE lower(email)=lower(?)', [email]);
    res.json({ ok: true, message: 'Password updated. You can now sign in with your new password.' });
  } catch (e) { console.error('Password reset verification failed:', e); res.status(500).json({ error: 'Unable to reset password.' }); }
});
module.exports = router;
