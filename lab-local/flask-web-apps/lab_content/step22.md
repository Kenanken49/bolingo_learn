# Step 22 · Register Commands with the Flask Application

**Module 4 of 17 — The Flask Command Line Interface**

**Goal:** Expose the custom command through the Flask CLI.

## Instructions

Register Commands with the Flask Application

To make your custom commands available through the Flask CLI, you need to register them with your Flask application. Open the app.py file and modify it as follows:

Save the file and restart the Flask development server using the flask run command. Now you can execute your custom command greet from the command line:

```python
from flask import Flask
from commands import greet

app = Flask(__name__)
app.cli.add_command(greet)

@app.route('/')
def hello():
    return 'Hello, Flask!'

if __name__ == '__main__':
    app.run()
```

```text
flask greet John
```

## Expected filesystem state afterwards

```
workspace/cli-lab/          (as it should look after step 22)
├── app.py   (this step)
├── commands.py   (earlier step)
```

## Files this step touches

- `workspace/cli-lab/app.py`

## Verify

```bash
./lab check 22
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `cli-lab/app.py` — Python AST of cli-lab/app.py — imports commands:greet, calls app.cli.add_command
- `cli` on `flask --app app greet Wanjiru` — command flask, --app, app, greet, Wanjiru — must contain "Hello, Wanjiru!"

Stuck? `./lab solve --step 22` lays down the finished code up to this step, `./lab reset --module 4` puts the module back to its starter state.
