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

**[info@veriworkly.com](mailto:info@veriworkly.com)**

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

Sensitive values (e.g., `AUTH_SECRET`, `JWT_SECRET`) must be securely configured via environment variables.

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
