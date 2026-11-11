# Step 38 · Create CSS file

**Module 8 of 17 — Styling the Application with Static Files**

**Goal:** Create the stylesheet file inside the static folder.

## About this module

In this lab, we will learn how to add CSS to our Flask application to make it visually appealing. We will use static files, specifically a CSS file, to style our application. Static files are files that don't change, such as CSS files, JavaScript files, and images.

Work in `workspace/flaskr-app/`. `./lab check 38` grades this step.

## Instructions

First, we need to create a CSS file that will hold our styles. In Flask, static files are stored in a directory named static. Let's create a CSS file named style.css in the flaskr/static directory.

```bash
# Navigate to the static directory
cd flaskr/static

# Create style.css file
touch style.css
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 38)
├── flaskr/static/style.css   (this step)
├── flaskr/   (earlier step)
├── flaskr/__init__.py   (earlier step)
├── flaskr/db.py   (earlier step)
├── flaskr/schema.sql   (earlier step)
├── instance/flaskr.sqlite   (earlier step)
├── flaskr/auth.py   (earlier step)
├── flaskr/templates/auth/register.html   (earlier step)
├── flaskr/templates/auth/login.html   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/static/style.css`

## Verify

```bash
./lab check 38
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `file` on `flaskr-app/flaskr/static/style.css` — file flaskr-app/flaskr/static/style.css

Stuck? `./lab solve --step 38` lays down the finished code up to this step, `./lab reset --module 8` puts the module back to its starter state.
