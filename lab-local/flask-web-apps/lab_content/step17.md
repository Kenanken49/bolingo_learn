# Step 17 · Running the Development Server from Python

**Module 3 of 17 — Working with the Development Server**

**Goal:** Start the server from Python code with the __main__ guard and app.run(debug=True).

## Instructions

Running the Development Server from Python

In addition to using the Flask CLI command, you can also start the development server from Python code. Add the following code at the end of your app.py file:

Now, you can run the development server by executing the app.py file with Python:

This will start the development server and you can access your Flask application in the same way as before.

```python
if __name__ == "__main__":
    app.run(debug=True)
```

```bash
python app.py
```

## Expected filesystem state afterwards

```
workspace/devserver-lab/          (as it should look after step 17)
├── app.py   (this step)
├── myapp.py   (earlier step)
```

## Files this step touches

- `workspace/devserver-lab/app.py`

## Verify

```bash
./lab check 17
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `devserver-lab/app.py` — Python AST of devserver-lab/app.py — calls app.run

Stuck? `./lab solve --step 17` lays down the finished code up to this step, `./lab reset --module 3` puts the module back to its starter state.
