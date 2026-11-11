# Step 19 · Create a Flask Application

**Module 4 of 17 — The Flask Command Line Interface**

**Goal:** Write the cli-lab application that the CLI will discover.

## Instructions

Create a new Python file named app.py and add the following code to create a basic Flask application:

```python
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello, Flask!'

if __name__ == '__main__':
    app.run()
```

```text
python app.py
```

## Expected filesystem state afterwards

```
workspace/cli-lab/          (as it should look after step 19)
├── app.py   (this step)
```

## Files this step touches

- `workspace/cli-lab/app.py`

## Verify

```bash
./lab check 19
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `cli-lab/app.py` — Python AST of cli-lab/app.py — defines hello, routes /

Stuck? `./lab solve --step 19` lays down the finished code up to this step, `./lab reset --module 4` puts the module back to its starter state.
