"""JavaScript Essentials: variables, functions, data and the DOM."""

from __future__ import annotations

COURSE: dict = {
    "slug": "javascript-essentials",
    "title": "JavaScript Essentials",
    "description": "Variables, functions, and changing a page from the browser.",
    "source": "Bolingo original",
    "source_url": None,
    "lessons": [
        {
            "slug": "variables-and-types",
            "title": "Variables and types",
            "body": """Use `const` for values that never change and `let` for values that do. Avoid `var` in new code, because its scoping rules cause surprising bugs.

```js
const name = "Ada";
let score = 0;
score += 10;
const isReady = true;
```

`const` does not make an object immutable. It only stops the variable from being reassigned, so you can still change the properties of an object declared with `const`.

The common types are:

- **String**: text, such as `"Bolingo"`.
- **Number**: whole and decimal values, such as `42` or `3.5`.
- **Boolean**: `true` or `false`.
- **Array**: an ordered list, such as `[1, 2, 3]`.
- **Object**: named properties, such as `{ name: "Ada" }`.

Use `typeof` to check a value's type at runtime, for example `typeof score` gives `"number"`.""",
        },
        {
            "slug": "functions",
            "title": "Functions",
            "body": """A function groups steps under a name, takes inputs as parameters, and gives a result back with `return`.

```js
function add(a, b) {
  return a + b;
}

const double = (n) => n * 2;

console.log(add(2, 3), double(4)); // 5 8
```

The second form is an arrow function. It is short and common for callbacks. Both forms work the same way for simple cases.

A function that has no `return` gives back `undefined`. Keep each function focused on one job, and give it a name that says what that job is. Small functions are easier to test and reuse.""",
        },
        {
            "slug": "arrays-and-objects",
            "title": "Arrays and objects",
            "body": """Arrays hold ordered values. Objects hold named properties. Most real data uses both together.

```js
const learners = [
  { name: "Ada", streak: 4 },
  { name: "Kofi", streak: 0 },
];

console.log(learners.length);      // 2
console.log(learners[0].name);     // "Ada"

learners.push({ name: "Amina", streak: 7 });

const active = learners.filter((learner) => learner.streak > 0);
console.log(active.map((learner) => learner.name)); // ["Ada", "Amina"]
```

Array indexes start at `0`. `push` adds to the end, and `filter` and `map` return new arrays without changing the original.

Read a property with a dot (`learner.name`) or with brackets when the name is in a variable (`learner[key]`). Destructuring pulls values out directly: `const { name } = learners[0];`.""",
        },
        {
            "slug": "dom-events",
            "title": "Reading events from the DOM",
            "body": """The DOM is the browser's model of the page. You can select an element, then react to events on it.

```js
const button = document.querySelector("#save");
button.addEventListener("click", () => {
  button.textContent = "Saved";
});
```

`querySelector` takes any CSS selector and returns the first matching element, or `null` if nothing matches. Check for `null` before using the result when the element might be missing.

Events such as `click`, `input` and `submit` pass an event object to the listener. Its `target` property is the element that fired the event, and `event.preventDefault()` stops the browser's default action, such as a form submitting and reloading the page.""",
        },
    ],
}
