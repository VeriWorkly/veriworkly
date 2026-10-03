# Scoring rubric

Generated from the community policy (`DEFAULT_POLICY`) by `npm run rubric`; do not edit by hand.

- Engine 0.1.0, policy `ats-v2+3c69074c`.
- **Score.** Each rule that applies can lose its weight. The readiness score is the share of the
  applicable weight kept, 0–100. A rule whose evidence is absent — page geometry for pasted
  text, a posting for the copied-posting check — is left out of both the report and the score.
- **Deductions.** Integrity rules (`−n pts`) are taken off the finished score in points and are
  never part of the weighing: an honest resume scores exactly as if they did not exist.
- **Determinism.** The same input, reference date (`now`), engine version and policy fingerprint
  always produce the same report. Every report carries `engine.version` and `engine.policy`.
- Region packs adjust a few rules by country; see LOCALES.md.

| Rule | Category | Severity | Reads | Weight | Passes when | Fix |
|---|---|---|---|---|---|---|
| `ats-v2.integrity.promptInjection` | Integrity | error | injectionPhrases | −30 pts | No instructions aimed at an AI screener. | Remove it. Recruiters and screening tools treat instructions to an AI as manipulation, and many reject the application on sight. |
| `ats-v2.integrity.hiddenText` | Integrity | error | hiddenTextChars | −30 pts | No hidden text. | Remove hidden text. White or tiny text and text behind an image is read by the ATS and treated as keyword stuffing once a recruiter sees it. |
| `ats-v2.integrity.copiedPosting` | Integrity | error | copiedPostingRatio | −25 pts | The resume is not a copy of the posting. | Describe your own experience. A pasted posting is caught the moment a recruiter reads the resume. |
| `ats-v2.integrity.invisibleCharacters` | Integrity | warning | invisibleCharacters | −10 pts | No invisible characters. | Remove zero-width and other invisible characters; retype any word they split. |
| `ats-v2.integrity.homoglyphs` | Integrity | warning | homoglyphWords | −10 pts | No look-alike letters from other alphabets. | Retype those words: they look right but no search matches them. |
| `ats-v2.integrity.keywordStuffing` | Integrity | warning | stuffedTerms | −10 pts | No keyword stuffing. | Name each skill where you used it. Repetition does not raise a match score in a modern ATS, and recruiters read it as stuffing. |
| `ats-v2.parse.text` | Parsing | error | at least 50 words | 20 | Recovered n words of text. | Save the resume as a text-based PDF rather than a scan or an image. |
| `ats-v2.parse.imageOnly` | Parsing | error | imageOnlyPages | 15 | Every page has a text layer. | Export the resume as a text PDF rather than scanning it or saving it as an image. |
| `ats-v2.parse.roles` | Parsing | error | rolesDetected | 15 | n roles were recovered from the work history. | Give each job a line with the title, the employer, and a date range. |
| `ats-v2.parse.roleCompleteness` | Parsing | warning | roleCompleteness | 10 | n% of recovered roles have a title, an employer and a start date. | Make sure every job lists a title, an employer, and a date range. |
| `ats-v2.parse.contact` | Parsing | warning | contactCompleteness | 8 | n% of the expected contact fields were recovered. | Include a name, an email address, and a phone number as plain text. |
| `ats-v2.contact.email` | Contact & links | error | a pattern, in the document | 12 | An email address was found. | Add an email address to the header of the resume. |
| `ats-v2.contact.position` | Contact & links | warning | contact details in the first 25% | 6 | Contact details appear near the top of the document. | Move the email address and phone number into the header. |
| `ats-v2.privacy.dateOfBirth` | Contact & links | info | dateOfBirthStated | 2 | No date of birth is stated. | Leave your date of birth off unless the country you are applying in expects it. |
| `ats-v2.structure.experience` | Structure | error | a experience heading | 12 | An experience section heading was found. | Add a heading reading 'Experience' above the work history. |
| `ats-v2.structure.education` | Structure | warning | a education heading | 8 | An education section heading was found. | Add a heading reading 'Education' above the qualifications. |
| `ats-v2.structure.skills` | Structure | warning | a skills heading | 8 | A skills section heading was found. | Add a heading reading 'Skills' above the skills list. |
| `ats-v2.content.metrics` | Evidence | warning | metricsRatio | 10 | n% of content lines carry a number. | Quantify outcomes: amounts, percentages, timeframes, headcounts. |
| `ats-v2.content.verbs` | Evidence | warning | actionVerbRatio | 8 | n% of content lines open with an action verb. | Start each bullet with a verb describing what you did. |
| `ats-v2.content.buzzwords` | Evidence | info | buzzwordCount | 5 | Little filler language. | Replace filler phrases with a specific thing you did. |
| `ats-v2.content.timeline` | Evidence | info | timelineIssues | 3 | The dates in the work history are consistent. | Check the dates: a role cannot start after today, and an end date left off makes jobs overlap. |
| `ats-v2.content.skillEvidence` | Evidence | info | unsupportedSkills | 3 | Most listed skills are backed by the work they were used in. | Name each key skill in the role or project where you used it, not only in the list. |
| `ats-v2.format.length` | Format risk | warning | wordCount | 10 | The resume is n words, a reasonable length. | Aim for roughly one page per five years of experience. |
| `ats-v2.format.letterSpacing` | Format risk | warning | letterSpacedLines | 8 | Headings extract as whole words. | Remove the letter spacing (tracking) from section headings so they extract as words. |
| `ats-v2.format.columns` | Format risk | error | columnRatio | 15 | The document reads as a single column. | Use a single-column layout; columns extract in a scrambled order. |
| `ats-v2.format.tables` | Format risk | warning | tableCount | 10 | No ruled tables were found. | Replace tables with plain paragraphs and bullets. |
| `ats-v2.format.photo` | Format risk | info | imageCount | 2 | No photo was found. | Leave the photo off unless the country you are applying in expects one. |
