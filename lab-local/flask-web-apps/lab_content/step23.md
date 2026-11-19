# Step 23 · Creating the Application Directory

**Module 5 of 17 — Building a Flask Application (Application Factory)**

**Goal:** Create the flaskr package directory inside the flaskr-app project.

## About this module

This Lab will guide you through the process of setting up a basic Flask application. Flask is a lightweight web application framework for Python. It's designed to make getting started with web development quick and easy.

Work in `workspace/flaskr-app/`. `./lab check 23` grades this step.

## Instructions

Creating the Application Directory

First, you need to create a directory for your application. This will serve as the main folder where all the necessary files for your application will be stored.

```bash
cd ~/project
mkdir flaskr
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 23)
├── flaskr/   (this step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/`

## Verify

```bash
./lab check 23
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `dir` on `flaskr-app/flaskr` — directory flaskr-app/flaskr

Stuck? `./lab solve --step 23` lays down the finished code up to this step, `./lab reset --module 5` puts the module back to its starter state.
