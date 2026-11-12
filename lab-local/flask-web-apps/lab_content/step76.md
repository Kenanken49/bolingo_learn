# Step 76 · JSON Security

**Module 15 of 17 — Secure Web Application Development**

**Goal:** Confirm the framework version that parses JSON only through Flask's safe provider.

## Instructions

In Flask, it's important to ensure the security of JSON responses. In versions prior to Flask 0.10, top-level arrays were not serialized to JSON due to a security vulnerability. However, this behavior has been changed, and top-level arrays are now serialized. It is recommended to use the latest version of Flask to take advantage of this security improvement.

## Expected filesystem state afterwards

```
workspace/secure-lab/          (as it should look after step 76)
├── xss/app.py   (earlier step)
├── xss/templates/greet.html   (earlier step)
├── csrf/app.py   (earlier step)
├── csrf/templates/form.html   (earlier step)
└── unchanged - this step produces no files
```

## Verify

```bash
./lab check 76
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `pkgmin` on `flask` — importable package flask (minimum version) — at least 2.0 bytes

Stuck? `./lab solve --step 76` lays down the finished code up to this step, `./lab reset --module 15` puts the module back to its starter state.
