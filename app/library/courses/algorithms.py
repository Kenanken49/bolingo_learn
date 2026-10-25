"""JavaScript Algorithms: practise problem solving with arrays, strings and loops."""

from __future__ import annotations

COURSE: dict = {
    "slug": "javascript-algorithms",
    "title": "JavaScript Algorithms",
    "description": "Practise problem solving with arrays, strings and loops.",
    "source": "Bolingo original",
    "source_url": None,
    "lessons": [
        {
            "slug": "sum-of-array",
            "title": "Sum an array",
            "body": """Loop through the values and keep a running total. This pattern, often called an accumulator, appears in many larger problems.

```js
function sumArray(numbers) {
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total;
}

console.log(sumArray([1, 2, 3])); // 6
console.log(sumArray([]));        // 0
```

Starting the total at `0` makes the empty array return `0` without a special case. Think about edge cases like this before you write the loop: an empty input, a single value and negative numbers.""",
        },
        {
            "slug": "reverse-a-string",
            "title": "Reverse a string",
            "body": """Strings can be split into characters, reversed, and joined back together.

```js
function reverseString(text) {
  return text.split("").reverse().join("");
}

console.log(reverseString("bolingo")); // "ognilob"
```

`split("")` breaks the string into an array of single characters, `reverse()` flips that array in place, and `join("")` glues the characters back together with nothing between them.

Be careful with emoji and some accented characters. They can be made of several code units, so `split("")` may break them apart. Use `Array.from(text)` when you need to split by visible characters.""",
        },
        {
            "slug": "find-the-largest",
            "title": "Find the largest number",
            "body": """Start with the first value as the current best, then compare each remaining value to it.

```js
function largest(numbers) {
  let best = numbers[0];
  for (const n of numbers) {
    if (n > best) best = n;
  }
  return best;
}

console.log(largest([4, 9, 2])); // 9
```

The loop also compares the first value with itself, which does no harm. An empty array gives `undefined`, so decide what the function should return for an empty input and handle that case explicitly if your use needs it.""",
        },
        {
            "slug": "count-occurrences",
            "title": "Count occurrences",
            "body": """To count how often each value appears, keep a running count for every value in an object.

```js
function countOccurrences(items) {
  const counts = {};
  for (const item of items) {
    counts[item] = (counts[item] ?? 0) + 1;
  }
  return counts;
}

console.log(countOccurrences(["mango", "papaya", "mango"]));
// { mango: 2, papaya: 1 }
```

The `??` operator gives `0` the first time a value is seen, so you do not need a separate check. The same idea works for characters in a string: pass `text.split("")` as the input.

A `Map` is a good alternative when the keys are not simple strings, because it keeps keys of any type and preserves their insertion order.""",
        },
    ],
}
