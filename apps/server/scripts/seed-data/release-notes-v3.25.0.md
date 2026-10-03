This release moves VeriWorkly's ATS scoring and parsing into `@veriworkly/ats-engine`, an open-source package now published on npm and developed in its own repository. The ATS checker gains a requirements panel that judges every line of a job posting against the resume, integrity checks catch the tricks candidates are told to use on screeners, and resume templates now render in a way every major PDF text extractor reads correctly. ATS scores change for the same resume compared with 3.24.x.

## ✨ Added

- Published `@veriworkly/ats-engine` 0.1.0 to npm with build provenance, developed at [VeriWorkly/ats-engine](https://github.com/VeriWorkly/ats-engine). The server, site and studio install it from npm.
- Added a requirements panel to the ATS checker: each requirement in a posting is marked met, partly met, missing or unverifiable, with the resume lines that support it.
- Added integrity checks for hidden text in PDF and DOCX files, invisible and look-alike characters, instructions aimed at AI screeners, pasted job postings, and keyword stuffing.
- Added German and Hindi language support and US, German and Indian regional conventions (phone numbers, date order, credentials).
- The Studio ATS workspace now sends the resume as a structured document, so it is scored exactly as written instead of being re-parsed from text.

## 🔧 Improved

- Scoring follows a published rubric with a readiness score, a job-match score, per-category scores and a verdict; rules with no evidence to judge are left out instead of passed.
- Parsing reads more real-world resumes: dates with a day, sentence-case and letter-spaced headings, job titles that begin with a section word, title and employer joined by "@", and school names apart from their degree.
- Requirement matching understands degree-or-experience alternatives, year ranges such as "3 to 5 years", and language lists, and no longer reads US state codes as degrees.
- AI analysis and resume conversion redact personal details before sending, and every value the model returns must appear in the resume.
- Resume templates cap section-title letter spacing and stack the headline under the name, so ATS text extraction keeps headings and names intact.
- Updated the OpenAPI specification for the ATS endpoints.

## 🐛 Fixed

- Fixed phone numbers being joined with digits from the following line.
- Fixed lines beginning with ".NET" being read as bullet points.
- Fixed honest content being flagged as hidden text: white text on dark table cells, Arabic and Hebrew phone formatting, and Greek letters in scientific terms.

## 🛡️ Security

- DOCX uploads are measured exactly as the document reader opens them, so a compressed "zip bomb" is refused before it is unpacked.
- Resume, posting and AI-output processing runs in linear time on hostile input, closing slow-regex and slow-matching denial-of-service paths.

**Full Changelog**: https://github.com/VeriWorkly/veriworkly/compare/Release-v3.24.4...Release-v3.25.0
