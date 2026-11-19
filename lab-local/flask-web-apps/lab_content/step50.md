# Step 50 · Configuration from Files

**Module 10 of 17 — Configuration Management**

**Goal:** Move configuration into a module loaded with from_object().

## Instructions

Hardcoding the configuration values in the code is not ideal, especially for sensitive information. Flask provides a way to load configuration from separate files. Create a new file called config.py and add the following code:

In the app.py file, replace the previous configuration code with the following:

The from_object method loads the configuration from the config module. Now, the DEBUG and SECRET_KEY values will be loaded from the config.py file.

Restart the Flask application and visit http://localhost:5000 to see the updated message with the new configuration values.

```python
DEBUG = False
SECRET_KEY = 'myothersecretkey'
```

```python
app.config.from_object('config')
```

## Expected filesystem state afterwards

```
workspace/config-lab/          (as it should look after step 50)
├── config.py   (this step)
├── app.py   (this step)
```

## Files this step touches

- `workspace/config-lab/config.py`
- `workspace/config-lab/app.py`

This step replaces configuration written by an earlier step: `solutions/_states/m10-step-50/` holds that exact tree, and `./lab solve --step 50` applies it.

## Verify

```bash
./lab check 50
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `file` on `config-lab/config.py` — file config-lab/config.py — at least 2 bytes
- `app` on `app:app` — application factory app:app — config {"SECRET_KEY":"myothersecretkey","DEBUG":false}

Stuck? `./lab solve --step 50` lays down the finished code up to this step, `./lab reset --module 10` puts the module back to its starter state.
