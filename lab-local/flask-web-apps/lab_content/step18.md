# Step 18 · Install Flask

**Module 4 of 17 — The Flask Command Line Interface**

**Goal:** Have the Flask package importable for the CLI exercises.

## About this module

In this lab, you will learn how to use the Flask Command Line Interface (CLI) to manage your Flask application. The Flask CLI provides a set of commands that can help you run the development server, create custom commands, and more.

Work in `workspace/cli-lab/`. `./lab check 18` grades this step.

## Instructions

```text
pip install flask
```

## Expected filesystem state afterwards

```
workspace/cli-lab/          (as it should look after step 18)
└── unchanged - this step produces no files
```

## Verify

```bash
./lab check 18
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `pkg` on `flask` — importable package flask

Stuck? `./lab solve --step 18` lays down the finished code up to this step, `./lab reset --module 4` puts the module back to its starter state.
