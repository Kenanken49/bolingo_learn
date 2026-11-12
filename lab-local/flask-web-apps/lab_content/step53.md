# Step 53 · Installing Flask and Blinker

**Module 11 of 17 — Signals and Application Lifecycle**

**Goal:** Install the blinker package that Flask uses for signals.

## About this module

In this lab, you will learn how to use signals in Flask, which are a lightweight way to notify subscribers of certain events during the lifecycle of the application and each request. Signals allow you to perform actions in response to specific events without directly affecting the application code. They are useful for testing, metrics, auditing, and more.

Work in `workspace/signals-lab/`. `./lab check 53` grades this step.

## Instructions

Before we begin, make sure you have Flask and Blinker installed. You can install them using pip:

```text
pip install flask blinker
```

## Expected filesystem state afterwards

```
workspace/signals-lab/          (as it should look after step 53)
└── unchanged - this step produces no files
```

## Verify

```bash
./lab check 53
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `pkg` on `blinker` — importable package blinker

Stuck? `./lab solve --step 53` lays down the finished code up to this step, `./lab reset --module 11` puts the module back to its starter state.
