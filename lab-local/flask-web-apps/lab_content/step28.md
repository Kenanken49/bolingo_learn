# Step 28 · Creating Tables

**Module 6 of 17 — SQLite Database Setup**

**Goal:** Define the user and post tables in schema.sql.

## Instructions

In SQLite, data is stored in tables and columns. We need to create these before we can store and retrieve data. Our application will store users in the user table, and posts in the post table.

Create a new SQL file schema.sql and add the following code:

```sql
# flaskr/schema.sql

DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS post;

CREATE TABLE user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

CREATE TABLE post (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL,
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  FOREIGN KEY (author_id) REFERENCES user (id)
);
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 28)
├── flaskr/schema.sql   (this step)
├── flaskr/   (earlier step)
├── flaskr/__init__.py   (earlier step)
├── flaskr/db.py   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/schema.sql`

## Verify

```bash
./lab check 28
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `sql` on `flaskr-app/flaskr/schema.sql` — schema flaskr-app/flaskr/schema.sql executed against real SQLite — tables user, post, columns user(id, username, password) post(id, author_id, created, title, body)

Stuck? `./lab solve --step 28` lays down the finished code up to this step, `./lab reset --module 6` puts the module back to its starter state.
