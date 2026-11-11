# Step 61 · Starting the Shell

**Module 12 of 17 — Working with the Shell and Request Context**

**Goal:** Open the Flask shell and inspect the application and request context interactively.

## About this module

The Python Flask tutorial 'Working with the Shell' provides guidance on using the interactive shell in Flask to execute Python commands in real-time. This tutorial explains how to create a request context, fire before/after request functions, and improve the shell experience.

Work in `workspace/shell-lab/`. `./lab check 61` grades this step.

## Instructions

To start the shell, use the flask shell command, which automatically initializes the shell with a loaded application context.

```text
flask shell
```

> Interactive step: flask shell opens a Python REPL inside an app context, so it leaves no file artefact to grade. Run the commands in the terminal and read what they print, then continue to step 62.

**This step has nothing to grade.** It is the end of module 12: the work was done by hand on the LabEx VM and the original lab recorded it as an observation, so the honest local check is `SKIP` with exit code 0. Do the reading, then move on.

## Expected filesystem state afterwards

```
workspace/shell-lab/          (as it should look after step 61)
└── unchanged - this step produces no files
```

## Verify

```bash
./lab check 61
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

Stuck? `./lab solve --step 61` lays down the finished code up to this step, `./lab reset --module 12` puts the module back to its starter state.
