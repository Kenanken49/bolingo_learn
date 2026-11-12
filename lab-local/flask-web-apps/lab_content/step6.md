# Step 6 · Adding Dynamic Content

**Module 1 of 17 — Getting Started with the Flask Web Framework**

**Goal:** Accept a name in the URL and pass it to the template as dynamic context.

## Instructions

Flask allows us to pass dynamic content to our templates. Let's modify our route to pass a name parameter and display a personalized greeting.

• Modify your app.py file to accept a name parameter in the route:

• Open the index.html file and modify the <h1> tag to display the personalized greeting:

```python
@app.route("/<name>")
   def hello(name):
       return render_template("index.html", name=name)
```

```html
<h1>Hello, {{ name }}!</h1>
```

## Expected filesystem state afterwards

```
workspace/quickstart/          (as it should look after step 6)
├── app.py   (this step)
├── templates/index.html   (this step)
```

## Files this step touches

- `workspace/quickstart/app.py`
- `workspace/quickstart/templates/index.html`

## Verify

```bash
./lab check 6
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `quickstart/app.py` — Python AST of quickstart/app.py — defines hello, routes /<name>
- `http` on `quickstart` — GET http://localhost:8080/Amina — must contain "Hello, Amina!", HTTP 200

Stuck? `./lab solve --step 6` lays down the finished code up to this step, `./lab reset --module 1` puts the module back to its starter state.
