# 🔐 Security Policy

We take the security of **VeriWorkly** seriously and appreciate the efforts of the community in responsibly disclosing vulnerabilities.

---

## 🛡️ Supported Versions

We provide security updates for the latest stable release.

| Version | Supported |
| ------- | --------- |
| ≥ 3.0.0 | ✅ Yes    |
| < 3.0.0 | ❌ No     |

> Only the most recent major version is actively maintained.

---

## 📝 Reporting a Vulnerability

If you discover a security vulnerability, please **do not open a public issue**.

Instead, report it responsibly:

### 📧 Contact

Send an email to:

**[grievance@veriworkly.com](mailto:grievance@veriworkly.com)**

---

### 📋 Include the following details

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact and severity
- Any suggested fixes (optional)

---

## ⏱️ Response Timeline

- **Acknowledgment:** within 24–48 hours
- **Investigation:** ongoing communication if needed
- **Resolution:** as quickly as possible based on severity

Once resolved:

- A security advisory may be published
- You will be credited (if desired)

---

## 🛡️ Safe Harbour

If you make a good-faith effort to follow this policy while researching a
vulnerability, we will treat your testing as **authorised**. We will not pursue or
support legal action against you over it, and if a third party brings action over
research that followed this policy, we will make it known that your testing was
authorised.

To stay inside that, please:

- Stay within scope, and work only with your own accounts and your own data.
- Do not degrade the service for other people.
- Do not access, modify, or retain anyone else's personal data. If you encounter it
  by accident, stop, and tell us.
- Give us a reasonable chance to fix the issue before disclosing it publicly.

If you are unsure whether something is in scope, ask first. We would much rather answer
the question than have you guess.

**We do not run a paid bug bounty.** We are a very small team without a budget for one,
and we would rather say that plainly than imply a reward that is not there. What we can
offer is a fast, honest response and public credit where you want it.

---

## 🔒 Security Principles

We follow a security-first approach:

### 🔐 Privacy First

User data is not stored unless explicitly required (e.g., sharing features).

### 📉 Data Minimization

We collect only essential data required for authentication and functionality.

### 🛡️ Secure Defaults

- HTTP security headers (Helmet)
- Rate limiting (Redis-backed)
- Input validation (Zod)

### 🔑 Secrets Management

Sensitive values such as `AUTH_SECRET` must be securely configured through environment variables.

---

## ⚠️ Scope

This policy applies to:

- Frontend (Next.js)
- Backend (Express API)
- Infrastructure defined in this repository

---

## 🙏 Acknowledgment

We appreciate responsible disclosure and thank contributors for helping keep the project secure.

---

Built by [VeriWorkly](https://veriworkly.com) with ❤️.
