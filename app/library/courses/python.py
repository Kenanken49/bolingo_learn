"""Python Basics: write simple Python programs with variables, lists and functions."""

from __future__ import annotations

COURSE: dict = {
    "slug": "python-basics",
    "title": "Python Basics",
    "description": "Write simple Python programs with variables, lists and functions.",
    "source": "Bolingo original",
    "source_url": None,
    "lessons": [
        {
            "slug": "hello-python",
            "title": "Hello, Python",
            "body": """Python reads top to bottom, one statement at a time. `print` shows output.

```python
name = "Ada"
print(f"Hello, {name}!")
```

The `f` before the string makes it an f-string, so you can put variables inside braces. Python does not need semicolons at the end of lines, and indentation is part of the syntax: blocks of code are marked by their indentation, not by braces.

Run a file from the terminal with `python hello.py`. Use `#` to start a comment that Python ignores.""",
        },
        {
            "slug": "lists-and-loops",
            "title": "Lists and loops",
            "body": """A list holds several values in order. A `for` loop visits each one.

```python
fruits = ["mango", "papaya", "banana"]
for fruit in fruits:
    print(fruit.upper())
```

Lists are zero-indexed, so `fruits[0]` is `"mango"`. Use `len(fruits)` to find how many items the list holds, and `fruits.append("guava")` to add one to the end.

When you need the position as well as the value, use `enumerate`: `for i, fruit in enumerate(fruits):` gives both on each pass.""",
        },
        {
            "slug": "functions-in-python",
            "title": "Functions in Python",
            "body": """Use `def` to name a block of code. `return` sends a value back.

```python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(greet("Amina"))
print(greet("Amina", greeting="Karibu"))
```

Parameters with a default value, such as `greeting`, can be left out when calling the function. Passing them by name, as in the second call, makes the code easier to read.

A function with no `return` gives back `None`. Keep each function focused on one task so it is easy to reuse and test.""",
        },
        {
            "slug": "conditionals",
            "title": "Making decisions with if",
            "body": """An `if` statement runs a block of code only when a condition is true. Add `elif` and `else` for the other cases.

```python
def describe_streak(days):
    if days == 0:
        return "Start a new streak today"
    elif days < 7:
        return f"{days} days in a row, keep going"
    else:
        return f"{days} days in a row, excellent"

print(describe_streak(3))
```

Conditions use comparison operators such as `==`, `!=`, `<` and `>=`. Combine them with `and`, `or` and `not`.

Python treats empty values such as `""`, `0` and `[]` as false, so `if items:` is a common way to check that a list has something in it.""",
        },
    ],
}
