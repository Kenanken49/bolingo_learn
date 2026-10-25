"""HTML & CSS Basics: build and style a web page from the ground up."""

from __future__ import annotations

COURSE: dict = {
    "slug": "html-css-basics",
    "title": "HTML & CSS Basics",
    "description": "Build and style a web page from the ground up.",
    "source": "Bolingo original",
    "source_url": None,
    "lessons": [
        {
            "slug": "first-html-page",
            "title": "Your first HTML page",
            "body": (
                "Every web page is written in HTML, which describes the structure of its content. "
                "HTML is made of **elements**. Most elements have an opening tag, the content they wrap, "
                "and a closing tag that starts with a slash.\n\n"
                "```html\n<p>This is a paragraph.</p>\n```\n\n"
                "A complete page follows a standard outline. `<!DOCTYPE html>` tells the browser which "
                "version of HTML to expect, and `<html>` wraps everything else.\n\n"
                "```html\n<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n"
                "    <meta charset=\"utf-8\">\n    <title>My first page</title>\n  </head>\n"
                "  <body>\n    <h1>Hello, web</h1>\n    <p>This is my first page.</p>\n"
                "  </body>\n</html>\n```\n\n"
                "The `<head>` holds information about the page that visitors do not see directly, such as "
                "its title and character encoding. The `<body>` holds everything a visitor sees. "
                "The `lang` attribute tells screen readers and translation tools which language the page uses.\n\n"
                "Save the file with an `.html` extension and open it in a browser. Edit it in any text editor "
                "and refresh the browser to see each change."
            ),
        },
        {
            "slug": "semantic-elements",
            "title": "Semantic elements",
            "body": (
                "Semantic elements name the role of their content: `<header>`, `<nav>`, `<main>`, "
                "`<article>`, `<section>`, `<aside>` and `<footer>`. A `<div>` has no meaning of its own, "
                "so use it only when no semantic element fits.\n\n"
                "```html\n<header>\n  <h1>Bolingo Kitchen</h1>\n  <nav>\n"
                "    <a href=\"/recipes\">Recipes</a>\n    <a href=\"/about\">About</a>\n  </nav>\n</header>\n\n"
                "<main>\n  <article>\n    <h2>Jollof rice</h2>\n    <p>Start with a rich tomato base.</p>\n"
                "  </article>\n</main>\n\n<footer>\n  <p>Cooked with care.</p>\n</footer>\n```\n\n"
                "Screen readers let users jump straight to the navigation or the main content, and search "
                "engines use the structure to understand the page. Prefer `<nav>` over `<div class=\"nav\">`.\n\n"
                "Use `<section>` for a themed group of content that has its own heading. Use `<article>` for "
                "content that could stand alone, such as a post or a recipe. Use `<aside>` for material "
                "related to the main content, such as a sidebar of tips."
            ),
        },
        {
            "slug": "selectors-and-properties",
            "title": "CSS selectors and properties",
            "body": (
                "A CSS rule has a **selector** and a block of **declarations**. The selector chooses which "
                "elements to style. Each declaration is a property name, a colon, and a value.\n\n"
                "```css\nh1 {\n  color: #1d4ed8;\n  font-size: 2rem;\n}\n\n"
                ".note {\n  background: #fef9c3;\n  padding: 1rem;\n}\n\n"
                "#footer {\n  text-align: center;\n}\n```\n\n"
                "`h1` selects every heading. `.note` selects elements with `class=\"note\"`, and `#footer` "
                "selects the single element with `id=\"footer\"`. Classes are the usual choice for styling, "
                "because one class can be reused on many elements. Ids must be unique on a page.\n\n"
                "Selectors can combine. `.menu a` selects every link inside an element with the class `menu`, "
                "and `ul > li` selects only list items directly inside a list. When two rules conflict, the more "
                "specific selector wins. Inline styles win over both, but they are hard to maintain, so use them sparingly.\n\n"
                "Units matter too. `rem` scales with the root font size, which makes text easier to read "
                "when a user changes their settings. `px` is a fixed size."
            ),
        },
        {
            "slug": "box-model",
            "title": "The box model",
            "body": (
                "Every element is a box made of four layers: the content, then the padding, the border, "
                "and the margin outside it.\n\n"
                "```css\n.card {\n  width: 280px;\n  padding: 16px;\n  border: 1px solid #d4d4d8;\n  margin: 12px;\n}\n```\n\n"
                "Padding is the space between the content and the border. The border is the line around it. "
                "The margin is the space between this box and its neighbours. Margins can collapse, so two "
                "vertical margins that touch may combine into one.\n\n"
                "By default, `width` sets only the content area, so padding and border make the element wider "
                "than you asked for. Set `box-sizing: border-box` to make `width` include them:\n\n"
                "```css\n*, *::before, *::after {\n  box-sizing: border-box;\n}\n```\n\n"
                "Most projects apply this rule once at the top of their stylesheet, because it makes layouts "
                "much easier to predict."
            ),
        },
    ],
}
