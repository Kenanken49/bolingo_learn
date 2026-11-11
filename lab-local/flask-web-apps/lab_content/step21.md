# Step 21 · Create a Custom Command

**Module 4 of 17 — The Flask Command Line Interface**

**Goal:** Build a standalone click command that prints a greeting.

## Instructions

The Flask CLI allows you to create custom commands that can be executed from the command line. Let's create a custom command named greet that takes a name as an argument and prints a greeting message.

Create a new Python file named commands.py and add the following code:

Save the file and execute it using the following command:

```python
import click

@click.command()
@click.argument('name')
def greet(name):
    click.echo(f'Hello, {name}!')

if __name__ == '__main__':
    greet()
```

```text
python commands.py John
```

## Expected filesystem state afterwards

```
workspace/cli-lab/          (as it should look after step 21)
├── commands.py   (this step)
├── app.py   (earlier step)
```

## Files this step touches

- `workspace/cli-lab/commands.py`

## Verify

```bash
./lab check 21
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `cli-lab/commands.py` — Python AST of cli-lab/commands.py — imports click:, defines greet
- `cli` on `python commands.py John` — command python, commands.py, John — must contain "Hello, John!"

Stuck? `./lab solve --step 21` lays down the finished code up to this step, `./lab reset --module 4` puts the module back to its starter state.
