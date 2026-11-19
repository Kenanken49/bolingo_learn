/**
 * Track · Testing and Debugging — Course 11.
 *
 * The skill the roadmap lists and the catalog did not teach: deciding what a
 * test is worth, writing one that fails for the right reason, and working out
 * what is actually broken. Examples use the tools a mobile developer meets
 * (Jest or Vitest, React Testing Library, Playwright, pytest), but the
 * reasoning is what is being graded.
 */

import { BUILD, CODE, MATCH, MCQ, TEXT, type CourseLesson } from '../quizBank';

export const TRACK_TESTING: Record<string, CourseLesson> = {
  /* ---------------- Unit 1 · What a test is for ---------------- */

  'test-what-tests-do': {
    id: 'test-what-tests-do',
    title: 'What a test actually proves',
    theory: [
      'A test is an executable claim about behaviour: given this input, this output must follow. Its value is not that it passes — a test that passes once proves that once — but that it fails when the claim stops being true. A test nobody ever saw fail proves nothing.',
      'Tests have three parts, and naming them keeps them honest. Arrange builds the situation, Act performs the one behaviour under test, Assert states the expectation. More than one behaviour in the Act is a signal to split the test.',
      'A good test is fast, deterministic and specific. It fails with a message that points at the broken thing rather than at the test file. Flaky tests are worse than no tests because they train the team to rerun until green.',
      'Coverage measures which lines ran, not which behaviours are correct. A test that executes a function and asserts nothing raises the percentage and catches nothing, which is why the useful question is always what would this test catch, not how much did it cover.',
    ],
    questions: [
      MCQ(
        'What makes a test worth keeping?',
        'It fails when the behaviour it claims stops being true',
        [
          'It fails when the behaviour it claims stops being true',
          'It executes as many lines of the module as possible',
          'It was written before the feature was implemented',
          'It never needs to be changed again',
        ],
        'A test earns its place by being able to fail meaningfully. A test that cannot detect a regression is decoration, and a test that never fails when code breaks is deleted or fixed.'
      ),
      MCQ(
        'In Arrange-Act-Assert, what belongs in the Act step?',
        'The single behaviour you are testing, called once',
        [
          'The single behaviour you are testing, called once',
          'All the setup the test needs to run at all',
          'The expected value being compared against',
          'Every method on the object under test, in order',
        ],
        'One action per test keeps the failure message honest: when it breaks, you know which behaviour broke.'
      ),
      MCQ(
        'A pull request adds code and the coverage number rises, yet the new branch is untested. What does coverage miss here?',
        'It records that lines ran, not that their results were checked',
        [
          'It records that lines ran, not that their results were checked',
          'It records only files that were changed in the pull request',
          'It records the runtime of each test instead of its assertions',
          'It records branch names instead of commit ids',
        ],
        'Line coverage is a proxy. Assertion coverage is the real goal, which is why mutation testing and code review both beat a percentage.'
      ),
      MATCH(
        'Pair each testing term with what it means',
        [
          { left: 'Arrange', right: 'Build the situation the behaviour needs' },
          { left: 'Act', right: 'Call the one behaviour under test' },
          { left: 'Assert', right: 'State what must be true afterwards' },
          { left: 'Flaky test', right: 'One that sometimes fails without a code change' },
          { left: 'Regression test', right: 'A test added to pin a bug that was fixed' },
        ],
        'The vocabulary of a test file maps to three steps and two hazards. Naming the hazards is how a team keeps its suite trustworthy.'
      ),
      TEXT(
        'A test asserts that a formatted price still shows two decimals. In one short sentence, say what would this test catch.',
        ['It catches a change that drops or rounds the decimals'],
        'That sentence is the test value. If you cannot state what a test would catch, the test is either redundant or not written yet.'
      ),
    ],
  },

  'test-pyramid': {
    id: 'test-pyramid',
    title: 'Unit, integration, end-to-end',
    theory: [
      'Tests differ by how much of the real system they involve. A unit test exercises one function or class in isolation and runs in milliseconds. An integration test wires two or more real pieces together, such as a handler against a real database. An end-to-end test drives the app through a real interface: a browser with Playwright, or on-device UI tests for a mobile app.',
      'The shape to aim for is a pyramid: many fast unit tests, fewer integration tests, and a small number of end-to-end tests that cover the journeys the business cannot live without. The inverse pyramid, a handful of unit tests under a mountain of slow UI tests, is the most common failure mode in real teams.',
      'Cost rises with scope. End-to-end tests are slow, brittle to irrelevant changes, and hard to diagnose, so they earn their cost by covering flows where the integration itself is the risk: sign in, checkout, and the first screen after launch.',
      'For an Expo app, the same split applies: pure logic in the lib folder is unit-testable with no device, screens are tested with a component renderer, and the real device build is reserved for the handful of flows that only a device can answer.',
    ],
    questions: [
      MCQ(
        'Which test type should the largest share of the suite use?',
        'Unit tests, because they are fast and point straight at the failing module',
        [
          'Unit tests, because they are fast and point straight at the failing module',
          'End-to-end tests, because they are closest to the user',
          'Integration tests, because they need no mocking at all',
          'Manual exploratory tests, because they need no tooling',
        ],
        'The pyramid is about diagnosis and speed as much as count. A unit failure names one file; an e2e failure names a stack of possibilities.'
      ),
      MCQ(
        'A signup flow works in unit tests but fails when the API and database run together. What does that prove?',
        'Some risks live in the wiring, so integration tests are the right tool for them',
        [
          'Some risks live in the wiring, so integration tests are the right tool for them',
          'The unit tests should be deleted as useless',
          'The flow needs more unit tests covering each function',
          'End-to-end tests are the only valid tests for APIs',
        ],
        'Unit tests isolate behaviour; integration tests isolate composition. Both are needed, and the failure tells you which layer was missing.'
      ),
      MCQ(
        'Why does a team avoid adding a Playwright test for every visual detail?',
        'End-to-end tests are slow and brittle, so they belong to critical journeys only',
        [
          'End-to-end tests are slow and brittle, so they belong to critical journeys only',
          'Browser tools cannot inspect layout at all',
          'Visual details cannot be automated under any circumstances',
          'End-to-end tests cannot reach a staging environment',
        ],
        'A suite that takes forty minutes gets run less and debugged never. Keep the wide layer cheap, and spend the expensive layer carefully.'
      ),
      MATCH(
        'Pair each subject with the test layer that fits it best',
        [
          { left: 'A discount calculation function', right: 'Unit test with table-driven cases' },
          { left: 'Handler writing to the real database', right: 'Integration test against a test database' },
          { left: 'First-run onboarding on a phone', right: 'End-to-end test on a device or emulator' },
          { left: 'Two components sharing state through a store', right: 'Integration test rendering both together' },
          { left: 'A pure date formatter with edge cases', right: 'Parameterised unit test over many inputs' },
        ],
        'Match the layer to where the risk lives. Logic risk is cheap to test, wiring risk needs real pieces, and device risk needs a device.'
      ),
    ],
  },

  'test-workshop-first': {
    id: 'test-workshop-first',
    title: 'Paper workshop: write the failing test first',
    theory: [
      'Test-first works as a design tool before it works as a check. Writing the test first forces you to state the interface you want, and if the test is awkward to write, the interface is awkward. The cycle is red, green, refactor: watch it fail for the expected reason, make it pass with the simplest code, then improve the shape without changing behaviour.',
      'In Jest or Vitest the shape is describe plus test with an expect assertion; in pytest a plain function named test_ plus an assert statement. Writing the assertion in words before the code is what keeps the test about behaviour rather than about implementation.',
      'Before writing any test, decide three things: what behaviour is claimed, what the input boundary cases are, and what would make this test fail. Those three answers become the test name, the extra cases, and the assertion itself.',
    ],
    questions: [
      MCQ(
        'You wrote the test first and it fails with a missing function. What did that failure tell you?',
        'The claim is real and the interface you want does not exist yet',
        [
          'The claim is real and the interface you want does not exist yet',
          'The test is wrong and should be relaxed',
          'The test should be rewritten after the code',
          'The assertion needs a looser comparison',
        ],
        'A red test that fails for exactly the reason you expected is the proof that the test can detect the missing behaviour.'
      ),
      MCQ(
        'Which comparison is the assertion that best pins behaviour here?',
        'expect(formatPrice(10)).toBe(\"10.00\") — exact, and it will catch a rounding change',
        [
          'expect(formatPrice(10)).toBe(\"10.00\") — exact, and it will catch a rounding change',
          'expect(typeof result).toBe(\"string\") so the test never breaks',
          'expect(result).toBeTruthy() to keep the test cheap',
          'expect(formatPrice).toHaveBeenCalled() to prove the function ran',
        ],
        'Assertions on concrete values detect regressions. Existence and truthiness assertions mostly detect that a call happened, which is a weaker claim.'
      ),
      TEXT(
        'Give the three boundary inputs worth adding to a test for formatPrice. List them separated by commas.',
        ['zero, negative, very large', '0, negative, large', 'zero, negative amount, large number'],
        'Boundary cases are where implementations break: nothing, the wrong sign, and numbers big enough to change formatting or precision.'
      ),
      MATCH(
        'Pair each step of the red-green-refactor cycle with its rule',
        [
          { left: 'Red', right: 'Fail for exactly the reason you predicted' },
          { left: 'Green', right: 'Write the simplest code that passes' },
          { left: 'Refactor', right: 'Improve structure while the test keeps passing' },
          { left: 'After refactor', right: 'Rerun the suite and confirm nothing changed' },
        ],
        'The discipline is the order. Writing code first and adding a test afterwards usually tests what the code happens to do.'
      ),
    ],
  },

  'test-quiz-1': {
    id: 'test-quiz-1',
    title: 'Checkpoint: tests that carry weight',
    theory: [
      'This checkpoint covers what a test proves, how to choose its layer, and the cycle that keeps it honest. Every item restates something from the first unit or its workshop.',
      'Say the answers out loud before scrolling: the point is to be able to name the reason a test exists, not to recognise the words.',
    ],
    questions: [
      MCQ(
        'A colleague adds an assertion that only checks a value is truthy. What is the risk?',
        'It passes for many wrong values, so real regressions slip through',
        [
          'It passes for many wrong values, so real regressions slip through',
          'It runs too slowly for a unit test',
          'It cannot be run without a browser',
          'It makes the coverage number drop',
        ],
        'Weak assertions are the most common reason a suite stays green through a breaking change. Compare the value, not its existence.'
      ),
      MCQ(
        'What is the strongest practical signal that a test is valuable?',
        'Someone made it fail on purpose once and the message identified the cause',
        [
          'Someone made it fail on purpose once and the message identified the cause',
          'It has been in the repository for more than a year',
          'It was generated automatically from the interface',
          'It appears in the highest line-coverage percentage',
        ],
        'Deliberately breaking the code, or mutation testing, is how you learn whether a test guards anything. A green test nobody broke is unproven.'
      ),
      MCQ(
        'The suite is slow because most tests boot a browser. Which shape should the team move toward?',
        'A pyramid: many unit tests, fewer integration tests, a small end-to-end layer',
        [
          'A pyramid: many unit tests, fewer integration tests, a small end-to-end layer',
          'An hourglass: mostly end-to-end with a few smoke checks',
          'A flat layer of identical end-to-end tests',
          'A single test that runs every flow in order',
        ],
        'Cost rises with scope, so breadth belongs at the cheap layer and depth belongs at the expensive one.'
      ),
      MATCH(
        'Pair each sentence with the test-writing habit it describes',
        [
          { left: 'One behaviour per test', right: 'Act step calls a single thing' },
          { left: 'Name the failure you predict', right: 'Writing the test before the code' },
          { left: 'Compare exact values', right: 'Avoiding truthiness-only assertions' },
          { left: 'Rerun after cleanup', right: 'Refactoring behind a passing test' },
          { left: 'Delete the useless test', right: 'Keeping the suite trustworthy' },
        ],
        'The habits are the gradeable part. Every one of them exists to keep a failure message useful.'
      ),
      TEXT(
        'In at most twelve words, state the rule about tests nobody has ever seen fail.',
        ['A test never seen failing proves nothing'],
        'If a test has never been red, you do not know whether it can detect anything. Make it fail on purpose once.'
      ),
      TEXT(
        'Which layer would you add for a bug where the API returns the right data but the screen ignores it? Type the layer name.',
        ['integration test', 'integration', 'an integration test'],
        'Both halves work alone, so the fault is in the wiring — exactly what an integration test is for.'
      ),
    ],
  },

  /* ---------------- Unit 2 · Doubles, and finding the real cause ---------------- */

  'test-doubles': {
    id: 'test-doubles',
    title: 'Mocks, stubs, and what not to fake',
    theory: [
      'A test double stands in for a real collaborator so the unit under test can run alone. A stub returns canned data. A spy records the calls that were made. A mock asserts that particular calls happened. They solve different problems, and using a mock when a stub was enough is what turns refactoring into test rewriting.',
      'Replace the thing you cannot control in this test: the clock, the network, the payment provider, the database in a pure unit test. Keep the thing whose behaviour is the claim: if the test is about how your code handles a timeout, the timeout is real logic, and the clock that produces it is what you fake.',
      'Faking an interface you do not own is a bet that your understanding of it is correct. When the real service changes shape, the double keeps passing and production breaks. Contracts, recorded fixtures, and one thin integration test per external service pay that bet back.',
      'Do not mock the unit under test, and do not mock values that are simply data. A test that asserts the mock was called twice with a specific object often survives a behavior-preserving refactor only by being edited, which is the sign that it tests implementation rather than outcome.',
    ],
    questions: [
      MCQ(
        'You test a retry policy against a flaky HTTP client. What is the right double?',
        'Fake the transport so it fails in a controlled pattern, and keep the retry logic real',
        [
          'Fake the transport so it fails in a controlled pattern, and keep the retry logic real',
          'Mock the retry function itself so it can be counted',
          'Stub the whole module under test to return the expected result',
          'Use the real transport and hope it fails during the run',
        ],
        'The claim is about retry behaviour, so that logic must run for real. Only the outside world is doubled.'
      ),
      MCQ(
        'What is the main difference between a stub and a mock?',
        'A stub supplies canned answers; a mock asserts which calls were made',
        [
          'A stub supplies canned answers; a mock asserts which calls were made',
          'A stub is slower because it does real work',
          'A mock replaces a database while a stub replaces a file',
          'They are the same object with different names in every tool',
        ],
        'State verification uses stubs and checks the result. Interaction verification uses mocks and checks the calls, which is more coupled to implementation.'
      ),
      MCQ(
        'A mocked external API kept passing after the real service renamed a field. What was missing?',
        'A contract or integration check against the real service',
        [
          'A contract or integration check against the real service',
          'A second mock covering the same response shape',
          'More unit tests around the field name in isolation',
          'Higher coverage on the module that parses responses',
        ],
        'A double encodes your belief about the world. Only contact with the real thing can correct that belief.'
      ),
      MATCH(
        'Pair each double with the job it is for',
        [
          { left: 'Stub', right: 'Return canned data so the path runs' },
          { left: 'Spy', right: 'Record calls while the real behaviour runs' },
          { left: 'Mock', right: 'Assert that specific interactions happened' },
          { left: 'Fake', right: 'A working substitute, like an in-memory store' },
          { left: 'Fixture', right: 'A recorded real response kept in a file' },
        ],
        'Four doubles, four different costs. The fake and the fixture buy the most realism; the mock buys the most coupling.'
      ),
      TEXT(
        'Name one thing you should never mock in a test, in a few words.',
        ['the code under test', 'the unit under test', 'the thing being tested', 'your own logic'],
        'Doubling the subject of the claim makes the test assert that a substitute did what you told it to. The subject always runs for real.'
      ),
    ],
  },

  'test-debugging': {
    id: 'test-debugging',
    title: 'Finding the real cause',
    theory: [
      'Debugging is a search, so the first move is to make the failure happen on purpose, every time, with the smallest input that still breaks. A bug you can reproduce is half fixed; a bug you cannot reproduce is a guess waiting to be wrong.',
      'Then locate the boundary: is the value correct at the point it enters the function and wrong at the point it leaves, or was it wrong before it arrived? Read a stack trace from the top frame down, because the top frame is where the exception was raised, not necessarily where the mistake was made. Binary search the pipeline — check the midpoint and throw away half the possibilities.',
      'Change one variable at a time and write down what you did. Two changes at once destroy the evidence about which one mattered. Version control is a debugging tool for the same reason: git bisect on the commit history is often faster than reasoning about the code.',
      'A fix that makes the symptom disappear without explaining why is a coin flip. The test that goes with a real fix is the one that fails before the change and passes after it, for the reason you now understand. When you are truly stuck, explain the code out loud to anything that will listen — a colleague, a rubber duck, or the notes file — because describing it forces the assumptions into words.',
    ],
    questions: [
      MCQ(
        'What is the first thing to establish when a bug report arrives?',
        'A reliable reproduction with the smallest input that still fails',
        [
          'A reliable reproduction with the smallest input that still fails',
          'Which file is most likely to contain the mistake',
          'How many users are affected by the symptom',
          'Whether the reporter cleared their cache already',
        ],
        'Reproduction turns a story into a fact and gives the fix a pass condition. Everything after it is a search over a space you can measure.'
      ),
      MCQ(
        'Reading a stack trace, which frame deserves attention first?',
        'The top frame shows where it broke, but the first frame in your own code is where to start looking',
        [
          'The top frame shows where it broke, but the first frame in your own code is where to start looking',
          'Only the bottom frame, because it is the entry point',
          'Only frames that mention the word error in their name',
          'The frame with the largest number of arguments',
        ],
        'Library frames show the crash site. Your frames show the decision that produced it, so start at the nearest one and step outward.'
      ),
      MCQ(
        'Two changes were made at once and the bug disappeared. What is the cost?',
        'You no longer know which change mattered, so you cannot explain the fix',
        [
          'You no longer know which change mattered, so you cannot explain the fix',
          'The test suite now needs to be rewritten entirely',
          'Git can no longer record the two edits separately',
          'The reproduction stopped being deterministic forever',
        ],
        'Unexplained fixes regress, because nobody knows what condition they depend on. One variable at a time keeps the evidence intact.'
      ),
      MATCH(
        'Pair each debugging move with what it buys you',
        [
          { left: 'Minimal reproduction', right: 'A pass condition and a smaller search space' },
          { left: 'Print or breakpoint at the midpoint', right: 'Half the possibilities eliminated per check' },
          { left: 'git bisect', right: 'The commit that introduced the failure' },
          { left: 'Compare a working case', right: 'The difference that explains the broken one' },
          { left: 'Explain it out loud', right: 'Hidden assumptions stated as sentences' },
        ],
        'Every good move either shrinks the search space or makes an assumption testable. Guessing does neither.'
      ),
      TEXT(
        'You want to find which commit introduced a regression across 600 commits, with a test that reproduces it. Type the command to start the search.',
        ['git bisect start', 'git bisect'],
        'git bisect start with a known bad commit, then mark an old commit good and run the test at each midpoint until the culprit is isolated.'
      ),
    ],
  },

  'test-workshop-debug': {
    id: 'test-workshop-debug',
    title: 'Paper workshop: from report to regression test',
    theory: [
      'The report: on Android only, an offline session that lasted more than an hour loses its saved notes on the next launch. That is a real bug report — vague, conditional, and reproducible for somebody. The workshop walks the whole path from that sentence to a merged fix.',
      'The order that works is: restate the report as a claim, reduce it until only the parts that matter remain, write the test that expresses the reduced claim, watch it fail, then fix the code. The test written from the reproduction becomes the regression test for free.',
      'When the fix is in, name the assumption that broke. That sentence belongs in the commit message and, if the logic is subtle, in a comment beside the change — because the next person to touch it needs the reason more than the code.',
    ],
    questions: [
      TEXT(
        'Reduce the report: keep only the parts the bug depends on. Write the reduced claim in at most fifteen words.',
        ['offline session over an hour loses saved notes'],
        'Reduction removes everything that is not load-bearing: the platform, the app version, the user. What remains is a test you can write.'
      ),
      MATCH(
        'Put the steps of the workshop in the order they should happen',
        [
          { left: 'Reproduce it deliberately', right: 'Step one, before touching any code' },
          { left: 'Write the failing test', right: 'Step two, from the reduced claim' },
          { left: 'Find the boundary', right: 'Step three, observe at the midpoint' },
          { left: 'Fix the code', right: 'Step four, the smallest change that passes' },
          { left: 'Record the assumption', right: 'Step five, in the message and comment' },
        ],
        'The order is the method. Reproduce, then test, then locate, then fix, then write down what you learned.'
      ),
      MCQ(
        'The reduced claim involves a timer that only fires while the app is backgrounded. Where is the test most cheaply written?',
        'As a unit test over the session store with the clock faked to jump forward',
        [
          'As a unit test over the session store with the clock faked to jump forward',
          'As an on-device end-to-end test waiting one real hour',
          'As a snapshot test of the notes screen when it renders',
          'As a coverage rule requiring the store to be executed',
        ],
        'Time is exactly the collaborator you fake. The behaviour under test is what the store does when the clock says an hour passed.'
      ),
      TEXT(
        'The fix checks that a backgrounded session keeps its buffer when it exceeds the expiry. Write the assertion sentence for the test, in at most twelve words.',
        ['the saved notes survive session expiry'],
        'An assertion sentence names the outcome, not the call. It is what lets a reviewer see the claim without reading the setup.'
      ),
    ],
  },

  'test-quiz-2': {
    id: 'test-quiz-2',
    title: 'Checkpoint: doubles and diagnosis',
    theory: [
      'This checkpoint covers what to replace and how to search: the kinds of test double, the cost of each, and the moves that turn a bug report into a located cause.',
      'Answer in your own words first, then check the wording against the two lessons in this unit.',
    ],
    questions: [
      MCQ(
        'Which double records the calls made to it while the real implementation still runs?',
        'A spy',
        ['A spy', 'A stub', 'A fixture', 'A fake'],
        'A spy wraps the real thing and logs interactions. A stub answers with canned data instead of doing any work.'
      ),
      MCQ(
        'An in-memory database used in place of the real one is best called a',
        'Fake, because it genuinely implements the behaviour at a smaller scale',
        ['Fake, because it genuinely implements the behaviour at a smaller scale', 'Stub, because it returns canned rows', 'Mock, because it records queries', 'Fixture, because it lives in a file'],
        'A fake is a working substitute with real logic. That is what makes it good for integration tests and bad for isolating one function.'
      ),
      MCQ(
        'Why is a bug that cannot be reproduced so expensive to fix?',
        'There is no pass condition, so every change is a guess to be retested',
        [
          'There is no pass condition, so every change is a guess to be retested',
          'It can never appear in the issue tracker with enough detail',
          'It cannot be bisected because Git has no record of it',
          'It always lies in code that nobody is allowed to modify',
        ],
        'Reproduction is what converts a symptom into a measurable condition. Without it, the fix is verified only by hope.'
      ),
      MATCH(
        'Pair each diagnosis technique with its failure mode',
        [
          { left: 'Binary search the pipeline', right: 'Stops working if the midpoint is not observable' },
          { left: 'git bisect', right: 'Needs a test that fails the same way each run' },
          { left: 'Compare working and broken cases', right: 'Misleads when several differences exist at once' },
          { left: 'Print statements', right: 'Answers the wrong question when scattered too widely' },
          { left: 'Rubber duck explanation', right: 'Only works if you say the assumptions out loud' },
        ],
        'Every technique has a condition where it stops helping. Knowing that condition is what tells you when to switch.'
      ),
      TEXT(
        'A teammate says the test passed because the mock was called. What weaker claim did they actually verify? Answer in a few words.',
        ['that a call happened, not that the result is right', 'only that the function was called', 'that it was called'],
        'Interaction checks prove a call occurred. Outcome checks prove the world is correct afterwards, which is usually the claim you meant.'
      ),
      TEXT(
        'Type the command that tells Git which commit introduced a failing test, once you have already started the search and marked the bounds.',
        ['git bisect run', 'git bisect run npm test', 'git bisect run npx jest'],
        'git bisect run plus the test command automates the midpoint check across the whole range, which is why a deterministic test is worth writing first.'
      ),
    ],
  },

  'test-final': {
    id: 'test-final',
    title: 'Testing and debugging final',
    theory: [
      'The final exam covers both units: what a test proves, which layer proves it, what to double, and how to find a cause that explains the symptom.',
      'Items restate the lessons and the two workshops. Where you hesitate, the explanation names the unit to revisit.',
    ],
    questions: [
      MCQ(
        'Which suite is the most trustworthy?',
        'One whose tests have each been seen to fail for a known reason',
        [
          'One whose tests have each been seen to fail for a known reason',
          'One that reports the highest line coverage of any package',
          'One that runs only in continuous integration, never locally',
          'One where every test mocks its subject to stay fast',
        ],
        'Trust comes from demonstrated sensitivity. Coverage, CI-only execution, and mocked subjects can all hide tests that detect nothing.'
      ),
      MCQ(
        'The behaviour is a login screen that must show an error for a wrong password. Which layer gives the most direct evidence?',
        'An integration test rendering the screen against a faked auth service',
        [
          'An integration test rendering the screen against a faked auth service',
          'A unit test of the password hashing helper alone',
          'A coverage report on the screens directory',
          'A mock verifying that the login function was called once',
        ],
        'The claim spans a component and its collaborator, so the test must include both — with the outside service, not the subject, faked.'
      ),
      MCQ(
        'After a refactor, an old test fails only because it asserted on an internal helper name. What was wrong with it?',
        'It pinned implementation details rather than observable outcomes',
        [
          'It pinned implementation details rather than observable outcomes',
          'It asserted on a concrete returned value',
          'It ran the real collaborator instead of a double',
          'It was written before the production code existed',
        ],
        'Tests coupled to internals break under behaviour-preserving changes, which teaches the team to delete tests rather than read them.'
      ),
      MATCH(
        'Pair each decision with the rule that settles it',
        [
          { left: 'Which layer to write', right: 'Where the risk lives, not what is easy' },
          { left: 'What to fake', right: 'Collaborators outside the claim' },
          { left: 'What to assert', right: 'The outcome, in a sentence, before the code' },
          { left: 'When to delete a test', right: 'It guards nothing and slows everyone' },
          { left: 'When to add a regression test', right: 'After any bug you could not already catch' },
        ],
        'Five decisions, five rules. Each one is worth being able to say out loud without looking at a file.'
      ),
      TEXT(
        'State the red-green-refactor rule about the first failure, in at most twelve words.',
        ['fail first for the reason you predicted', 'make it fail for the expected reason'],
        'A predicted failure proves the test can see the missing behaviour. An unexpected error message means the test itself needs fixing first.'
      ),
      TEXT(
        'A flaky test fails one run in twenty. Give the best first action, in a few words.',
        ['reproduce it deliberately to find the cause', 'find the nondeterminism', 'isolate the cause of the flake'],
        'Deleting or retrying a flaky test hides the signal. Real causes are usually shared state, a real clock, or an unawaited promise.'
      ),
      MATCH(
        'Pair each debugging step with the evidence it produces',
        [
          { left: 'Smallest reproduction', right: 'A pass condition for the fix' },
          { left: 'Observation at the midpoint', right: 'Half of the possible causes removed' },
          { left: 'Working versus broken comparison', right: 'The single difference that matters' },
          { left: 'Bisected commit range', right: 'The change that introduced the failure' },
          { left: 'Written note of each attempt', right: 'A search that can be resumed and trusted' },
        ],
        'The final exam is really this: name the technique and say what it proves. A method that produces no evidence is wandering.'
      ),
    ],
  },

  /* ---------------- Labs that run in this build ---------------- */

  'test-lab-boundary': {
    id: 'test-lab-boundary',
    title: 'Lab: the boundary that breaks it',
    theory: [
      'Most production bugs live at the edges of a range: zero items, exactly one page, the last element, the empty string. A suite that only checks the comfortable middle case is decoration, which is why a review question as short as “what happens at zero?” catches defects long before a user does.',
      'Boundary-value analysis means one assertion for each side of every edge you can name — below it, exactly on it, and one past it. When you inherit a function you did not write, call it in that order: the boring case first, then empty, then one too many. The second call is usually the one that fails.',
      'This lab runs in the sandbox, so the red or green you see is real. The starter fails the empty-catalogue test because Math.ceil(0 / 10) is 0, and a store with no products still has one page to render: its empty state. Fix the implementation, never the assertion — a test you weakened to go green has stopped reporting the truth.',
    ],
    questions: [
      CODE(
        'Make every test pass by fixing pageCount(totalItems, perPage), the number of pages needed to show a catalogue. Keep the assertions as they are: they are the specification.',
        {
          language: 'js',
          starter:
            '// Fix pageCount so all five tests pass. Do not edit the tests.\nfunction pageCount(totalItems, perPage) {\n  return Math.ceil(totalItems / perPage);\n}\n',
          tests: [
            {
              id: 'empty',
              label: 'an empty catalogue still has one page',
              run: 'pageCount(0, 10) === 1',
              hint: 'Math.ceil(0 / 10) is 0. A page of “no results” is still a page, so the floor here is 1.',
            },
            {
              id: 'partial',
              label: 'three items on a ten-item page fit on one page',
              run: 'pageCount(3, 10) === 1',
              hint: 'Rounding up a fraction below 1 gives 1, which is already correct for this case.',
            },
            {
              id: 'exact',
              label: 'twenty items fill exactly two pages',
              run: 'pageCount(20, 10) === 2',
              hint: 'An exact multiple must not create a phantom third page — that is what ceil gets right.',
            },
            {
              id: 'over',
              label: 'twenty-one items need a third page',
              run: 'pageCount(21, 10) === 3',
              hint: 'One item past a full page opens a new page; ceil handles it.',
            },
            {
              id: 'single-item-page',
              label: 'one item with a page size of one is one page',
              run: 'pageCount(1, 1) === 1',
              hint: 'The smallest legal input: one item, one page, no rounding surprises.',
            },
          ],
        },
        'function pageCount(totalItems, perPage) {\n  return Math.max(1, Math.ceil(totalItems / perPage));\n}',
        'Math.ceil does the division; Math.max(1, …) supplies the edge the original author missed. Two behaviours, one line, and every boundary assertion now holds.'
      ),
      MCQ(
        'A teammate “fixes” the failing empty-catalogue test by changing it to expect 0 pages. What did the suite just do?',
        'It stopped asserting the product rule, so the empty screen can crash again unnoticed',
        [
          'It stopped asserting the product rule, so the empty screen can crash again unnoticed',
          'It improved, because tests should match the implementation',
          'Nothing: the number of pages is a display detail',
          'It made the suite faster, which is what flaky tests need',
        ],
        'A test encodes a decision. Changing the expectation to match broken code deletes the decision, and the next reader of that test will trust a lie.'
      ),
      TEXT(
        'Name the boundary case missing from a suite that tests a login lockout at “3 wrong attempts” with 1 and 5 attempts. Type the number of attempts the missing case uses.',
        ['3', 'three', 'exactly 3', 'exactly three', 'at 3'],
        'Testing 1 and 5 skips the rule itself. The boundary is exactly 3: the attempt at which the account locks, where off-by-one errors live.',
        { placeholder: 'number of attempts' }
      ),
      MATCH(
        'Pair each edge case with the kind of defect it usually exposes',
        [
          { left: 'Zero items', right: 'Empty state never rendered, or a divide-by-zero' },
          { left: 'Exactly one page of items', right: 'An off-by-one that invents a blank final page' },
          { left: 'One item past the limit', right: 'A rounding or fencepost error at the boundary' },
          { left: 'The largest input', right: 'An overflow, a timeout, or a memory cliff' },
        ],
        'Every edge fails in its own characteristic way. Naming the edge you are aiming at tells you what defect you are hunting.'
      ),
      MCQ(
        'Why is Math.ceil(totalItems / perPage) alone the wrong model for page count?',
        'It returns 0 for an empty list, but a store with no products still shows one empty page',
        [
          'It returns 0 for an empty list, but a store with no products still shows one empty page',
          'It rounds the exact-multiple case up by one',
          'It cannot handle a page size larger than the item count',
          'It is slower than a loop over the items',
        ],
        'ceil is right for every non-zero input. The bug is the missing floor at one page, which only the zero-item case reveals.'
      ),
    ],
  },

  'test-lab-regression': {
    id: 'test-lab-regression',
    title: 'Lab: pin the bug with a failing test',
    theory: [
      'A bug report is a hypothesis; a failing test is evidence. Write the test first, watch it fail for exactly the reason the report describes, and you have both a reproduction and a permanent guard — the fix is not finished when the symptom disappears, it is finished when a test would catch the symptom returning.',
      'Money is the classic regression. A binary float cannot hold 0.1 + 0.2 exactly, and 19.99 times 100 comes back as 1998.9999999999998, so multiplying a parsed price by 100 can land a fraction of a cent short. Store integer cents, or round deliberately at the boundary, and never let a float reach a database or a ledger.',
      'In this lab the sandbox runs your code against a regression suite: strip the currency symbol and thousands separators, then return whole cents. Four of the five tests fail on the starter — three from separators and one from floating point — which is why the suite has five tests rather than one.',
    ],
    questions: [
      CODE(
        'parsePrice(text) must return the price in whole cents. Make the suite pass: handle the currency symbol, the thousands separator, and floating-point rounding.',
        {
          language: 'js',
          starter:
            '// The report: “£5.00 shows as NaN in the cart”. Fix parsePrice.\nfunction parsePrice(text) {\n  return Number(text.replace(\'$\', \'\')) * 100;\n}\n',
          tests: [
            {
              id: 'plain',
              label: 'a price of $19.99 becomes 1999 cents',
              run: "parsePrice('$19.99') === 1999",
              hint: '19.99 multiplied by 100 in a float gives 1998.9999999999998; round the product, do not truncate it.',
            },
            {
              id: 'grouped',
              label: 'a thousands separator does not break the parse',
              run: "parsePrice('$1,234.50') === 123450",
              hint: 'Number("1,234.50") is NaN — the comma has to go before the conversion.',
            },
            {
              id: 'other-symbol',
              label: 'any currency symbol is stripped, not just $',
              run: "parsePrice('£5.00') === 500",
              hint: 'Replacing only the dollar sign leaves £5.00 unparseable. Strip everything that is not a digit or a point.',
            },
            {
              id: 'round-number',
              label: 'a price with no decimals still becomes cents',
              run: "parsePrice('$12.00') === 1200",
              hint: 'This one is the sanity check: whole numbers should already work once the symbols are gone.',
            },
            {
              id: 'large',
              label: 'a large grouped price keeps full precision',
              run: "parsePrice('$1,000.00') === 100000",
              hint: 'Grouping plus a whole unit: strip non-numeric characters first, then round the scaled value.',
            },
          ],
        },
        'function parsePrice(text) {\n  const digits = String(text).replace(/[^0-9.]/g, \'\');\n  return Math.round(Number(digits) * 100);\n}',
        'Two decisions, both forced by a failing test: normalise the string to digits and a point, then round after scaling. Math.round turns 1998.9999999999998 back into 1999 cents.'
      ),
      BUILD(
        'Put the debug loop in the order this course teaches it.',
        ['Reproduce the failure', 'Reduce it to the smallest case', 'Name the boundary it crossed', 'Fix the cause', 'Keep the test as a regression guard'],
        [
          'Reproduce the failure',
          'Reduce it to the smallest case',
          'Name the boundary it crossed',
          'Fix the cause',
          'Keep the test as a regression guard',
          'Ship the fix and close the ticket',
          'Rewrite the module from scratch',
        ],
        'Evidence first, change last. Fixing before you can reproduce means you cannot prove the fix, and closing without the test means the bug is free to return.'
      ),
      MCQ(
        'Why does the suite test both $1,234.50 and $19.99 rather than one representative price?',
        'They fail for different causes, so one test cannot prove the other is fixed',
        [
          'They fail for different causes, so one test cannot prove the other is fixed',
          'Two tests run faster than one long test',
          'The formatter needs both for rounding rules',
          'It is convention to have at least three cases per function',
        ],
        'The comma exposes a parsing defect; 19.99 exposes a floating-point one. A suite of cases that all fail for the same reason is one test written five times.'
      ),
      MCQ(
        'The report says “the cart total is wrong on Safari”. Which response makes the bug findable?',
        'A failing test that reproduces it on any machine, checked into the suite',
        [
          'A failing test that reproduces it on any machine, checked into the suite',
          'Waiting for a user to send a screenshot of the wrong total',
          'Adding a try/catch so the wrong number is not displayed',
          'Assuming a browser quirk and shipping a Safari-only patch',
        ],
        '“Works on my machine” is a missing reproduction. Once the failure exists as a test, every machine in the world agrees on whether it is fixed.'
      ),
      MATCH(
        'Pair each kind of test failure with the most likely cause',
        [
          { left: 'NaN where a number was expected', right: 'Unparsed formatting: a symbol, comma, or space' },
          { left: '1998.9999999999998 instead of 1999', right: 'Binary float arithmetic on money' },
          { left: 'Passes alone, fails in the full suite', right: 'Shared state leaking between tests' },
          { left: 'Fails on Monday, passes on Tuesday', right: 'A dependency on the clock or the network' },
        ],
        'The shape of a failure is a diagnosis. Learn to read the difference between a parsing bug, an arithmetic bug, and a test-harness bug.'
      ),
      TEXT(
        'You are about to fix the £5.00 defect. What must exist in the repository before you write the fix, in as few words as you can?',
        ['a failing test', 'failing test', 'a test that fails', 'test that fails', 'a regression test', 'regression test', 'a reproduction test', 'reproduction test'],
        'The failing test is the definition of done for the reproduction: it proves the bug, survives the fix, and stops the bug coming back.',
        { placeholder: 'what exists before the fix?' }
      ),
    ],
  },
};

