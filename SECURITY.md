# Security policy

Keep deployments private by default. This public repository contains source code, authored assets, and configuration templates, not live API keys, access tokens, passwords, password hashes, tunnel credentials, private keys, runtime databases, or live-platform refresh tokens.

Use .env, .dev.vars, and a deployment secret manager for local values. Keep loopback services behind the authenticated dashboard or a separately configured reverse proxy. The Discord helper is suggestion-only and must not be granted autonomous publishing or credential access.

Do not open a public issue with credentials or private logs. If a secret may have been exposed, revoke or rotate it first, then contact the repository owner privately with a minimal description and reproduction steps.
