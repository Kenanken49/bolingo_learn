# Step 64 · Improving the Shell Experience

**Module 12 of 17 — Working with the Shell and Request Context**

**Goal:** Expose helper functions to the shell with a shell context processor.

## Instructions

Improving the Shell Experience

To improve the shell experience, create a module (shelltools.py) with helper methods that can be imported into the interactive session. This module can contain additional helper methods for tasks such as initializing the database or dropping tables.

In the interactive shell, import the desired methods from the shelltools module.

```python
# File: shelltools.py

def initialize_database():
    # Code to initialize the database
    pass

def drop_tables():
    # Code to drop tables
    pass
```

```python
# File: shell.py
# Execution: python shell.py

from shelltools import initialize_database, drop_tables

# Import desired methods from shelltools module
from shelltools import *

# Use imported methods
initialize_database()
drop_tables()
```

## Expected filesystem state afterwards

```
workspace/shell-lab/          (as it should look after step 64)
├── shelltools.py   (this step)
├── shell.py   (this step)
```

## Files this step touches

- `workspace/shell-lab/shelltools.py`
- `workspace/shell-lab/shell.py`

## Verify

```bash
./lab check 64
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `ast` on `shell-lab/shelltools.py` — Python AST of shell-lab/shelltools.py — defines initialize_database, drop_tables
- `ast` on `shell-lab/shell.py` — Python AST of shell-lab/shell.py — imports shelltools:initialize_database, shelltools:drop_tables, calls app.shell_context_processor
- `cli` on `python shell.py` — command python, shell.py — must contain "OK"

Stuck? `./lab solve --step 64` lays down the finished code up to this step, `./lab reset --module 12` puts the module back to its starter state.
