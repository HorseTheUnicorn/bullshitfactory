# Bullshit Factory admin setup

The dashboard lives at /admin and is locked until all three values below are configured:

- BF_ADMIN_USERNAME: the one allowed admin username.
- BF_ADMIN_PASSWORD_HASH: an scrypt hash, never the plaintext password.
- BF_ADMIN_SESSION_SECRET: a long random secret for the HttpOnly admin cookie.

For first-time setup, run the interactive command from the deployed application directory. It prompts locally, does not echo the password, and writes only a hash and generated session secret:

```bash
cd /opt/bullshit-factory
npm run admin:setup
```

If the checkout is elsewhere, replace the example path. Set BF_ADMIN_ENV_FILE to write to a separate environment file; otherwise the command updates the local .env. Keep the environment file mode at 600 and restart the dashboard service.

Use --replace only when intentionally rotating the one account. The command updates only the BF_ADMIN_* entries and preserves the other settings.

For a one-shot hash, use a private interactive shell:

```bash
read -rsp 'Bullshit Factory admin password: ' BF_ADMIN_PASSWORD
printf '\n'
export BF_ADMIN_PASSWORD
npm run admin:hash
unset BF_ADMIN_PASSWORD
```

Store only the printed hash in BF_ADMIN_PASSWORD_HASH. Generate a separate random BF_ADMIN_SESSION_SECRET with a password manager or a command such as openssl rand -hex 32. Never put plaintext passwords, hashes, session secrets, live-platform tokens, or private keys in Git, browser code, deployment manifests, screenshots, or support requests.

The login form accepts the single configured username and password. The authentication cookie is HttpOnly and expires after twelve hours.
