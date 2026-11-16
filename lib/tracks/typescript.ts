/**
 * Track · TypeScript and Type Systems — Course 12.
 *
 * Types as a specification language: what to annotate, how to narrow, when a
 * generic is the honest tool, and how the compiler config decides how much of
 * the codebase it actually checks. Examples are TypeScript 5.x and match the
 * way this project runs `npx tsc --noEmit`.
 */

import { MATCH, MCQ, TEXT, type CourseLesson } from '../quizBank';

export const TRACK_TYPESCRIPT: Record<string, CourseLesson> = {
  /* ---------------- Unit 1 · Types describe shapes ---------------- */

  'ts-annotations': {
    id: 'ts-annotations',
    title: 'Annotations, inference, and structure',
    theory: [
      'TypeScript adds types to JavaScript and removes them again before running: nothing is checked at runtime that the compiler did not already know. The types are a contract between the code and the people reading it, enforced by a build step rather than by the engine.',
      'Annotation is optional in most places because inference is good. Let the compiler derive the type of a literal or a returned expression, and annotate the boundaries: function parameters, exported values, and anything that comes from outside the language, such as JSON, a network response, or environment configuration.',
      'TypeScript is structurally typed. A value is assignable to a type if it has the members that type requires, so an object with the right fields satisfies a declared shape without naming it. That is why a function expecting a shape can accept an object literal, a class instance, or a mapped result.',
      'A type alias names a type; an interface can also be extended and merged. Either works for plain object shapes, so the useful distinction is intent: interface for a contract that others implement or extend, alias for unions, tuples and helpers. Literal types and string unions are usually the cleanest way to model a closed set of states.',
    ],
    questions: [
      MCQ(
        'What does TypeScript check while your app runs?',
        'Nothing — types are erased before the code executes',
        [
          'Nothing — types are erased before the code executes',
          'Every annotation, on each assignment at runtime',
          'Only the types declared with interface, not with alias',
          'Only values that came from a network response',
        ],
        'The compiler is a build-time tool, so runtime validation of external data needs real checks in code. That is why boundary typing matters.'
      ),
      MCQ(
        'Where do annotations pay for themselves most reliably?',
        'At boundaries: parameters, exports, and data from outside the language',
        [
          'At boundaries: parameters, exports, and data from outside the language',
          'On every local variable inside every function body',
          'On every literal passed as an argument to a helper',
          'Only on values that a class defines as private',
        ],
        'Annotating locals the compiler already infers adds noise. Missing boundary types let wrong shapes travel far before anything complains.'
      ),
      MCQ(
        'A function expects a shape with a title and a body. An object with those two fields is accepted even though it never mentions the type name. Why?',
        'TypeScript checks structure, so a matching shape satisfies the declared type',
        [
          'TypeScript checks structure, so a matching shape satisfies the declared type',
          'Because interfaces are erased from the build output entirely',
          'Because the object literal was widened to any implicitly',
          'Because structural checks apply only to exported types',
        ],
        'Structural typing means assignability is about members, not names. It is why mapped data flows into component props cleanly.'
      ),
      MATCH(
        'Pair each TypeScript construct with what it expresses',
        [
          { left: 'interface', right: 'A contract that can be extended' },
          { left: 'type alias with a union', right: 'One of a closed set of states' },
          { left: 'string literal type', right: 'Exactly this string, not any string' },
          { left: 'optional property with ?', right: 'The key may be absent' },
          { left: 'readonly', right: 'Cannot be reassigned after creation' },
        ],
        'The vocabulary of shapes. Being able to name which construct expresses which intent is most of writing readable types.'
      ),
      TEXT(
        'Declare a type that means exactly one of the strings idle, loading or error. Type the alias, starting with the word type.',
        ['type status = idle or loading or error', "type Status = 'idle' | 'loading' | 'error'", 'type status union of three literals'],
        'A union of literal types gives you exhaustiveness: forgetting one member in a switch becomes a compiler error rather than a silent gap.'
      ),
    ],
  },

  'ts-narrowing': {
    id: 'ts-narrowing',
    title: 'Unions, unknown, and narrowing',
    theory: [
      'A union type means several possibilities at once, and the compiler only lets you use members that exist on every side. To reach a side-specific member you must narrow: prove which possibility you are holding with a check the compiler can follow.',
      'The workhorses are typeof for primitives, in for property existence, a discriminant field with literal types, and instanceof for classes. Each of them refines the type for the code that follows, and the refinement is per branch, not global.',
      'unknown is the type-safe version of any: you must narrow before using it, so nothing slips past unchecked. Data from JSON.parse, from a catch clause, and from an untyped module arrives as unknown by choice. The honest response is a type guard function that returns a type predicate, or a validation library that parses and returns a typed value.',
      'null and undefined are ordinary values, which is why strict mode requires handling them. Optional chaining ?. stops when it meets null, nullish coalescing ?? supplies a default only for null or undefined, and a plain || is not the same thing because it also swallows zero and the empty string.',
    ],
    questions: [
      MCQ(
        'Why does the compiler reject a property access on a union of two object types?',
        'The property might not exist on every member of the union',
        [
          'The property might not exist on every member of the union',
          'Because unions cannot be assigned to variables at all',
          'Because property access is only allowed on interfaces',
          'Because every union has to be narrowed with instanceof',
        ],
        'Shared members are usable directly; unique ones need narrowing first. A discriminant field is the cleanest way to make that check.'
      ),
      MCQ(
        'What makes unknown better than any at a boundary?',
        'It cannot be used until it has been checked, so nothing passes unverified',
        [
          'It cannot be used until it has been checked, so nothing passes unverified',
          'It is faster at runtime than any is',
          'It allows direct property access with no checks',
          'It automatically converts values into the expected shape',
        ],
        'any opts out of checking entirely. unknown keeps the obligation to check, which is exactly what untrusted data needs.'
      ),
      MCQ(
        'Which refines a union most reliably for a state machine stored as an object?',
        'A literal discriminant field checked in a switch, with never for the default case',
        [
          'A literal discriminant field checked in a switch, with never for the default case',
          'A truthiness test on each optional property in turn',
          'A cast of the whole object to the widest member',
          'A runtime typeof check on the object itself',
        ],
        'A discriminant plus an exhaustiveness check turns a forgotten state into a build error. That is the pattern behind well-typed reducers.'
      ),
      MATCH(
        'Pair each operator or keyword with what it does',
        [
          { left: 'typeof x equals a literal', right: 'Narrow a primitive union' },
          { left: 'key in object', right: 'Narrow by property existence' },
          { left: 'x satisfies Shape', right: 'Check a value without widening its type' },
          { left: 'value as Shape', right: 'Assert the type and take responsibility for it' },
          { left: 'never in a default case', right: 'Prove every union member was handled' },
        ],
        'Narrowing checks are free; assertions are promises; satisfies gives the check without losing the literal type.'
      ),
      TEXT(
        'Write the expression that reads response.data.items safely when either might be missing, falling back to an empty array.',
        ['response?.data?.items ?? []'],
        'Optional chaining stops at the first null, and ?? supplies the fallback for null or undefined only, which is what keeps a zero or empty string intact.'
      ),
    ],
  },

  'ts-workshop-shapes': {
    id: 'ts-workshop-shapes',
    title: 'Workshop: type a real module',
    theory: [
      'The module is a session store: a status field, an optional user, a list of lesson ids, and a function that returns either an error message or a saved count. In JavaScript it worked. In TypeScript it must say what it means, and the compiler then finds three real bugs.',
      'The method is mechanical and worth practising: name the states with a union, describe the shape with an interface, parse the boundary into unknown then narrow, and let the errors lead. Do not silence an error with a cast until you have read what it was trying to tell you.',
      'When the status union grows a fourth member, every switch that forgets it stops compiling. That is the payoff of the workshop: the type is now a specification, and the specification is checked on every build.',
    ],
    questions: [
      MCQ(
        'The status field can be idle, loading, saved or failed. Which declaration best prevents a forgotten case?',
        'A union of the four literal types, with a switch that ends in a never default',
        [
          'A union of the four literal types, with a switch that ends in a never default',
          'A string type, because the values are all text',
          'An enum, because it names the cases at runtime',
          'Four boolean flags, one per possible state',
        ],
        'The literal union plus exhaustiveness check is what makes adding a state a build error. Four booleans allow impossible combinations.'
      ),
      TEXT(
        'The store reads JSON with no validation. Write the two-word discipline for the boundary: parse into this type, then check it.',
        ['unknown then narrow', 'parse as unknown'],
        'Treat unvalidated data as unknown, and either write a type guard or parse it with a schema so the shape is proven before use.'
      ),
      MATCH(
        'Order the workshop steps by what each one produced',
        [
          { left: 'Named the states as a union', right: 'Three switches became compiler errors' },
          { left: 'Described the shape with an interface', right: 'A missing field was caught at construction' },
          { left: 'Parsed the boundary as unknown', right: 'A cast that was hiding an undefined' },
          { left: 'Replaced any with a generic parameter', right: 'Call sites kept their precise types' },
          { left: 'Ran npx tsc --noEmit', right: 'The whole list of remaining gaps' },
        ],
        'Each step produced a specific error, and each error was a real bug. That is the argument for typing a module you already trust.'
      ),
    ],
  },

  'ts-quiz-1': {
    id: 'ts-quiz-1',
    title: 'Checkpoint: shapes and narrowing',
    theory: [
      'This checkpoint covers what the compiler knows and when: where to annotate, how unions are handled, and the difference between checking a type and asserting one.',
      'Everything here comes from the two lessons and the workshop in this unit, including the session store examples.',
    ],
    questions: [
      MCQ(
        'What happens to your annotations when the app runs on a device?',
        'They are erased; only the JavaScript remains',
        [
          'They are erased; only the JavaScript remains',
          'They are kept and enforced on every assignment',
          'They become runtime checks only for exported types',
          'They are converted into optional chaining operators',
        ],
        'TypeScript is a build-time layer. Anything that must hold at runtime needs a real check, a guard, or a parsed schema.'
      ),
      MCQ(
        'Which line is an assertion rather than a check?',
        'const value = payload as Shape',
        ['const value = payload as Shape', 'const value: Shape = parse(payload)', 'if (typeof payload === “string”) use(payload)', 'function f(x: unknown) { }'],
        'as tells the compiler to trust you and does not verify anything. The other forms either declare, or narrow with a real check.'
      ),
      MCQ(
        'Why is ?? usually the right default operator with optional chaining?',
        'It applies only to null or undefined, so zero and empty string survive',
        [
          'It applies only to null or undefined, so zero and empty string survive',
          'It also treats false and zero as missing values',
          'It works on any falsy value, which is more forgiving',
          'It checks the property before reading it at runtime',
        ],
        'Falls back to || only when you want every falsy value replaced. Numeric and string results usually need ??.'
      ),
      MATCH(
        'Pair each type-level need with the construct that fits',
        [
          { left: 'Closed set of states', right: 'Union of literal types' },
          { left: 'Object contract others implement', right: 'Interface' },
          { left: 'Property may be absent', right: 'Optional marker ?' },
          { left: 'Check without widening', right: 'satisfies operator' },
          { left: 'Untrusted external data', right: 'unknown plus a type guard' },
        ],
        'Five shapes of problem, five shapes of tool. The mistakes this course prevents are mostly the wrong tool.'
      ),
      TEXT(
        'Write the parameter annotation that accepts a function taking a string and returning a number.',
        ['callback: (value: string) => number', 'f: (s: string) => number', 'fn: (input: string) => number'],
        'Function types name the parameter type and the return type. Keeping the parameter name is what makes hover docs useful for callers.'
      ),
      TEXT(
        'A switch over a four-member union should prove all cases are handled. Type what you write in the default branch.',
        ['const unreachable: never = status', 'never = status', 'exhaustive never check'],
        'Assigning the leftover value to never fails to compile exactly when a case is missing, which is the exhaustiveness check.'
      ),
    ],
  },

  'ts-generics': {
    id: 'ts-generics',
    title: 'Generics and utility types',
    theory: [
              'A generic is a type parameter: the code says what it does with a type it does not know yet, and each call site gets a result typed from the argument it was actually given. Identity is the simplest case: a function returning the value it received keeps the precise type at every call, where any or a cast would lose it. In TypeScript 5 a type parameter can also be constrained with extends and defaulted, and the position after the name can be marked readonly for tuple types.',
      'Constrain with extends to say what the parameter must support. A constraint is a promise about the argument, so the body may use the members the constraint names and nothing more. Too wide a constraint loses safety at the call site, too narrow makes the function unusable.',
      'Utility types are the same idea packaged: Partial and Required flip optionality, Pick and Omit select members, Record maps keys to a value shape, ReturnType reads a function result type. Composing them is usually clearer than restating a shape by hand, and it keeps one source of truth.',
      'Infer inside a conditional type extracts a member, which is how ReturnType and unwrapping helpers are written. Use it when the type you want is derived from another type, not when a plain annotation would do: generics are for reuse, and the reader pays for cleverness.',
    ],
    questions: [
      MCQ(
        'When is a generic the right tool rather than a plain annotation?',
        'When the result type depends on the argument type',
        [
          'When the result type depends on the argument type',
          'When a function takes more than three parameters',
          'When the value comes from a JSON response body',
          'When a type alias is longer than one line',
        ],
        'Reuse with a relationship is the test. If the shape does not depend on the input, an annotation is clearer to read.'
      ),
      MCQ(
        'What does a constraint written with extends do?',
        'It promises the type parameter supports a shape, so the body may use those members',
        [
          'It promises the type parameter supports a shape, so the body may use those members',
          'It copies the constraint type into every call site',
          'It forces the parameter to be exactly that type',
          'It removes the need to annotate the return value',
        ],
        'The constraint sets what the implementation can rely on. Call sites may pass anything wider than the constraint, which is what keeps it reusable.'
      ),
      MATCH(
        'Pair each utility type with the change it makes',
        [
          { left: 'Partial of Shape', right: 'Every member becomes optional' },
          { left: 'Record of keys and value', right: 'An object with those keys and one value type' },
          { left: 'Pick of Shape by name', right: 'Only the listed members survive' },
          { left: 'Omit of Shape by name', right: 'Everything except the listed members' },
          { left: 'ReturnType of a function', right: 'The type of what that function gives back' },
        ],
        'These five cover most real derivation. They exist so a shape is written once and transformed, rather than copied and forgotten.'
      ),
      TEXT(
        'Write the annotation for an object whose keys are lesson identifiers and whose values are numbers.',
        ['record<string, number>', 'record <string, number>', 'record<string,number>'],
        'Record gives an index shape with a checked value type, and with a union of literal keys it also checks that every key is present.'
      ),
    ],
  },

  'ts-strict-config': {
    id: 'ts-strict-config',
    title: 'Strict mode, configuration, and migration',
    theory: [
      'The compiler options decide how much of the codebase is actually checked. strict turns on the family of flags that catch implicit any, null and undefined leaks, unsound class initialisation and unchecked function shapes. Without it, a great many real bugs are simply permitted.',
      'noUncheckedIndexedAccess is the one worth turning on deliberately: obj[key] then has type value or undefined, which matches what the object may really contain. It makes you handle the missing case instead of trusting the index.',
      'Type checking and building are separate steps. npx tsc --noEmit checks without emitting, which is what a project using a bundler or a transpiler such as Babel or Metro should run — that is what this repository does in its gate. A module resolution mode has to match the runtime, or the compiler validates imports the bundler cannot resolve.',
      'Migration is incremental by design: allowJs plus checkJs lets a JavaScript file be checked without being renamed, ts-ignore suppresses one line and should be a todo with a reason, and per-directory strictness rules let a team convert one folder at a time. A half-migrated project where new code is strict beats a project that waits for a rewrite.',
    ],
    questions: [
      MCQ(
        'What does running the compiler with noEmit give a project?',
        'Type checking without generated files, so the bundler stays the only build step',
        [
          'Type checking without generated files, so the bundler stays the only build step',
          'Faster bundling because the compiler does less work',
          'Automatic type annotations for JavaScript files',
          'A guarantee that no runtime checks are needed',
        ],
        'Two tools must not own the same output. The bundler emits, the compiler only judges — which is why the gate runs tsc --noEmit.'
      ),
      MCQ(
        'With noUncheckedIndexedAccess enabled, what is the type of map[id] for a map keyed by string?',
        'The value type or undefined, because the key may be absent',
        [
          'The value type or undefined, because the key may be absent',
          'Always the value type, because the key is a string',
          'unknown, because index access is never provable',
          'never, because the compiler cannot verify keys',
        ],
        'Indexing is a partial function. The flag makes that visible, and the compiler then requires you to handle the miss.'
      ),
      MCQ(
        'A team is adding TypeScript to a large JavaScript codebase. What keeps it moving?',
        'Incremental checking with allowJs, strict for new files, and one folder converted at a time',
        [
          'Incremental checking with allowJs, strict for new files, and one folder converted at a time',
          'Renaming every file first, then fixing all reported errors',
          'Disabling strict until the whole migration is complete',
          'Adding an any annotation to every parameter that errors',
        ],
        'A big-bang rename stops delivery for weeks and produces a codebase of anys. Gradual adoption keeps the new boundary typed from day one.'
      ),
      MATCH(
        'Pair each option or tool with what it controls',
        [
          { left: 'strict', right: 'Turns on the null, any and soundness family' },
          { left: 'target', right: 'Which ECMAScript features may be used' },
          { left: 'moduleResolution', right: 'How import specifiers are resolved' },
          { left: 'paths', right: 'Aliases that map imports to folders' },
          { left: 'skipLibCheck', right: 'Do not re-check declaration files of dependencies' },
        ],
        'Configuration is the enforcement policy. A team that has never read its tsconfig is checking less than it thinks.'
      ),
    ],
  },

  'ts-workshop-migrate': {
    id: 'ts-workshop-migrate',
    title: 'Workshop: convert one file honestly',
    theory: [
      'The file is a JavaScript helper that reads a course record, formats a duration and returns either a string or null depending on a flag. Converting it is not renaming the extension: it is deciding, line by line, what the function promises.',
      'The order that works: rename to ts, run the compiler and read the whole list before typing anything, then annotate parameters from the outside in, replace the accidental any with unknown plus a guard, and let the return type be inferred where it is already correct.',
      'The interesting part is the nullable return. Once the signature says the function may return null, every caller gains an error, and that is the bug the file has always had. The fix is either a non-null default or a union the caller must narrow — not a cast to hide the truth again.',
    ],
    questions: [
      TEXT(
        'The helper takes a course object and returns its title. Write the parameter annotation using the interface name Course.',
        ['course: Course', 'function titleOf(course: Course)'],
        'Naming the parameter type is the first annotation, and importing Course from the module that owns it keeps one source of truth.'
      ),
      MCQ(
        'The compiler reports that a value from JSON.parse cannot be used. What is the honest fix?',
        'Declare it unknown and narrow it with a type guard before use',
        [
          'Declare it unknown and narrow it with a type guard before use',
          'Cast it to the expected interface so the error goes away',
          'Type the parameter as any and rely on the tests',
          'Disable strict mode for the file at the top comment',
        ],
        'A cast buys silence and spends trust. A guard is a real check, and it is the code that runs in production tomorrow.'
      ),
      MATCH(
        'Pair each migration move with what it revealed',
        [
          { left: 'Rename the file', right: 'The compiler starts reading it at all' },
          { left: 'Annotate the parameters', right: 'Callers already passing the wrong shape' },
          { left: 'Type the nullable return', right: 'Every caller that assumed a value' },
          { left: 'Replace any with unknown', right: 'The checks the code never actually made' },
          { left: 'Run noEmit in the gate', right: 'Errors on every pull request, not nightly' },
        ],
        'The point of the workshop is that conversion produces findings. A migration that reports nothing was not a migration.'
      ),
      TEXT(
        'Write the command this project runs to type-check without emitting build output.',
        ['npx tsc --noEmit', 'tsc --noEmit', 'npm run typecheck'],
        'That is the exact command in the repository gate and in AGENTS.md, and it is why the check is cheap enough to run on every change.'
      ),
    ],
  },

  'ts-quiz-2': {
    id: 'ts-quiz-2',
    title: 'Checkpoint: reuse and enforcement',
    theory: [
      'This checkpoint covers generics and utility types, the compiler options that decide what is checked, and the habits that make a migration produce findings instead of noise.',
      'Items restate the second unit and its workshop, including the nullable return that turned out to be a real bug.',
    ],
    questions: [
      MCQ(
        'A function should return the same type it was given, for any argument. Which signature does that?',
        'function identity(value: T): T',
        ['function identity(value: T): T', 'function identity(value: any): any', 'function identity(value: unknown): unknown', 'function identity(value: string): string'],
        'The type parameter ties input to output. any would compile, but it forgets the relationship that made the function precise.'
      ),
      MCQ(
        'Which utility type turns a full shape into a patch payload for a partial update?',
        'Partial of the shape',
        ['Partial of the shape', 'Required of the shape', 'Readonly of the shape', 'Record of the shape keys'],
        'Partial makes every member optional, which is exactly the update-payload idea. Pair it with a runtime check for an empty patch.'
      ),
      MCQ(
        'The gate passes locally but fails on a pull request. Where should you look first?',
        'The tsconfig and compiler version the CI uses, which may differ from the editor',
        [
          'The tsconfig and compiler version the CI uses, which may differ from the editor',
          'The editor theme, which changes reported severities',
          'The bundler cache, which is always the culprit here',
          'The order of imports in the failing file only',
        ],
        'Type checking is configuration-dependent. A green editor over a red build almost always means two different configs or two different TypeScript versions.'
      ),
      MATCH(
        'Pair each type decision with its consequence',
        [
          { left: 'Generic with a constraint', right: 'Call sites keep precise types safely' },
          { left: 'any at a boundary', right: 'Silence now, unchecked values later' },
          { left: 'unknown with a guard', right: 'A check that also runs in production' },
          { left: 'strict off', right: 'Null leaks and implicit any permitted' },
          { left: 'Nullable return typed honestly', right: 'Callers forced to handle the miss' },
        ],
        'Every one of these is a trade between quiet builds and true claims. The course exists to make you choose the second deliberately.'
      ),
      TEXT(
        'Write the flag that asks the compiler to check a file without writing any output.',
        ['--noEmit', 'npx tsc --noEmit'],
        'noEmit separates judging from building, so a transpiler owns the output and the compiler owns the errors.'
      ),
      TEXT(
        'In twelve words or fewer, say when a generic is worth writing.',
        ['when the result type depends on input'],
        'Reuse with a relationship. Without that dependency, an explicit shape reads better for the next person.'
      ),
    ],
  },

  'ts-final': {
    id: 'ts-final',
    title: 'TypeScript final exam',
    theory: [
      'The final covers the whole course: erasure and boundaries, unions and narrowing, the difference between asserting and checking, generics as reuse, and the configuration that decides what is enforced.',
      'Items restate both units and both workshops. Where you hesitate, the explanation names the lesson to reopen.',
    ],
    questions: [
      MCQ(
        'A value crosses a network boundary and is annotated with an interface. What protects the app if the server sends something else?',
        'A runtime guard or schema parse, because annotations do not run',
        [
          'A runtime guard or schema parse, because annotations do not run',
          'The annotation itself, which rejects the shape at entry',
          'The compiler, which knows the server response already',
          'Strict mode, which validates every external payload',
        ],
        'Types describe data the compiler can see. Anything from outside that view needs a check written as code, or a parse that returns a typed value.'
      ),
      MCQ(
        'Which construct checks a value against a shape while keeping the value narrower than the shape?',
        'The satisfies operator',
        ['The satisfies operator', 'The as keyword', 'A type annotation on the variable', 'An interface with extends'],
        'satisfies verifies without widening, so literal types and exhaustiveness survive while the shape is still enforced.'
      ),
      MCQ(
        'What is the effect of returning a value that may be null from a widely used helper?',
        'Every caller gains an error until it handles the missing case',
        [
          'Every caller gains an error until it handles the missing case',
          'Only the callers that already use optional chaining are affected',
          'The compiler treats the value as undefined instead of null',
          'Callers are unaffected as long as the helper is exported',
        ],
        'That cascade is the point. The helper always could return nothing; the type is what finally made the callers deal with it.'
      ),
      MATCH(
        'Pair each rule of the course with the construct it belongs to',
        [
          { left: 'Annotate the boundary, trust inference inside', right: 'Parameters, exports and external data' },
          { left: 'Prove it or narrow it', right: 'unknown instead of any' },
          { left: 'One closed set of states', right: 'Literal union with a never default' },
          { left: 'Reuse with a relationship', right: 'Generic with an extends constraint' },
          { left: 'Shape written once', right: 'Utility types derived from it' },
        ],
        'Five rules, five constructs. The exam asks you to match them because real files fail by mixing them up.'
      ),
      TEXT(
        'Write the assertion that assigns a leftover union member to prove a switch is exhaustive.',
        ['const exhaustive: never = status', 'never = status'],
        'When a case is missing, the leftover type is not never and the assignment fails. That is the exhaustiveness check from the first unit.'
      ),
      TEXT(
        'The strict flag family is on. Type the compiler option that makes index access include undefined.',
        ['noUncheckedIndexedAccess', 'no unchecked indexed access'],
        'It is not part of strict by default in current TypeScript, which is why it appears as its own option in a careful tsconfig.'
      ),
      MATCH(
        'Pair each migration step with the finding it produced in the workshop',
        [
          { left: 'Rename the helper file', right: 'The compiler could read it at all' },
          { left: 'Annotate the parameters', right: 'A caller passing the wrong shape' },
          { left: 'Type the nullable return', right: 'Assumptions spread across the callers' },
          { left: 'Replace any with unknown', right: 'Checks the code never actually made' },
          { left: 'Add noEmit to the gate', right: 'Errors on every change, not occasionally' },
        ],
        'The workshop was the argument: conversion produced real defects, in a file the team already trusted.'
      ),
    ],
  },
};
