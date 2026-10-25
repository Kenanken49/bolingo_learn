PYTHON_BLOCK = '''    ),
)

PYTHON = Track(
    slug="python",
    name="Python",
    description="From a first script to a production data platform.",
    levels=(
        Level(
            number=1,
            lessons=(
                Lesson(
                    title="Python Basics & Environment",
                    kind="reading",
                    instruction=(
                        "Read: Python tooling and a first program. "
                        "Run the setup script and commit the "
                        "requirements."
                    ),
                    difficulty=1,
                ),
                Lesson(
                    title="Control Flow & Functions",
                    kind="practice",
                    instruction=(
                        "Write: conditionals, loops, and pure "
                        "functions. Validate with the practice "
                        "endpoint."
                    ),
                    difficulty=2,
                ),
                Lesson(
                    title="Data Structures",
                    kind="practice",
                    instruction=(
                        "Build: lists, dicts, sets, and tuples used "
                        "to model a small dataset."
                    ),
                    difficulty=2,
                ),
                Lesson(
                    title="Reading & Writing Files",
                    kind="practice",
                    instruction=(
                        "Practice: read a CSV, transform the rows, "
                        "and write the output file."
                    ),
                    difficulty=2,
                ),
                Lesson(
                    title="First Script & Testing",
                    kind="practice",
                    instruction=(
                        "Build: a reusable script with a discovered "
                        "unit test and a requirements file."
                    ),
                    difficulty=3,
                ),
                Lesson(
                    title="Code Review & Git",
                    kind="project",
                    instruction=(
                        "Review: a pull request with a written "
                        "commentary and merge it."
                    ),
                    difficulty=3,
                ),
                Lesson(
                    title="Hands-On Project",
                    kind="project",
                    instruction=(
                        "Build and deploy: a complete solution with "
                        "a README, tests, and a running demo."
                    ),
                    difficulty=5,
                ),
            ),
        ),
        Level(
            number=2,
            lessons=(
                Lesson(
                    title="Functions & Modules",
                    kind="practice",
                    instruction=(
                        "Code: importable functions and a small "
                        "package structure."
                    ),
                    difficulty=2,
                ),
                Lesson(
                    title="Data Structures & Iterators",
                    kind="practice",
                    instruction=(
                        "Practice: iterators and generators over a "
                        "dataset."
                    ),
                    difficulty=3,
                ),
                Lesson(
                    title="Exceptions & Debugging",
                    kind="practice",
                    instruction=(
                        "Practice: raise and handle structured "
                        "errors, and trace a failure with a "
                        "debugger."
                    ),
                    difficulty=3,
                ),
                Lesson(
                    title="Testing & CI",
                    kind="project",
                    instruction=(
                        "Build: a test suite and CI pipeline for a "
                        "small library."
                    ),
                    difficulty=3,
                ),
                Lesson(
                    title="Reading & Writing Files",
                    kind="practice",
                    instruction=(
                        "Practice: parse logs, summarize the "
                        "metrics, and write the report."
                    ),
                    difficulty=3,
                ),
                Lesson(
                    title="Project & Deployment",
                    kind="project",
                    instruction=(
                        "Deploy a complete application with CI and "
                        "a live demo URL."
                    ),
                    difficulty=5,
                ),
            ),
        ),
        Level(
            number=3,
            lessons=(
                Lesson(
                    title="Object-Oriented Python",
                    kind="reading",
                    instruction=(
                        "Read: classes, inheritance, and "
                        "encapsulation best practices."
                    ),
                    difficulty=3,
                ),
                Lesson(
                    title="OOP & Composition",
                    kind="practice",
                    instruction=(
                        "Build: an object model and a CLI with a "
                        "small test suite."
                    ),
                    difficulty=3,
                ),
                Lesson(
                    title="Error Handling & Logging",
                    kind="practice",
                    instruction=(
                        "Implement: structured logging, custom "
                        "exception hierarchy, and a failure "
                        "report."
                    ),
                    difficulty=3,
                ),
                Lesson(
                    title="Testing & Coverage",
                    kind="practice",
                    instruction=(
                        "Write: unit tests with coverage and CI, "
                        "reaching the required threshold."
                    ),
                    difficulty=3,
                ),
                Lesson(
                    title="Project",
                    kind="project",
                    instruction=(
                        "Build: a reusable library with docs and a "
                        "demo."
                    ),
                    difficulty=4,
                ),
                Lesson(
                    title="Portfolio & Review",
                    kind="project",
                    instruction=(
                        "Ship: a polished package with tests, "
                        "docs, and a code review."
                    ),
                    difficulty=5,
                ),
            ),
        ),
        Level(
            number=4,
            lessons=(
                Lesson(
                    title="Typing & Protocols",
                    kind="reading",
                    instruction=(
                        "Read: type hints, generics, and protocols. "
                        "Upgrade the toolchain."
                    ),
                    difficulty=4,
                ),
                Lesson(
                    title="Modules & Packaging",
                    kind="practice",
                    instruction=(
                        "Build: a package with a pyproject.toml, "
                        "tests, and a CI pipeline."
                    ),
                    difficulty=4,
                ),
                Lesson(
                    title="API & Database",
                    kind="practice",
                    instruction=(
                        "Practice: call a REST API and store "
                        "results in SQLite with a clean schema."
                    ),
                    difficulty=4,
                ),
                Lesson(
                    title="Error Handling & Logging",
                    kind="practice",
                    instruction=(
                        "Implement: comprehensive logging and error "
                        "tracking for a CLI tool."
                    ),
                    difficulty=4,
                ),
                Lesson(
                    title="Testing & CI",
                    kind="project",
                    instruction=(
                        "Build: a tested, CI-pipeline, code-linted "
                        "solution."
                    ),
                    difficulty=4,
                ),
                Lesson(
                    title="Project & Review",
                    kind="project",
                    instruction=(
                        "Deliver: a working tool with tests, docs, "
                        "and professional review."
                    ),
                    difficulty=5,
                ),
            ),
        ),
        Level(
            number=5,
            lessons=(
                Lesson(
                    title="Async Programming",
                    kind="reading",
                    instruction=(
                        "Read: async/await, event loops, and "
                        "concurrency best practices."
                    ),
                    difficulty=4,
                ),
                Lesson(
                    title="APIs & Web Frameworks",
                    kind="practice",
                    instruction=(
                        "Practice: build a small FastAPI service "
                        "with routing, validation, and tests."
                    ),
                    difficulty=4,
                ),
                Lesson(
                    title="Testing & CI",
                    kind="practice",
                    instruction=(
                        "Write: a test suite with a CI pipeline, "
                        "test coverage, and error handling."
                    ),
                    difficulty=4,
                ),
                Lesson(
                    title="Database & ORM",
                    kind="project",
                    instruction=(
                        "Build: a data pipeline that queries a "
                        "database and exposes the results via an API."
                    ),
                    difficulty=4,
                ),
                Lesson(
                    title="ML & Deployment",
                    kind="project",
                    instruction=(
                        "Ship: a trained model API with a CI "
                        "pipeline and a live demo."
                    ),
                    difficulty=5,
                ),
                Lesson(
                    title="Production Readiness",
                    kind="project",
                    instruction=(
                        "Produce: a production-grade Python "
                        "service with monitoring and docs."
                    ),
                    difficulty=5,
                ),
            ),
        ),
        Level(
            number=6,
            lessons=(
                Lesson(
                    title="Production Python Refactor",
                    kind="reading",
                    instruction=(
                        "Refactor: a large codebase to clean "
                        "patterns, add tests, and document the "
                        "design."
                    ),
                    difficulty=5,
                ),
                Lesson(
                    title="System Design & Internals",
                    kind="reading",
                    instruction=(
                        "Research: system design and runtime "
                        "internals of the language. Document the "
                        "architecture."
                    ),
                    difficulty=5,
                ),
                Lesson(
                    title="Architecting & Building",
                    kind="project",
                    instruction=(
                        "Architect: a full system with "
                        "documentation, tests, and CI."
                    ),
                    difficulty=5,
                ),
                Lesson(
                    title="Team Leadership & Code Review",
                    kind="project",
                    instruction=(
                        "Lead: a small team to deliver a shipped "
                        "feature and review the code."
                    ),
                    difficulty=5,
                ),
                Lesson(
                    title="Professional Capstone",
                    kind="project",
                    instruction=(
                        "Capstone: professional-level production "
                        "work with clean code and documented "
                        "architecture."
                    ),
                    difficulty=5,
                ),
                Lesson(
                    title="Professional Capstone",
                    kind="project",
                    instruction=(
                        "Final: a shipped product with tests, "
                        "docs, monitoring, and a review."
                    ),
                    difficulty=5,
                ),
            ),
        ),
    ),
)

'''
