# Step 79 · HTTP Public Key Pinning (HPKP)

**Module 15 of 17 — Secure Web Application Development**

**Goal:** Understand why HPKP was abandoned and what replaces it.

## Instructions

HTTP Public Key Pinning (HPKP)

HTTP Public Key Pinning (HPKP) is a security feature that tells the browser to authenticate with the server using only a specific certificate key. While this can enhance security, it is also difficult to undo if set up or upgraded incorrectly. Consider using HPKP with caution and ensure proper configuration.

> History-and-judgement step. HPKP was removed from browsers (RFC 7469 deprecated) because a bad pin could lock everyone out of a site; the modern equivalent is Certificate Transparency plus short-lived certs and an expect-CT policy. Nothing to build or run, so there is no grader for this step.

**This step has nothing to grade.** It is the end of module 15: the work was done by hand on the LabEx VM and the original lab recorded it as an observation, so the honest local check is `SKIP` with exit code 0. Do the reading, then move on.

## Expected filesystem state afterwards

```
workspace/secure-lab/          (as it should look after step 79)
├── xss/app.py   (earlier step)
├── xss/templates/greet.html   (earlier step)
├── csrf/app.py   (earlier step)
├── csrf/templates/form.html   (earlier step)
├── headers/app.py   (earlier step)
├── cookies/app.py   (earlier step)
└── unchanged - this step produces no files
```

## Verify

```bash
./lab check 79
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

Stuck? `./lab solve --step 79` lays down the finished code up to this step, `./lab reset --module 15` puts the module back to its starter state.
