# Step 29 · Initializing the Database

**Module 6 of 17 — SQLite Database Setup**

**Goal:** Write init_db() and the init-db CLI command that loads schema.sql.

## Instructions

Next, we will add Python functions that will run the SQL commands to create the tables. Add the following functions to the db.py file:

```python
# flaskr/db.py

def init_db():
    db = get_db()

    with current_app.open_resource('schema.sql') as f:
        db.executescript(f.read().decode('utf8'))

@click.command('init-db')
def init_db_command():
    """Clear the existing data and create new tables."""
    init_db()
    click.echo('Initialized the database.')
```

## Expected filesystem state afterwards

```
workspace/flaskr-app/          (as it should look after step 29)
├── flaskr/db.py   (this step)
├── flaskr/   (earlier step)
├── flaskr/__init__.py   (earlier step)
├── flaskr/schema.sql   (earlier step)
```

## Files this step touches

- `workspace/flaskr-app/flaskr/db.py`

## Verify

```bash
./lab check 29
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `flaskr-app/flaskr/db.py` — Python AST of flaskr-app/flaskr/db.py — defines init_db, init_db_command, calls db.executescript

Stuck? `./lab solve --step 29` lays down the finished code up to this step, `./lab reset --module 6` puts the module back to its starter state.
