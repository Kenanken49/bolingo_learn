# Step 8 · Install Flask and Jinja2

**Module 2 of 17 — Flask + Jinja2 Templates**

**Goal:** Confirm the template engine and web framework are both installed in the runtime.

## About this module

In this lab, you will learn how to use Jinja2 templates in Flask. Jinja2 is a powerful template engine that allows you to generate dynamic HTML pages in your Flask application. Templates are a great way to separate the presentation logic from the business logic of your application.

Work in `workspace/templates-lab/`. `./lab check 8` grades this step.

## Instructions

```text
pip install Flask
pip install Jinja2
```

## Expected filesystem state afterwards

```
workspace/templates-lab/          (as it should look after step 8)
└── unchanged - this step produces no files
```

## Verify

```bash
./lab check 8
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `pkg` on `flask` — importable package flask
- `pkg` on `jinja2` — importable package jinja2

Stuck? `./lab solve --step 8` lays down the finished code up to this step, `./lab reset --module 2` puts the module back to its starter state.
