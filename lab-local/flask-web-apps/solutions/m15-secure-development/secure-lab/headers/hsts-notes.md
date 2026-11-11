# Why HPKP is gone and HSTS replaced it

HTTP Public Key Pinning (RFC 7469) let a site publish the public keys its TLS
certificate had to match. In practice one mistyped pin, or one replaced
certificate, locked every visitor out of the domain - there was no way to
undo it before the pin's `max-age` expired. Chrome and Firefox removed it.

What remains, and what this lab's header does:

* `Strict-Transport-Security` - only ever talk to this host over HTTPS.
* `Content-Security-Policy` with `require-src` / pinning is not a replacement;
  modern deployments rely on certificate authorities plus
  Certification Authority Authorization (CAA) DNS records, and on short-lived
  certificates that make accidental issuance easy to retire.

The lesson from HPKP: a security header that cannot be rolled back is a
self-inflicted outage waiting to happen.
