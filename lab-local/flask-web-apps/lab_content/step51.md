# Step 51 · Environment-based Configuration

**Module 10 of 17 — Configuration Management**

**Goal:** Select dev or production configuration from an environment variable.

## Instructions

Create another file called config_prod.py with the following code:

In the app.py file, replace the previous configuration code with the following:

```python
DEBUG = True
SECRET_KEY = 'devsecretkey'
```

```python
DEBUG = False
SECRET_KEY = 'prodsecretkey'
```

```python
import os

if os.environ.get('FLASK_ENV') == 'production':
    app.config.from_object('config_prod')
else:
    app.config.from_object('config_dev')
```

## Expected filesystem state afterwards

```
workspace/config-lab/          (as it should look after step 51)
├── config.py   (this step)
├── config_prod.py   (this step)
├── app.py   (this step)
```

## Files this step touches

- `workspace/config-lab/config.py`
- `workspace/config-lab/config_prod.py`
- `workspace/config-lab/app.py`

This step replaces configuration written by an earlier step: `solutions/_states/m10-step-51/` holds that exact tree, and `./lab solve --step 51` applies it.

## Verify

```bash
./lab check 51
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `file` on `config-lab/config_prod.py` — file config-lab/config_prod.py — at least 2 bytes
- `app` on `app:app` — application factory app:app — config {"SECRET_KEY":"devsecretkey"}
- `app` on `app:app` — application factory app:app — config {"SECRET_KEY":"prodsecretkey"}

Stuck? `./lab solve --step 51` lays down the finished code up to this step, `./lab reset --module 10` puts the module back to its starter state.
