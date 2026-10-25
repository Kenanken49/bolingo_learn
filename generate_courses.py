#!/usr/bin/env python3
"""Generate courses.py with all 5 track definitions."""

import sys
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Tuple


@dataclass(frozen=True)
class Lesson:
    title: str
    kind: str
    instruction: str
    difficulty: int = 1


@dataclass(frozen=True)
class Level:
    number: int
    lessons: Tuple[Lesson, ...]


@dataclass(frozen=True)
class Track:
    slug: str
    name: str
    description: str
    levels: Tuple[Level, ...] = field(default_factory=tuple)

    def course_id(self) -> str:
        return f"{self.slug}-course"

    def quickstart(self) -> str:
        return self.levels[0].lessons[0].title


def make_track(slug, name, description, levels):
    return Track(slug=slug, name=name, description=description, levels=levels)


# HTML, CSS & JavaScript Track
html_css_js_levels = (
    Level(number=1, lessons=(
        Lesson(title="HTML & DOM Fundamentals", kind="reading",
               instruction="Read: the HTML5 skeleton, semantic elements, and the DOM tree. Build a static page that lists three courses you want to learn.", difficulty=1),
        Lesson(title="CSS Layout & Flexbox", kind="demo",
               instruction="Run: a live preview of a responsive navbar and card grid using Flexbox and media queries.", difficulty=1),
        Lesson(title="JavaScript Variables & Functions", kind="practice",
               instruction="Write: pure functions, let/const, arrow functions, and template literals. Validate with the practice endpoint.", difficulty=2),
        Lesson(title="DOM Events & Forms", kind="practice",
               instruction="Build: a login form that validates input and shows inline errors. Test with the built-in assistants before submitting.", difficulty=2),
    )),
    Level(number=2, lessons=(
        Lesson(title="HTML Tables & Forms", kind="reading",
               instruction="Read: table semantics, form controls, label associations, and validation attributes. Draft a contact form for a client.", difficulty=1),
        Lesson(title="Responsive Layouts", kind="practice",
               instruction="Practice: use CSS Grid and Flexbox to build a three-column responsive layout that passes a mobile-first breakpoint audit.", difficulty=2),
        Lesson(title="JavaScript Array Methods", kind="practice",
               instruction="Code: map, filter, reduce, and find on an array of lesson objects. Refactor nested loops into clear, tested functions.", difficulty=2),
        Lesson(title="Form Validation & State", kind="practice",
               instruction="Practice: add real-time validation, focus management, and a simple form state model that prevents submission until valid.", difficulty=3),
    )),
    Level(number=3, lessons=(
        Lesson(title="Semantic HTML & Accessibility", kind="reading",
               instruction="Read: ARIA roles, landmarks, keyboard navigation, and contrast basics. Run an accessibility checker over a sample page.", difficulty=2),
        Lesson(title="CSS Variables & Theming", kind="practice",
               instruction="Practice: build a design system with CSS custom properties, then switch light and dark themes via a toggle.", difficulty=2),
        Lesson(title="ES6+ Modules & Closures", kind="practice",
               instruction="Code: export/import modules, closures, and module scope. Add unit tests for a small utility library.", difficulty=3),
        Lesson(title="Debugging & DevTools", kind="practice",
               instruction="Practice: use the browser DevTools to set breakpoints, inspect the call stack, and trace a confusing async bug in a provided repository.", difficulty=3),
    )),
    Level(number=4, lessons=(
        Lesson(title="Version Control & Code Review", kind="practice",
               instruction="Practice: use Git branches, commits, and a code review workflow. Submit a pull request with a written review commentary.", difficulty=2),
        Lesson(title="Browser Storage & Auth", kind="project",
               instruction="Build: a notes app with localStorage, session-based auth, and a logout flow that clears cookies securely.", difficulty=3),
        Lesson(title="Testing & CI", kind="practice",
               instruction="Practice: write unit and integration tests, set up a CI workflow that runs on every push, and add coverage to a failing test.", difficulty=3),
    )),
    Level(number=5, lessons=(
        Lesson(title="TypeScript & Strict Config", kind="reading",
               instruction="Read: strict TypeScript settings, type narrowing, discriminated unions, and generics. Refactor a small module to strict.", difficulty=4),
        Lesson(title="Performance & Observability", kind="demo",
               instruction="Profile: runtime performance, accessibility, and bundle size of a sample application. Record the metrics.", difficulty=3),
        Lesson(title="CSS & JS Architecture", kind="practice",
               instruction="Architect: a design-system-centric codebase with tests, a component catalogue, and documented patterns.", difficulty=4),
        Lesson(title="Build Optimization", kind="practice",
               instruction="Optimize: a production build, analyze the bundle, and reduce the critical render-blocking resources.", difficulty=4),
    )),
    Level(number=6, lessons=(
        Lesson(title="Modern CSS & Animations", kind="reading",
               instruction="Read: composited CSS animations, view transitions, and performance guidelines. Record a short case study.", difficulty=4),
        Lesson(title="Framework Choice & Ecosystem", kind="reading",
               instruction="Research: compare two frontend frameworks on bundle size, DX, and maintenance. Write a short recommendation.", difficulty=3),
        Lesson(title="Production Frontend Architecture", kind="project",
               instruction="Build and ship: a production-ready frontend with proper patterns, testing, and observability, plus a rollout plan.", difficulty=5),
        Lesson(title="Security & Accessibility", kind="practice",
               instruction="Perform: a security and accessibility assessment, fix the findings, and write a documented resolution plan.", difficulty=4),
        Lesson(title="Deploy & Monitor", kind="project",
               instruction="Deploy: a fully monitored frontend with logs, error tracking, and automated rollbacks.", difficulty=5),
        Lesson(title="Professional Frontend Course", kind="project",
               instruction="Final: a deployable, documented, and reviewed frontend that demonstrates professional-level work.", difficulty=5),
    )),
)

html_css_js_track = make_track(
    slug="html-css-js",
    name="HTML, CSS & JavaScript",
    description="From the first tag to a deployed production frontend: semantic markup, responsive layouts, and vanilla JavaScript that talks to real APIs.",
    levels=html_css_js_levels
)

# Python Track
python_levels = (
    Level(number=1, lessons=(
        Lesson(title="Python Basics & Environment", kind="reading",
               instruction="Read: Python tooling and a first program. Run the setup script and commit the requirements.", difficulty=1),
        Lesson(title="Control Flow & Functions", kind="practice",
               instruction="Write: conditionals, loops, and pure functions. Validate with the practice endpoint.", difficulty=2),
        Lesson(title="Data Structures", kind="practice",
               instruction="Build: lists, dicts, sets, and tuples used to model a small dataset.", difficulty=2),
        Lesson(title="Reading & Writing Files", kind="practice",
               instruction="Practice: read a CSV, transform the rows, and write the output file.", difficulty=2),
        Lesson(title="First Script & Testing", kind="practice",
               instruction="Build: a reusable script with a discovered unit test and a requirements file.", difficulty=3),
    )),
    Level(number=2, lessons=(
        Lesson(title="Functions & Modules", kind="practice",
               instruction="Code: importable functions and a small package structure.", difficulty=2),
        Lesson(title="Data Structures & Iterators", kind="practice",
               instruction="Practice: iterators and generators over a dataset.", difficulty=3),
        Lesson(title="Exceptions & Debugging", kind="practice",
               instruction="Practice: raise and handle structured errors, and trace a failure with a debugger.", difficulty=3),
        Lesson(title="Testing & CI", kind="project",
               instruction="Build: a test suite and CI pipeline for a small library.", difficulty=3),
        Lesson(title="Reading & Writing Files", kind="practice",
               instruction="Practice: parse logs, summarize the metrics, and write the report.", difficulty=3),
    )),
    Level(number=3, lessons=(
        Lesson(title="Object-Oriented Python", kind="reading",
               instruction="Read: classes, inheritance, and encapsulation best practices.", difficulty=3),
        Lesson(title="OOP & Composition", kind="practice",
               instruction="Build: an object model and a CLI with a small test suite.", difficulty=3),
        Lesson(title="Error Handling & Logging", kind="practice",
               instruction="Implement: structured logging, custom exception hierarchy, and a failure report.", difficulty=3),
        Lesson(title="Testing & Coverage", kind="practice",
               instruction="Write: unit tests with coverage and CI, reaching the required threshold.", difficulty=3),
        Lesson(title="Project", kind="project",
               instruction="Build: a reusable library with docs and a demo.", difficulty=4),
    )),
    Level(number=4, lessons=(
        Lesson(title="Typing & Protocols", kind="reading",
               instruction="Read: type hints, generics, and protocols. Upgrade the toolchain.", difficulty=4),
        Lesson(title="Modules & Packaging", kind="practice",
               instruction="Build: a package with a pyproject.toml, tests, and a CI pipeline.", difficulty=4),
        Lesson(title="API & Database", kind="practice",
               instruction="Practice: call a REST API and store results in SQLite with a clean schema.", difficulty=4),
        Lesson(title="Error Handling & Logging", kind="practice",
               instruction="Implement: comprehensive logging and error tracking for a CLI tool.", difficulty=4),
        Lesson(title="Testing & CI", kind="project",
               instruction="Build: a tested, CI-pipeline, code-linted solution.", difficulty=4),
    )),
    Level(number=5, lessons=(
        Lesson(title="Async Programming", kind="reading",
               instruction="Read: async/await, event loops, and concurrency best practices.", difficulty=4),
        Lesson(title="APIs & Web Frameworks", kind="practice",
               instruction="Practice: build a small FastAPI service with routing, validation, and tests.", difficulty=4),
        Lesson(title="Testing & CI", kind="practice",
               instruction="Write: a test suite with a CI pipeline, test coverage, and error handling.", difficulty=4),
        Lesson(title="Database & ORM", kind="project",
               instruction="Build: a data pipeline that queries a database and exposes the results via an API.", difficulty=4),
        Lesson(title="ML & Deployment", kind="project",
               instruction="Ship: a trained model API with a CI pipeline and a live demo.", difficulty=5),
        Lesson(title="Production Readiness", kind="project",
               instruction="Produce: a production-grade Python service with monitoring and docs.", difficulty=5),
    )),
    Level(number=6, lessons=(
        Lesson(title="Production Python Refactor", kind="reading",
               instruction="Refactor: a large codebase to clean patterns, add tests, and document the design.", difficulty=5),
        Lesson(title="System Design & Internals", kind="reading",
               instruction="Research: system design and runtime internals of the language. Document the architecture.", difficulty=5),
        Lesson(title="Architecting & Building", kind="project",
               instruction="Architect: a full system with documentation, tests, and CI.", difficulty=5),
        Lesson(title="Team Leadership & Code Review", kind="project",
               instruction="Lead: a small team to deliver a shipped feature and review the code.", difficulty=5),
        Lesson(title="Professional Capstone", kind="project",
               instruction="Capstone: professional-level production work with clean code and documented architecture.", difficulty=5),
        Lesson(title="Professional Capstone", kind="project",
               instruction="Final: a shipped product with tests, docs, monitoring, and a review.", difficulty=5),
    )),
)

python_track = make_track(
    slug="python",
    name="Python",
    description="From a first script to a production data platform.",
    levels=python_levels
)

# C++ Track
cpp_levels = (
    Level(number=1, lessons=(
        Lesson(title="C++ Basics & Environment", kind="reading",
               instruction="Read: a first program, the toolchain, and the build setup. Compile and run the starter project.", difficulty=1),
        Lesson(title="Variables, Types, & Control Flow", kind="practice",
               instruction="Write: basic types, conditionals, and loops. Validate with the exercise endpoint.", difficulty=2),
        Lesson(title="Functions & Scope", kind="practice",
               instruction="Build: functions, parameters, and parameter passing, then run the tests.", difficulty=2),
        Lesson(title="Arrays & Strings", kind="practice",
               instruction="Practice: array and string processing with bounds-checked indexing.", difficulty=2),
        Lesson(title="Project & Testing", kind="project",
               instruction="Build: a small command-line tool with a regression test and a README.", difficulty=3),
    )),
    Level(number=2, lessons=(
        Lesson(title="Pointers & References", kind="reading",
               instruction="Read: value vs. reference semantics, pointer arithmetic, and dangling pointers.", difficulty=3),
        Lesson(title="Memory & RAII", kind="practice",
               instruction="Practice: allocate and free memory safely using RAII patterns.", difficulty=3),
        Lesson(title="OOP & File I/O", kind="practice",
               instruction="Build: a file parser with an object model and unit tests.", difficulty=3),
        Lesson(title="STL & Algorithms", kind="practice",
               instruction="Practice: the Standard Template Library containers and algorithms.", difficulty=3),
        Lesson(title="Project", kind="project",
               instruction="Deliver: a library with tests, docs, and a demo.", difficulty=4),
    )),
    Level(number=3, lessons=(
        Lesson(title="C++ Templates & Iterators", kind="reading",
               instruction="Read: templates, traits, and the iterator hierarchy.", difficulty=4),
        Lesson(title="STL & Algorithms", kind="practice",
               instruction="Implement: a custom container with algorithms wired in.", difficulty=4),
        Lesson(title="OOP & File I/O", kind="practice",
               instruction="Practice: an object-oriented file reader with structured error handling.", difficulty=4),
        Lesson(title="Templates & Generics", kind="project",
               instruction="Build: a generic utility library with unit tests.", difficulty=4),
        Lesson(title="Project & Review", kind="project",
               instruction="Deliver: a tested library with a clean repository and review.", difficulty=5),
    )),
    Level(number=4, lessons=(
        Lesson(title="Templates & Metaprogramming", kind="reading",
               instruction="Read: templates, function objects, and type deduction.", difficulty=4),
        Lesson(title="OOP & File I/O", kind="practice",
               instruction="Practice: a polymorphic class hierarchy with an I/O backend.", difficulty=4),
        Lesson(title="STL & Algorithms", kind="practice",
               instruction="Practice: the Standard Template Library containers and algorithms.", difficulty=4),
        Lesson(title="Templates & Generics", kind="project",
               instruction="Build: a reusable template library with tests.", difficulty=5),
        Lesson(title="Project & Review", kind="project",
               instruction="Deliver: a tested and reviewed library.", difficulty=5),
    )),
    Level(number=5, lessons=(
        Lesson(title="Memory & Performance", kind="reading",
               instruction="Read: memory layout, cache behavior, and profiling tools.", difficulty=5),
        Lesson(title="Multi-threading & Concurrency", kind="reading",
               instruction="Read: std::thread, mutex, and condition variables for safe concurrency.", difficulty=5),
        Lesson(title="Multi-threading & Lock-Free", kind="practice",
               instruction="Practice: a lock-free queue using std::atomic with a stress test.", difficulty=5),
        Lesson(title="File I/O & Performance", kind="project",
               instruction="Build: a high-throughput data pipeline with benchmarks and tests.", difficulty=5),
        Lesson(title="Production Systems", kind="project",
               instruction="Ship: a production service with observability and a dashboard.", difficulty=5),
    )),
    Level(number=6, lessons=(
        Lesson(title="Production C++ Refactor", kind="reading",
               instruction="Refactor: a legacy library to modern C++ with benchmarks and tests.", difficulty=5),
        Lesson(title="System Design & Internals", kind="reading",
               instruction="Research: OS and runtime internals of the runtime. Document the architecture.", difficulty=5),
        Lesson(title="Architecting & Building", kind="project",
               instruction="Design and build: a scalable system with documentation and CI.", difficulty=5),
        Lesson(title="Team Leadership & Code Review", kind="project",
               instruction="Lead: a small team to deliver a shipped feature and review the code.", difficulty=5),
        Lesson(title="Professional Capstone", kind="project",
               instruction="Capstone: professional-level production work with clean code and documented architecture.", difficulty=5),
        Lesson(title="Professional Capstone", kind="project",
               instruction="Final: a shipped piece of software with tests, docs, and a review.", difficulty=5),
    )),
)

cpp_track = make_track(
    slug="cpp",
    name="C++",
    description="From a first hello world to production low-latency code.",
    levels=cpp_levels
)

# Data Engineering Track
data_levels = (
    Level(number=1, lessons=(
        Lesson(title="Database Fundamentals", kind="reading",
               instruction="Read: relational database concepts, SQL, and schema design. Create a normalized database for a simple application.", difficulty=1),
        Lesson(title="SQL Queries & Joins", kind="practice",
               instruction="Practice: write SELECT queries with JOINs, GROUP BY, and basic aggregations.", difficulty=2),
        Lesson(title="Data Modeling", kind="practice",
               instruction="Practice: design an ER diagram and migrate a schema to Third Normal Form.", difficulty=2),
        Lesson(title="ETL Pipelines", kind="project",
               instruction="Build: an ETL pipeline that extracts data from a CSV, transforms it, and loads it into a data warehouse.", difficulty=3),
        Lesson(title="Data Warehousing", kind="project",
               instruction="Build: a star schema data warehouse with dimension and fact tables.", difficulty=3),
    )),
    Level(number=2, lessons=(
        Lesson(title="Stream Processing", kind="practice",
               instruction="Practice: process real-time data streams with Kafka or Pulsar and windowed aggregations.", difficulty=3),
        Lesson(title="NoSQL Basics", kind="practice",
               instruction="Practice: document modeling with MongoDB and basic CRUD operations.", difficulty=3),
        Lesson(title="Data Pipelines", kind="project",
               instruction="Build: a data pipeline with ingestion, transformation, and output to a dashboard.", difficulty=4),
        Lesson(title="Data Quality & Testing", kind="project",
               instruction="Implement: data validation, testing, and monitoring rules for a pipeline.", difficulty=4),
    )),
    Level(number=3, lessons=(
        Lesson(title="Big Data fundamentals", kind="reading",
               instruction="Read: Hadoop, Spark, and distributed processing fundamentals.", difficulty=3),
        Lesson(title="Stream Processing", kind="practice",
               instruction="Practice: process real-time data streams with Kafka or Pulsar and windowed aggregations.", difficulty=4),
        Lesson(title="Data Lakes", kind="project",
               instruction="Build: a data lake with object storage and schema-on-read approach.", difficulty=4),
        Lesson(title="Analytics Engineering", kind="project",
               instruction="Build: an analytics framework with transformation tests and semantic layers.", difficulty=4),
        Lesson(title="Monitoring & Observability", kind="project",
               instruction="Build: dashboards for pipeline metrics, alerting, and SLA tracking.", difficulty=5),
    )),
    Level(number=4, lessons=(
        Lesson(title="Advanced Analytics", kind="reading",
               instruction="Read: predictive modeling, feature engineering, and model deployment best practices.", difficulty=4),
        Lesson(title="Real-time Analytics", kind="project",
               instruction="Build: a real-time analytics dashboard with low-latency processing.", difficulty=5),
        Lesson(title="Data Governance", kind="project",
               instruction="Implement: data catalog, lineage, and compliance framework.", difficulty=5),
        Lesson(title="MLOps", kind="project",
               instruction="Build: an end-to-end MLOps pipeline from model training to monitoring.", difficulty=5),
    )),
    Level(number=5, lessons=(
        Lesson(title="Advanced MLOps", kind="reading",
               instruction="Read: model serving, canary deployments, and A/B testing frameworks.", difficulty=5),
        Lesson(title="Real-time Analytics", kind="project",
               instruction="Build: a real-time analytics platform with stream processing and batch blending.", difficulty=5),
        Lesson(title="Data Governance at Scale", kind="project",
               instruction="Implement: enterprise-wide data governance, privacy, and security framework.", difficulty=5),
        Lesson(title="AI-Powered Analytics", kind="project",
               instruction="Build: an AI-enhanced analytics system with automated insight generation.", difficulty=5),
    )),
)

data_track = make_track(
    slug="data",
    name="Data Engineering",
    description="From relational databases to big data pipelines and analytics.",
    levels=data_levels
)

# DevOps & Platform Engineering Track
devops_levels = (
    Level(number=1, lessons=(
        Lesson(title="Linux & Git", kind="reading",
               instruction="Read: a Linux shell and Git workflow. Commit a clean project.", difficulty=1),
        Lesson(title="Linux Basics & Shell", kind="practice",
               instruction="Practice: automate a backup script and document the steps.", difficulty=2),
    )),
    Level(number=2, lessons=(
        Lesson(title="Linux Automation & Scripting", kind="practice",
               instruction="Practice: automate a backup script with error handling and log the output.", difficulty=2),
        Lesson(title="Version Control & CI", kind="practice",
               instruction="Practice: use a Git branching model and a CI pipeline that runs tests.", difficulty=2),
        Lesson(title="Cloud & IaC", kind="practice",
               instruction="Practice: provision cloud resources via a Terraform module with tests.", difficulty=3),
        Lesson(title="API & Database", kind="practice",
               instruction="Practice: call a REST API and store the results in SQLite with a clean schema.", difficulty=3),
        Lesson(title="Testing & CI", kind="project",
               instruction="Build: a tested CI/CD pipeline with a monitoring dashboard.", difficulty=3),
        Lesson(title="Project & Review", kind="project",
               instruction="Deliver: an end-to-end pipeline with code review.", difficulty=4),
    )),
    Level(number=3, lessons=(
        Lesson(title="CI/CD & Cloud", kind="reading",
               instruction="Read: pipeline patterns, cloud providers, and IaC.", difficulty=3),
        Lesson(title="Cloud & IaC", kind="practice",
               instruction="Practice: build a multi-environment infrastructure with a linting step.", difficulty=3),
        Lesson(title="Containers & Docker", kind="practice",
               instruction="Practice: build and publish a Docker image with a security scan.", difficulty=3),
        Lesson(title="Observability & Monitoring", kind="project",
               instruction="Build: a pipeline with metrics, logs, and a dashboard.", difficulty=4),
        Lesson(title="Project & Review", kind="project",
               instruction="Deliver: a full stack with CI/CD, containers, and docs.", difficulty=4),
        Lesson(title="Professional Capstone", kind="project",
               instruction="Capstone: a monitored and documented pipeline.", difficulty=5),
    )),
    Level(number=4, lessons=(
        Lesson(title="Kubernetes & Orchestration", kind="reading",
               instruction="Read: container orchestration, deployments, and service mesh.", difficulty=4),
        Lesson(title="Containers & Docker", kind="practice",
               instruction="Practice: build a multi-stage Docker build with a non-root user.", difficulty=4),
        Lesson(title="Observability & Monitoring", kind="practice",
               instruction="Practice: add tracing and metrics to a service.", difficulty=4),
        Lesson(title="Containers & Docker", kind="project",
               instruction="Build and ship: an optimized container with security scanning.", difficulty=5),
        Lesson(title="Production Readiness", kind="project",
               instruction="Ship: a cloud-native service with circuit breakers and autoscaling.", difficulty=5),
        Lesson(title="Professional Capstone", kind="project",
               instruction="Capstone: a reviewed cloud-native platform.", difficulty=5),
    )),
    Level(number=5, lessons=(
        Lesson(title="Kubernetes & Observability", kind="reading",
               instruction="Read: K8s operators, custom resources, and SLOs.", difficulty=5),
        Lesson(title="Containers & Docker", kind="practice",
               instruction="Practice: a multi-stage build with multi-architecture manifests.", difficulty=5),
        Lesson(title="Observability & Monitoring", kind="project",
               instruction="Build: a deployment with Prometheus alerts and Grafana dashboards.", difficulty=5),
        Lesson(title="Project & Review", kind="project",
               instruction="Deliver: a complete Kubernetes platform with IaC and CI.", difficulty=5),
        Lesson(title="Production Readiness", kind="project",
               instruction="Ship: a secure, reviewed platform with governance.", difficulty=5),
        Lesson(title="Professional Capstone", kind="project",
               instruction="Capstone: a production-grade platform with full documentation.", difficulty=5),
    )),
    Level(number=6, lessons=(
        Lesson(title="Production SRE & Architecture", kind="reading",
               instruction="Read: a production SRE handbook and architecture review.", difficulty=5),
        Lesson(title="Advanced Topics & Research", kind="reading",
               instruction="Research: platform engineering and emerging cloud-native topics.", difficulty=5),
        Lesson(title="Production SRE & Architecture", kind="project",
               instruction="Design and build: an enterprise platform with governance and review.", difficulty=5),
        Lesson(title="Advanced Topics & Research", kind="project",
               instruction="Deliver: a presented research project with peer review.", difficulty=5),
        Lesson(title="Professional Capstone", kind="project",
               instruction="Capstone: a shipped platform with comprehensive documentation.", difficulty=5),
        Lesson(title="Professional Capstone", kind="project",
               instruction="Final: an enterprise platform with observability, governance, and review.", difficulty=5),
    )),
)

devops_track = make_track(
    slug="devops",
    name="DevOps & Platform Engineering",
    description="From Linux basics to SRE practices and platform design.",
    levels=devops_levels
)

# Catalog
CATALOG = (
    html_css_js_track,
    python_track,
    cpp_track,
    data_track,
    devops_track,
)


def all_courses() -> list:
    """Return the full beginner-to-professional course catalog."""
    return list(CATALOG)


# Write the file
with open("courses.py", "w", newline="\n") as f:
    # Write the docstring and imports
    f.write('"""Course catalog with a progressive developer curriculum.\n\n')
    f.write('Each track defines 6 levels (1 = absolute beginner, 6 = professional).\n')
    f.write('Each level carries lessons defined by title, exercise type, and a\n')
    f.write('difficulty score that increases monotonically from 1 to 5 across a\n')
    f.write('track. L1 is always the grounding lesson; L6 is the capstone.\n\n')
    f.write('The data-driven shape is:\n\n')
    f.write('- Track: theme slug, display name, and a list of Level objects.\n')
    f.write('- Level: number and list of Lesson objects.\n')
    f.write('- Lesson: title, kind (reading/demo/practice/project), instruction, and\n')
    f.write('  a difficulty score (1-5) used for recommendations and prerequisites.\n\n')
    f.write('Courses are served through the existing API alongside the language-lesson\n')
    f.write('workflow (Material -> Generate -> Course -> Lesson -> Attempt). The\n')
    f.write('frontend maps these to `CoursePage` and `LessonPage` components.\n')
    f.write('\"\"\"\n\n')
    f.write('from __future__ import annotations\n\n')
    f.write('from dataclasses import dataclass, field\n\n')
    f.write('DIFFICULTY = [1, 2, 3, 4, 5]  # 1 beginner, 5 professional\n\n')
    f.write('\n')
    f.write('@dataclass(frozen=True)\n')
    f.write('class Lesson:\n')
    f.write('    """One screen in a course.\n\n')
    f.write('    The `kind` matches the lesson activity types already used in the app\n')
    f.write('    (practice, project, quiz) and can be rendered by the existing lesson\n')
    f.write('    player with a single content decoder.\n')
    f.write('    """\n\n')
    f.write('    title: str\n')
    f.write('    kind: str\n')
    f.write('    instruction: str\n')
    f.write('    difficulty: int = 1\n\n')
    f.write('\n')
    f.write('@dataclass(frozen=True)\n')
    f.write('class Level:\n')
    f.write('    """Six gated levels in a track."""\n\n')
    f.write('    number: int\n')
    f.write('    lessons: tuple[Lesson, ...]\n\n')
    f.write('\n')
    f.write('@dataclass(frozen=True)\n')
    f.write('class Track:\n')
    f.write('    """A complete beginner-to-professional path for one topic."""\n\n')
    f.write('    slug: str\n')
    f.write('    name: str\n')
    f.write('    description: str\n')
    f.write('    levels: tuple[Level, ...] = field(default_factory=tuple)\n\n')
    f.write('    def course_id(self) -> str:\n')
    f.write('        return f"{self.slug}-course"\n\n')
    f.write('    def quickstart(self) -> str:\n')
    f.write('        return self.levels[0].lessons[0].title\n\n')
    f.write('\n')

    # Write track definitions
    f.write('HTML_CSS_JS = ' + repr(html_css_js_track) + '\n')
    f.write('PYTHON = ' + repr(python_track) + '\n')
    f.write('CPP = ' + repr(cpp_track) + '\n')
    f.write('DATA = ' + repr(data_track) + '\n')
    f.write('DEVOPS = ' + repr(devops_track) + '\n')
    f.write('\n')
    f.write('CATALOG = (\n')
    f.write('    HTML_CSS_JS,\n')
    f.write('    PYTHON,\n')
    f.write('    CPP,\n')
    f.write('    DATA,\n')
    f.write('    DEVOPS,\n')
    f.write(')\n\n')
    f.write('\n')
    f.write('def all_courses() -> list:\n')
    f.write('    """Return the full beginner-to-professional course catalog."""\n')
    f.write('    return list(CATALOG)\n')

print("Generated courses.py successfully")