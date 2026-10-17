# Certified Developer Test

## Student accounts and profile

Student login uses a roster imported by the owner/admin. Save the institution's spreadsheet as CSV with columns `email`, `full_name`, `academic_year` (FY/SY/TY), `division` (A/B/C/D), `roll_number`, and `admission_year`. A sample is in `student-roster-template.csv`.

Import on the server using `node server/importStudents.js path/to/student-roster.csv`. New student accounts receive the shared initial password `Pass@123` and are required to change it at first login. Existing accounts keep their existing passwords when roster details are updated. The importer updates roster details only; it does not reset passwords.

Student profile photos are stored in the SQLite database (JPG/PNG, max 256 KB). The student profile intentionally does not display a phone-number field. Until the student roster is imported, student login will correctly report that the account is not registered.
