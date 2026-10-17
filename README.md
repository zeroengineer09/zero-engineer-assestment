# ZERO ENGINEER Certified Developer Test


## Teacher and owner accounts

Teacher accounts are initialized from `server/initializeAccounts.js`. Set `TEACHER_INITIAL_PASSWORD` and `OWNER_INITIAL_PASSWORD` in the environment before running `npm run initialize-accounts`. Run `npm run init-db` first. The initialization script creates accounts only when they do not already exist; it does not reset existing teacher or owner passwords. Every initial account must change its password after first login. Passwords are stored as bcrypt hashes in SQLite, not as plaintext.

Teacher sign-in is separate from owner sign-in. The teacher lookup displays the registered teacher name after a matching email is entered. The spreadsheet `teacher-directory.xlsx` is a separate onboarding reference. Protect it and delete it after distributing initial credentials.
