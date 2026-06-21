# Security Guide for Public WebUI Hosting

The Dune Docker Console WebUI is a privileged admin surface. It can start and stop containers, run repair scripts, access game data, and use the mounted Docker socket. Treat it like root-equivalent infrastructure access.

## Recommended Exposure Model

Use one of these patterns:

1. Private HTTP only: bind the WebUI to a private interface and reach it through a VPN, SSH tunnel, Tailscale, WireGuard, or a trusted LAN.
2. Public HTTPS behind an access proxy: terminate TLS at a reverse proxy or identity-aware proxy, require MFA or SSO there, and forward only to the local WebUI.
3. Temporary setup exposure: open the WebUI only long enough to finish bootstrap, then move it behind private access.

Do not expose the WebUI over public plain HTTP. Plain HTTP cannot protect the admin password, session cookie, CSRF token, or operational output in transit.

Unauthenticated clients must not be able to use operational API endpoints. The only anonymous application endpoints should be sign-in/session-state endpoints, plus `/api/health` only when `ADMIN_PUBLIC_HEALTH_ENABLED=1`; all server, database, player, map, log, addon, backup, and admin actions require an authenticated WebUI session.

## Minimum Public HTTPS Configuration

Set these values in `.env` when the console is reachable through a public HTTPS hostname:

```env
ADMIN_AUTH_DISABLED=0
ADMIN_BIND_HOST=127.0.0.1
ADMIN_PUBLIC_BASE_URL=https://dune-admin.example.com
ADMIN_ALLOWED_HOSTS=dune-admin.example.com
ADMIN_ALLOWED_ORIGINS=https://dune-admin.example.com
ADMIN_TRUST_PROXY=1
ADMIN_PUBLIC_HEALTH_ENABLED=0
ADMIN_SECURE_COOKIES=auto
ADMIN_COOKIE_SAMESITE=Strict
ADMIN_HSTS_ENABLED=1
ADMIN_API_RATE_LIMIT_WINDOW_MS=60000
ADMIN_API_RATE_LIMIT_MAX=600
ADMIN_API_MUTATION_RATE_LIMIT_MAX=120
ADMIN_API_EXPENSIVE_RATE_LIMIT_MAX=120
ALLOW_HOST_BOOTSTRAP=false
```

Use a strong unique `ADMIN_PASSWORD` or the generated password in `runtime/secrets/admin-web-password.txt`. Do not reuse game, Discord, GitHub, or server login passwords.

## Minimum Private Non-HTTPS Configuration

For private HTTP over LAN, VPN, or SSH tunnel:

```env
ADMIN_AUTH_DISABLED=0
ADMIN_BIND_HOST=127.0.0.1
ADMIN_PUBLIC_BASE_URL=
ADMIN_ALLOWED_HOSTS=127.0.0.1,localhost
ADMIN_ALLOWED_ORIGINS=http://127.0.0.1:8088,http://localhost:8088
ADMIN_TRUST_PROXY=0
ADMIN_PUBLIC_HEALTH_ENABLED=0
ADMIN_SECURE_COOKIES=0
ADMIN_COOKIE_SAMESITE=Lax
ADMIN_HSTS_ENABLED=0
ADMIN_API_RATE_LIMIT_WINDOW_MS=60000
ADMIN_API_RATE_LIMIT_MAX=600
ADMIN_API_MUTATION_RATE_LIMIT_MAX=120
ADMIN_API_EXPENSIVE_RATE_LIMIT_MAX=120
ALLOW_HOST_BOOTSTRAP=false
```

If you bind to a LAN address instead of loopback, include the exact host and port that admins use in `ADMIN_ALLOWED_HOSTS` and `ADMIN_ALLOWED_ORIGINS`.

## Reverse Proxy Requirements

The proxy should:

- Terminate TLS with a valid certificate.
- Redirect HTTP to HTTPS.
- Require an access layer such as VPN, SSO/MFA, or IP allowlisting before traffic reaches the WebUI.
- Preserve `Host`, `X-Forwarded-Host`, and `X-Forwarded-Proto`.
- Preserve `X-Forwarded-For` only from the trusted proxy path, and set `ADMIN_TRUST_PROXY=1` only when direct client traffic cannot reach the WebUI port.
- Add proxy-level request throttling for `/api/` in addition to the built-in application limiter.
- Limit request body size unless backup import workflows require larger uploads.
- Log admin access and forward logs to the host log retention system.

Example Nginx location:

```nginx
location / {
  proxy_pass http://127.0.0.1:8088;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Host $host;
  proxy_set_header X-Forwarded-Proto https;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  client_max_body_size 1g;
}
```

## Built-In WebUI Hardening

The WebUI API includes:

- Signed HttpOnly session cookies with configurable `Secure` and `SameSite`.
- CSRF token validation for state-changing requests.
- Origin/Referer validation when browsers send those headers.
- Minimal anonymous API behavior: login and session-state endpoints reveal no operational data, and `/api/health` requires authentication unless `ADMIN_PUBLIC_HEALTH_ENABLED=1`.
- Startup guard that rejects `ADMIN_AUTH_DISABLED=1` with `ADMIN_PUBLIC_BASE_URL` by default.
- Optional Host allowlisting through `ADMIN_ALLOWED_HOSTS`.
- Per-client API rate limits for all API calls, stricter mutation limits, and stricter limits for data-heavy API paths.
- `Cache-Control: no-store` and `X-Robots-Tag` on API responses to reduce accidental indexing and shared-cache exposure.
- Content Security Policy, frame blocking, no-sniff, referrer, permissions, and cross-origin headers.
- Optional HSTS through `ADMIN_HSTS_ENABLED` or an HTTPS `ADMIN_PUBLIC_BASE_URL`.
- Request/header timeout and size limits.
- Audit logging for administrative actions in `runtime/generated/web-admin-audit.jsonl`.

## SOC 2 and OWASP Alignment Targets

This project is not SOC 2 certified by itself. Use these controls as implementation evidence for a broader program:

- Access control: keep `ADMIN_AUTH_DISABLED=0`, protect the WebUI with MFA or VPN, and limit who knows the admin password.
- Change management: deploy changes through reviewed pull requests and keep release notes for operational changes.
- Logging and monitoring: retain WebUI audit logs, reverse-proxy access logs, Docker logs, and security scan outputs.
- Vulnerability management: run dependency, container, secret, and SAST scans before publishing releases.
- Incident response: document who can rotate `ADMIN_PASSWORD`, Funcom tokens, Discord tokens, and host credentials.
- Availability: back up database and generated configuration before updates; verify restore procedures.

## Firewall Baseline

Expose only the game ports needed by players. Keep database, RabbitMQ admin, and the WebUI private unless the WebUI is protected by HTTPS plus an access proxy.
