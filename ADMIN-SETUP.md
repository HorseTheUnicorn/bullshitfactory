# Bullshit Factory admin setup

The production dashboard lives at `/admin`. It is intentionally locked until the server has both values below:

- `BF_ADMIN_USERNAME`: the one allowed admin username. There is no registration or second-user path.
- `BF_ADMIN_PASSWORD_HASH`: an scrypt hash, never the plaintext password.
- `BF_ADMIN_SESSION_SECRET`: a long random secret used to sign the HttpOnly admin cookie.

For the safest first-time setup on `.76`, run the interactive command from the deployed application directory. It prompts locally for the username and password, writes only a password hash and generated session secret, and does not echo the password:

```bash
cd /home/goblin/cave/bullshit-factory
npm run admin:setup
sudo systemctl restart bullshit-factory.service
```

Run it again with `--replace` only when intentionally rotating the one account. The setup command updates only the three `BF_ADMIN_*` entries and preserves the rest of `.env`.

Generate a password hash from a private shell session:

```powershell
$env:BF_ADMIN_PASSWORD = Read-Host 'Bullshit Factory admin password'
npm run admin:hash
Remove-Item Env:BF_ADMIN_PASSWORD
```

Alternatively, put the chosen username, printed hash, and a separately generated random session secret in the server-local `.env`, restart the dashboard service, and open `/admin`. The login form accepts that single username and password only. The authentication cookie is HttpOnly and expires after twelve hours. Production and music API routes reject requests without a valid admin session.

Do not commit `.env`, password values, hashes, or session secrets.
