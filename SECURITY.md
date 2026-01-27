# Security Policy

## Reporting a Vulnerability

The Google Chrome Lighthouse team takes security issues seriously. We appreciate your efforts to responsibly disclose your findings and will make every effort to acknowledge and address valid security reports in a timely manner.

### How to Report

Please **do not report security vulnerabilities through public GitHub issues**.

Instead, report security issues via one of the following official channels:

- **Google Vulnerability Reward Program (VRP)**  
  https://bughunters.google.com/report

When submitting a report, please include:
- A clear description of the vulnerability
- Steps to reproduce the issue
- Proof-of-concept (if available)
- Impact assessment (what an attacker could gain)
- Any relevant logs, screenshots, or code snippets

### Scope

Security issues related to the following are in scope:
- Lighthouse core auditing logic
- Lighthouse Node.js package
- Lighthouse Chrome extension
- CI or build-related security concerns
- Dependency vulnerabilities that impact Lighthouse behavior

Issues **not** in scope:
- Denial of Service via malformed or intentionally hostile websites
- Vulnerabilities in third-party websites audited by Lighthouse
- Issues caused by unsupported or modified environments

### Supported Versions

Only the **latest stable release** of Lighthouse is actively supported for security fixes.  
Users are strongly encouraged to upgrade to the most recent version.

| Version        | Supported |
|----------------|-----------|
| Latest release | ✅ Yes    |
| Older releases | ❌ No     |

### Disclosure Process

Once a security report is received:
1. The report will be reviewed and validated by the Lighthouse security team.
2. If confirmed, a fix will be developed and tested.
3. The fix will be released, and public disclosure will occur after users have had reasonable time to update.

Please allow time for investigation before requesting updates.

### Security Best Practices

We recommend users:
- Always use the latest Lighthouse version
- Keep Node.js and Chrome up to date
- Avoid running Lighthouse with untrusted flags or scripts
- Review third-party plugins before use

## Acknowledgements

We thank the security research community for helping keep Lighthouse safe and reliable for everyone.
