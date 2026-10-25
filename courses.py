"""Built-in course catalog: real-world developer curricula.

Each track defines 6 levels (1 = beginner, 6 = professional). Each level
carries lessons with a title, an activity kind (reading/demo/practice/project)
and an instruction, plus a difficulty score (1-5) that rises across a track.
L1 grounds the learner; L6 is the capstone.

Courses are served through the API alongside the uploaded-material workflow
(Material -> Generate -> Course -> Lesson -> Attempt).
"""

from __future__ import annotations

from dataclasses import dataclass, field

DIFFICULTY = [1, 2, 3, 4, 5]  # 1 beginner, 5 professional


@dataclass(frozen=True)
class Lesson:
    title: str
    kind: str
    instruction: str
    difficulty: int = 1


@dataclass(frozen=True)
class Level:
    number: int
    lessons: tuple[Lesson, ...]


@dataclass(frozen=True)
class Track:
    slug: str
    name: str
    description: str
    levels: tuple[Level, ...] = field(default_factory=tuple)

    def course_id(self) -> str:
        return f"{self.slug}-course"

    def quickstart(self) -> str:
        return self.levels[0].lessons[0].title


OPERATING_SYSTEMS = Track(
    slug="operating-systems",
    name="Operating Systems",
    description="How a computer really runs your programs: processes, memory, devices and files, from first principles to the kernel decisions behind them.",
    levels=(
        Level(
            number=1,
            lessons=(
                Lesson(
                    title="What an Operating System Does",
                    kind="reading",
                    instruction="Read: the OS as resource manager and as an abstraction layer. Explain why a program never touches the disk or CPU directly.",
                    difficulty=1,
                ),
                Lesson(
                    title="Kernel Mode vs User Mode",
                    kind="demo",
                    instruction="Run: trace a system call such as read() from a user program into the kernel and back, noting the mode switch.",
                    difficulty=1,
                ),
            ),
        ),
        Level(
            number=2,
            lessons=(
                Lesson(
                    title="Processes and Their States",
                    kind="reading",
                    instruction="Read: the process control block, and the new, ready, running, waiting and terminated states. Draw the transitions.",
                    difficulty=2,
                ),
                Lesson(
                    title="Creating Processes",
                    kind="practice",
                    instruction="Write: a program that starts a child process and waits for it, then explain what fork and exec each do.",
                    difficulty=2,
                ),
            ),
        ),
        Level(
            number=3,
            lessons=(
                Lesson(
                    title="CPU Scheduling",
                    kind="reading",
                    instruction="Read: FCFS, round robin and priority scheduling. Compare average waiting time for the same workload.",
                    difficulty=3,
                ),
                Lesson(
                    title="Threads and Concurrency",
                    kind="practice",
                    instruction="Write: two threads that increment a shared counter, observe the race, then fix it with a lock.",
                    difficulty=3,
                ),
            ),
        ),
        Level(
            number=4,
            lessons=(
                Lesson(
                    title="Memory Management and Paging",
                    kind="reading",
                    instruction="Read: logical versus physical addresses, page tables and how a page fault is handled.",
                    difficulty=3,
                ),
                Lesson(
                    title="Virtual Memory and Replacement",
                    kind="practice",
                    instruction="Practice: simulate FIFO and LRU page replacement on a reference string and count the faults.",
                    difficulty=4,
                ),
            ),
        ),
        Level(
            number=5,
            lessons=(
                Lesson(
                    title="Device I/O and Interrupts",
                    kind="reading",
                    instruction="Read: polling versus interrupt-driven I/O, DMA, and how a device driver talks to hardware.",
                    difficulty=4,
                ),
                Lesson(
                    title="File Systems and Allocation",
                    kind="project",
                    instruction="Build: a small inode-style file table that stores file blocks and supports create, read and delete.",
                    difficulty=4,
                ),
            ),
        ),
        Level(
            number=6,
            lessons=(
                Lesson(
                    title="Capstone: A Mini Kernel Simulator",
                    kind="project",
                    instruction="Final: simulate a scheduler, paged memory and a file table together, and report throughput and faults for a mixed workload.",
                    difficulty=5,
                ),
            ),
        ),
    ),
)

HTML_CSS_JS = Track(
    slug="html-css-js",
    name="HTML, CSS & JavaScript",
    description="From the first tag to a production frontend: semantic markup, responsive layouts, and JavaScript that talks to real APIs.",
    levels=(
        Level(
            number=1,
            lessons=(
                Lesson(
                    title="Semantic HTML Page",
                    kind="reading",
                    instruction="Read: the HTML5 document skeleton and semantic elements. Build a page with header, nav, main and footer for a real business.",
                    difficulty=1,
                ),
                Lesson(
                    title="Forms That Work",
                    kind="practice",
                    instruction="Write: a contact form with labels, required fields and the right input types, then explain what the browser validates for you.",
                    difficulty=1,
                ),
            ),
        ),
        Level(
            number=2,
            lessons=(
                Lesson(
                    title="Flexbox Navigation",
                    kind="demo",
                    instruction="Run: a responsive navbar that collapses on small screens using Flexbox and a media query.",
                    difficulty=2,
                ),
                Lesson(
                    title="CSS Grid Product Cards",
                    kind="practice",
                    instruction="Write: a card grid that reflows from one to three columns without JavaScript.",
                    difficulty=2,
                ),
            ),
        ),
        Level(
            number=3,
            lessons=(
                Lesson(
                    title="JavaScript Data and Functions",
                    kind="practice",
                    instruction="Write: functions that filter and total an array of orders, using map, filter and reduce.",
                    difficulty=3,
                ),
                Lesson(
                    title="DOM Events",
                    kind="practice",
                    instruction="Write: a to-do list that adds, completes and removes items through event listeners.",
                    difficulty=3,
                ),
            ),
        ),
        Level(
            number=4,
            lessons=(
                Lesson(
                    title="Fetching Real APIs",
                    kind="practice",
                    instruction="Write: fetch a public JSON API, render the results and show a loading and an error state.",
                    difficulty=3,
                ),
                Lesson(
                    title="Accessible Interfaces",
                    kind="reading",
                    instruction="Read: ARIA roles, keyboard focus and colour contrast. Audit a page and fix three real problems.",
                    difficulty=4,
                ),
            ),
        ),
        Level(
            number=5,
            lessons=(
                Lesson(
                    title="Client State and Forms",
                    kind="project",
                    instruction="Build: a checkout form with validation, error messages and a submit state that cannot double-send.",
                    difficulty=4,
                ),
                Lesson(
                    title="Performance and Bundles",
                    kind="reading",
                    instruction="Read: critical rendering path, lazy loading and image sizing. Measure a page with Lighthouse and list the fixes.",
                    difficulty=4,
                ),
            ),
        ),
        Level(
            number=6,
            lessons=(
                Lesson(
                    title="Capstone: Deployed Storefront",
                    kind="project",
                    instruction="Final: a responsive storefront that loads products from an API, handles errors, passes an accessibility audit and is deployed.",
                    difficulty=5,
                ),
            ),
        ),
    ),
)

PYTHON = Track(
    slug="python",
    name="Python",
    description="Python for real work: scripting, data handling, APIs and testing, built around small projects you could ship.",
    levels=(
        Level(
            number=1,
            lessons=(
                Lesson(
                    title="Variables and Types",
                    kind="reading",
                    instruction="Read: numbers, strings, lists and dicts. Explain how Python handles a value you reassign.",
                    difficulty=1,
                ),
                Lesson(
                    title="Your First Script",
                    kind="practice",
                    instruction="Write: a script that reads a CSV of expenses and prints the total per category.",
                    difficulty=1,
                ),
            ),
        ),
        Level(
            number=2,
            lessons=(
                Lesson(
                    title="Functions and Modules",
                    kind="practice",
                    instruction="Write: split the expense script into functions and a module, and import it from a second file.",
                    difficulty=2,
                ),
                Lesson(
                    title="Files and Paths",
                    kind="demo",
                    instruction="Run: read and write files with pathlib and a context manager, handling a missing file cleanly.",
                    difficulty=2,
                ),
            ),
        ),
        Level(
            number=3,
            lessons=(
                Lesson(
                    title="Errors and Exceptions",
                    kind="practice",
                    instruction="Write: parse user input safely, raising and catching specific exceptions with useful messages.",
                    difficulty=3,
                ),
                Lesson(
                    title="Testing with pytest",
                    kind="practice",
                    instruction="Write: unit tests for the expense functions, including an edge case with an empty file.",
                    difficulty=3,
                ),
            ),
        ),
        Level(
            number=4,
            lessons=(
                Lesson(
                    title="Calling HTTP APIs",
                    kind="practice",
                    instruction="Write: fetch JSON from a public API with httpx, with a timeout and retry on failure.",
                    difficulty=3,
                ),
                Lesson(
                    title="Virtual Environments and Packaging",
                    kind="reading",
                    instruction="Read: venvs, requirements files and pinning. Set up a project that installs cleanly on a fresh machine.",
                    difficulty=4,
                ),
            ),
        ),
        Level(
            number=5,
            lessons=(
                Lesson(
                    title="Web API with FastAPI",
                    kind="project",
                    instruction="Build: a FastAPI service with typed request models, a database table and an automated test suite.",
                    difficulty=4,
                ),
                Lesson(
                    title="Concurrency with asyncio",
                    kind="reading",
                    instruction="Read: coroutines, the event loop, and when async beats threads. Time a batch of I/O calls both ways.",
                    difficulty=4,
                ),
            ),
        ),
        Level(
            number=6,
            lessons=(
                Lesson(
                    title="Capstone: Production Service",
                    kind="project",
                    instruction="Final: a containerised API with logging, configuration from the environment, health checks and CI-run tests.",
                    difficulty=5,
                ),
            ),
        ),
    ),
)

CPP = Track(
    slug="cpp",
    name="C++",
    description="Modern C++ for systems and performance work: types, memory ownership, the standard library and building real tools.",
    levels=(
        Level(
            number=1,
            lessons=(
                Lesson(
                    title="Compiling Your First Program",
                    kind="demo",
                    instruction="Run: compile and run a C++ program with g++ or clang++, and read the compiler's first error.",
                    difficulty=1,
                ),
                Lesson(
                    title="Values, References and Const",
                    kind="reading",
                    instruction="Read: value versus reference parameters, and why const belongs on read-only arguments.",
                    difficulty=1,
                ),
            ),
        ),
        Level(
            number=2,
            lessons=(
                Lesson(
                    title="Vectors and Strings",
                    kind="practice",
                    instruction="Write: read lines from a file into a std::vector<std::string> and print the longest one.",
                    difficulty=2,
                ),
                Lesson(
                    title="Classes and Constructors",
                    kind="practice",
                    instruction="Write: a BankAccount class with a constructor, a deposit method and an invariant that balance is never negative.",
                    difficulty=2,
                ),
            ),
        ),
        Level(
            number=3,
            lessons=(
                Lesson(
                    title="Ownership with unique_ptr",
                    kind="practice",
                    instruction="Write: a function that returns a unique_ptr to a resource and show that no manual delete is needed.",
                    difficulty=3,
                ),
                Lesson(
                    title="Templates and the STL",
                    kind="practice",
                    instruction="Write: a generic function that finds the max of any container, and use std::sort with a lambda.",
                    difficulty=3,
                ),
            ),
        ),
        Level(
            number=4,
            lessons=(
                Lesson(
                    title="Undefined Behaviour Hunt",
                    kind="practice",
                    instruction="Practice: find the dangling reference, the out-of-bounds read and the signed overflow in five short snippets.",
                    difficulty=3,
                ),
                Lesson(
                    title="Build Systems with CMake",
                    kind="reading",
                    instruction="Read: targets, dependencies and out-of-source builds. Convert a two-file program to a CMake project.",
                    difficulty=4,
                ),
            ),
        ),
        Level(
            number=5,
            lessons=(
                Lesson(
                    title="Move Semantics",
                    kind="reading",
                    instruction="Read: rvalue references and std::move. Measure a copy versus a move of a large vector.",
                    difficulty=4,
                ),
                Lesson(
                    title="Command-Line Tool",
                    kind="project",
                    instruction="Build: a command-line word counter with argument parsing, error handling and unit tests.",
                    difficulty=4,
                ),
            ),
        ),
        Level(
            number=6,
            lessons=(
                Lesson(
                    title="Capstone: Profiled Data Tool",
                    kind="project",
                    instruction="Final: a tool that processes a large file, profiled and optimised, with benchmarks that show the speedup.",
                    difficulty=5,
                ),
            ),
        ),
    ),
)

DATA = Track(
    slug="data",
    name="Data Analysis",
    description="Turn messy real datasets into answers: cleaning, SQL, analysis in pandas, visualisation and communicating results.",
    levels=(
        Level(
            number=1,
            lessons=(
                Lesson(
                    title="Reading Messy CSVs",
                    kind="practice",
                    instruction="Write: load a CSV with missing values and mixed types, and report what is broken before you fix it.",
                    difficulty=1,
                ),
                Lesson(
                    title="Summary Statistics",
                    kind="reading",
                    instruction="Read: mean, median, spread and outliers. Explain why the median is the safer figure for incomes.",
                    difficulty=1,
                ),
            ),
        ),
        Level(
            number=2,
            lessons=(
                Lesson(
                    title="Cleaning with pandas",
                    kind="practice",
                    instruction="Write: parse dates, fill or drop nulls and remove duplicate rows from a sales file.",
                    difficulty=2,
                ),
                Lesson(
                    title="SQL SELECT and Joins",
                    kind="practice",
                    instruction="Write: join orders to customers and total revenue per region with GROUP BY.",
                    difficulty=2,
                ),
            ),
        ),
        Level(
            number=3,
            lessons=(
                Lesson(
                    title="Grouping and Pivoting",
                    kind="practice",
                    instruction="Write: build a monthly revenue pivot table and find the month with the largest drop.",
                    difficulty=3,
                ),
                Lesson(
                    title="Charts That Tell the Truth",
                    kind="demo",
                    instruction="Run: plot the same data as a bar chart with a truncated axis and then fixed, and explain the difference.",
                    difficulty=3,
                ),
            ),
        ),
        Level(
            number=4,
            lessons=(
                Lesson(
                    title="Hypothesis Testing",
                    kind="reading",
                    instruction="Read: p-values, confidence intervals and sample size. Test whether two campaigns differ.",
                    difficulty=4,
                ),
                Lesson(
                    title="Window Functions in SQL",
                    kind="practice",
                    instruction="Write: a running total and a rank per customer using OVER and PARTITION BY.",
                    difficulty=4,
                ),
            ),
        ),
        Level(
            number=5,
            lessons=(
                Lesson(
                    title="Forecasting Basics",
                    kind="project",
                    instruction="Build: forecast next quarter's sales from a year of history and compare two simple models.",
                    difficulty=4,
                ),
                Lesson(
                    title="Reporting Findings",
                    kind="reading",
                    instruction="Read: lead with the answer, state the uncertainty and avoid claims the data cannot support.",
                    difficulty=4,
                ),
            ),
        ),
        Level(
            number=6,
            lessons=(
                Lesson(
                    title="Capstone: Business Dashboard",
                    kind="project",
                    instruction="Final: an analysis of a real public dataset with a cleaned pipeline, SQL queries, charts and a written recommendation.",
                    difficulty=5,
                ),
            ),
        ),
    ),
)

DEVOPS = Track(
    slug="devops",
    name="DevOps & Platform Engineering",
    description="From Linux basics to shipping and operating services: containers, CI/CD, infrastructure as code and observability.",
    levels=(
        Level(
            number=1,
            lessons=(
                Lesson(
                    title="Linux Command Line",
                    kind="practice",
                    instruction="Practice: navigate, search and edit files with ls, grep, find and sed, and pipe their output together.",
                    difficulty=1,
                ),
                Lesson(
                    title="Permissions and Users",
                    kind="reading",
                    instruction="Read: owner, group and mode bits. Fix a deploy directory that the service account cannot write to.",
                    difficulty=1,
                ),
            ),
        ),
        Level(
            number=2,
            lessons=(
                Lesson(
                    title="Git Branching and Pull Requests",
                    kind="practice",
                    instruction="Practice: create a feature branch, resolve a merge conflict and open a pull request with a clear description.",
                    difficulty=2,
                ),
                Lesson(
                    title="Writing a Dockerfile",
                    kind="practice",
                    instruction="Write: a Dockerfile for a small web app with a slim base image, a non-root user and a cached dependency layer.",
                    difficulty=2,
                ),
            ),
        ),
        Level(
            number=3,
            lessons=(
                Lesson(
                    title="CI Pipelines",
                    kind="project",
                    instruction="Build: a CI workflow that lints, tests and builds an image on every pull request.",
                    difficulty=3,
                ),
                Lesson(
                    title="Environment Configuration and Secrets",
                    kind="reading",
                    instruction="Read: separating config from code, and why secrets never belong in the repository or the image.",
                    difficulty=3,
                ),
            ),
        ),
        Level(
            number=4,
            lessons=(
                Lesson(
                    title="Infrastructure as Code",
                    kind="demo",
                    instruction="Run: plan and apply a small Terraform configuration, then read the plan diff before each change.",
                    difficulty=3,
                ),
                Lesson(
                    title="Deploying and Rolling Back",
                    kind="practice",
                    instruction="Practice: deploy a new version with a health check and roll back when the check fails.",
                    difficulty=4,
                ),
            ),
        ),
        Level(
            number=5,
            lessons=(
                Lesson(
                    title="Logs, Metrics and Alerts",
                    kind="project",
                    instruction="Build: instrument a service with structured logs and a latency metric, and write one alert with a clear threshold.",
                    difficulty=4,
                ),
                Lesson(
                    title="Incident Response",
                    kind="reading",
                    instruction="Read: severity levels, the on-call handoff and a blameless postmortem template.",
                    difficulty=4,
                ),
            ),
        ),
        Level(
            number=6,
            lessons=(
                Lesson(
                    title="Capstone: Platform Pipeline",
                    kind="project",
                    instruction="Final: a full pipeline that builds, tests, deploys to staging, promotes to production and rolls back on failed health checks.",
                    difficulty=5,
                ),
            ),
        ),
    ),
)


CATALOG = (
    HTML_CSS_JS,
    PYTHON,
    CPP,
    DATA,
    DEVOPS,
    OPERATING_SYSTEMS,
)


def all_courses() -> list:
    """Return the full beginner-to-professional course catalog."""
    return list(CATALOG)
