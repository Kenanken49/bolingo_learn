# Step 77 · Security Headers

**Module 15 of 17 — Secure Web Application Development**

**Goal:** Add the response headers that constrain framing, sniffing, policy loading and force HTTPS.

## Instructions

Browsers recognize various response headers to control security. It is recommended to review and use the following security headers in your Flask application:

• HTTP Strict Transport Security (HSTS): Tells the browser to convert all HTTP requests to HTTPS. • Content Security Policy (CSP): Specifies where various types of resources can be loaded from. • X-Content-Type-Options: Forces the browser to honor the response content type. • X-Frame-Options: Prevents external sites from embedding your site in an iframe.

You can use the Flask-Talisman extension to manage HTTPS and security headers in your Flask application.

## Expected filesystem state afterwards

```
workspace/secure-lab/          (as it should look after step 77)
├── headers/app.py   (this step)
├── xss/app.py   (earlier step)
├── xss/templates/greet.html   (earlier step)
├── csrf/app.py   (earlier step)
├── csrf/templates/form.html   (earlier step)
```

## Files this step touches

- `workspace/secure-lab/headers/app.py`

## Verify

```bash
./lab check 77
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `app` on `app:app` — application factory app:app — in-process GET /, response headers X-Content-Type-Options, X-Frame-Options, Content-Security-Policy, Strict-Transport-Security, HTTP 200

Stuck? `./lab solve --step 77` lays down the finished code up to this step, `./lab reset --module 15` puts the module back to its starter state.
