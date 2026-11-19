# Step 49 · Basic Configuration

**Module 10 of 17 — Configuration Management**

**Goal:** Set DEBUG and SECRET_KEY directly on app.config.

## Instructions

Now let's add some basic configuration to our Flask application. In the same app.py file, add the following code:

The DEBUG configuration enables debug mode, which provides helpful error messages during development. The SECRET_KEY configuration is used for securely signing session cookies and other security-related needs.

To access the configuration values, you can use the app.config dictionary. For example, to print the value of the SECRET_KEY, add the following code to the hello route:

Restart the Flask application and visit http://localhost:5000 to see the updated message with the secret key.

```python
app.config['DEBUG'] = True
app.config['SECRET_KEY'] = 'mysecretkey'
```

```python
@app.route('/')
def hello():
    secret_key = app.config['SECRET_KEY']
    return f'Hello, Flask! Secret Key: {secret_key}'
```

## Expected filesystem state afterwards

```
workspace/config-lab/          (as it should look after step 49)
├── app.py   (this step)
```

## Files this step touches

- `workspace/config-lab/app.py`

This step replaces configuration written by an earlier step: `solutions/_states/m10-step-49/` holds that exact tree, and `./lab solve --step 49` applies it.

## Verify

```bash
./lab check 49
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `app` on `app:app` — application factory app:app — config {"SECRET_KEY":"mysecretkey","DEBUG":true}

Stuck? `./lab solve --step 49` lays down the finished code up to this step, `./lab reset --module 10` puts the module back to its starter state.
