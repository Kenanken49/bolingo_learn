"""Responsive Web Design: pages that adapt to any screen size."""

from __future__ import annotations

COURSE: dict = {
    "slug": "responsive-design",
    "title": "Responsive Web Design",
    "description": "Make pages that adapt to any screen size.",
    "source": "Bolingo original",
    "source_url": None,
    "lessons": [
        {
            "slug": "viewport-meta",
            "title": "The viewport meta tag",
            "body": """Phones render a page at a wide default width unless you tell them otherwise, then shrink the result to fit. The viewport tag fixes that.

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

`width=device-width` makes the page as wide as the device screen, so one CSS pixel matches one device-independent pixel. `initial-scale=1` sets the zoom level when the page first loads.

Put the tag inside `<head>`. Without it, media queries and fluid widths will not behave as expected on mobile, and text will look tiny.""",
        },
        {
            "slug": "fluid-layouts",
            "title": "Fluid layouts with flexbox",
            "body": """Flexbox arranges items in a row or column and lets them wrap onto new lines.

```css
.gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.gallery > img {
  flex: 1 1 200px;
  max-width: 100%;
}
```

Each image grows to fill spare space but never shrinks below 200px, then wraps to a new line when the row is full. `max-width: 100%` stops an image from overflowing a narrow container.

Prefer fluid widths such as percentages, `max-width` and `flex` over fixed pixel widths. A fixed width works on one screen size only.""",
        },
        {
            "slug": "media-queries",
            "title": "Media queries",
            "body": """A media query applies CSS only when a condition is true, such as a screen being at least a certain width.

```css
.sidebar { display: none; }

@media (min-width: 768px) {
  .sidebar { display: block; }
}
```

Start with the mobile styles, then add rules for larger screens inside `min-width` queries. This mobile-first approach keeps the base CSS simple, and it gives small screens a smaller set of rules to load and override.

Choose breakpoints where your content breaks, not where a particular device happens to be. Test by resizing the browser window slowly and watching the layout.""",
        },
        {
            "slug": "responsive-images",
            "title": "Responsive images",
            "body": """A large photo wastes data on a phone. The `srcset` and `sizes` attributes let the browser pick the best file for the screen.

```html
<img
  src="market-800.jpg"
  srcset="market-400.jpg 400w, market-800.jpg 800w, market-1600.jpg 1600w"
  sizes="(min-width: 768px) 50vw, 100vw"
  alt="A busy fruit market at dawn"
  width="800"
  height="600"
>
```

`srcset` lists the available files and their widths. `sizes` tells the browser how wide the image will be on the page, so it can compare that with the screen's pixel density. In this example the image fills the full width on small screens and half the width on wider screens.

Always include `alt` text that describes the image's content, and set `width` and `height` so the page does not jump while the image loads. Keep the image's natural proportions with `img { max-width: 100%; height: auto; }` in your CSS.""",
        },
    ],
}
