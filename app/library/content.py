"""Original library courses, stored in the database by `import_library`.

All lesson text here is written for Bolingo. Topics are inspired by common
web-development curricula; no text is copied from W3Schools or freeCodeCamp.
Lesson bodies are Markdown. Each course lives in its own module under
`courses/`.
"""

from __future__ import annotations

from .courses.algorithms import COURSE as ALGORITHMS
from .courses.html_css import COURSE as HTML_CSS
from .courses.javascript import COURSE as JAVASCRIPT
from .courses.python import COURSE as PYTHON
from .courses.responsive import COURSE as RESPONSIVE

COURSES: list[dict] = [HTML_CSS, JAVASCRIPT, RESPONSIVE, ALGORITHMS, PYTHON]
