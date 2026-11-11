# Step 39 · Add CSS rules

**Module 8 of 17 — Styling the Application with Static Files**

**Goal:** Fill the stylesheet with the layout rules for the application.

## Instructions

Next, copy the following CSS rules into the style.css file. These rules will style various HTML elements in our application.

```css
/* flaskr/static/style.css */

html {
  font-family: sans-serif;
  background: #eee;
  padding: 1rem;
}
body {
  max-width: 960px;
  margin: 0 auto;
  background: white;
}
/* More CSS rules... */
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 39)
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
./lab check 39
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `css` on `flaskr-app/flaskr/static/style.css` — CSS rules in flaskr-app/flaskr/static/style.css — 4+ real rules, selectors html, body, nav

Stuck? `./lab solve --step 39` lays down the finished code up to this step, `./lab reset --module 8` puts the module back to its starter state.
