This release changes how the ATS checker reads and scores a resume. Every requirement in a job posting is now checked against your resume one by one, the checker catches the hidden-text and keyword tricks that get resumes rejected, and our resume templates now come through ATS text extraction intact. The engine behind all of it is now open source and published on npm as `@veriworkly/ats-engine`, so anyone can see exactly how a resume is read and scored.

## ⚠️ Breaking

- **ATS scores change.** The same resume and job posting will usually score differently than on 3.24.x. Scoring now follows a [published rubric](https://github.com/VeriWorkly/ats-engine/blob/main/RUBRIC.md), a check with nothing to judge is left out instead of being counted as a pass, and a resume caught gaming the screener can no longer earn a "strong" verdict from its job match alone.

## ✨ Added

- **Requirement-by-requirement matching.** Paste a job posting and each requirement is marked Met, Partly met, Not shown, or Answer in the application (for things a resume cannot settle, such as the right to work), together with the lines from your resume it relied on.
- **Integrity checks.** The checker now finds white or tiny text, text hidden in PDF and Word files, invisible and look-alike characters, instructions written for AI screeners, a pasted job posting, and keywords repeated far beyond normal use. They only lower the score when something is found: an honest resume scores exactly as if these checks did not exist.
- **German and Hindi.** Resumes and job postings in German and Hindi are read in their own language, with US, German and Indian conventions for phone numbers, date order and qualifications.
- **Open-source ATS engine.** [`@veriworkly/ats-engine`](https://www.npmjs.com/package/@veriworkly/ats-engine) is published on npm under the MIT license with build provenance, and developed in its own repository at [VeriWorkly/ats-engine](https://github.com/VeriWorkly/ats-engine).

## 🔧 Improved

- **Studio scores your resume as you wrote it.** The ATS workspace now sends your resume as structured data instead of having it re-read from a PDF, so nothing is lost in between.
- **ATS-safe resume templates.** Section titles were spaced so widely that PDF readers split them into single letters ("E X P E R I E N C E") and an ATS found no Experience section. Spacing is now capped on every template, and the headline sits under your name instead of beside it, where it was being read as part of the name.
- **More resumes read correctly.** Dates written with a day ("15 March 2020"), headings in sentence case ("Education and certifications"), job titles that begin with a section word ("Education Coordinator"), and "Data Scientist @ Netflix" are all read as a person would read them.
- **Smarter requirement matching.** "A bachelor's degree or 4 years of experience" is met by either one, "3 to 5 years" asks for 3, a list of languages is read as a list, and a state code such as "Boston, MA" is no longer mistaken for a master's degree.
- **More private AI analysis.** Your name, email and phone number are removed before your resume is sent to the AI model, and anything the model returns must actually appear in your resume before it is shown.
- **One engine everywhere.** The server, site and Studio now use the published engine instead of keeping their own copies of the same logic, and the API documentation describes the new report fields.

## 🐛 Fixed

- A phone number followed by a line that starts with digits no longer swallows those digits.
- Lines beginning with ".NET" are no longer mistaken for bullet points.
- White text in dark table cells, phone numbers in Arabic and Hebrew resumes, and Greek letters in scientific terms such as "TNFα" are no longer flagged as hidden or suspicious.

## 🛡️ Security

- Word uploads are now measured exactly the way the document reader opens them, so a small file built to expand into gigabytes (a "zip bomb") is refused before it is ever unpacked.
- Resumes, job postings and AI responses are processed in linear time even when they are deliberately crafted to be slow, closing several ways a single upload could tie up the server.

**Full Changelog**: https://github.com/VeriWorkly/veriworkly/compare/Release-v3.24.4...Release-v3.25.0
