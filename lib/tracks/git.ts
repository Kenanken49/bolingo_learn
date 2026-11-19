/**
 * Track · Git & Version Control — Course 10.
 *
 * The version control the roadmap calls for and the catalog did not have:
 * how Git stores history, how to branch and merge, how to collaborate on a
 * remote, and how to get out of trouble without losing work. Commands shown
 * are current Git CLI syntax (`git switch` / `git restore` alongside the
 * older `git checkout`), and every recovery lesson teaches the reversible
 * option before the destructive one.
 */

import { BUILD, MATCH, MCQ, TEXT, type CourseLesson } from '../quizBank';

export const TRACK_GIT: Record<string, CourseLesson> = {
  /* ---------------- Unit 1 · How Git stores your project ---------------- */

  'git-repositories': {
    id: 'git-repositories',
    title: 'Snapshots, the index, and HEAD',
    theory: [
      'Git is not a diff store. Each commit is a full snapshot of your project files plus four pieces of metadata: the author, the message, the timestamp, and a pointer to the parent commit. The .git folder inside your project holds all of it, which is why history travels with the folder and needs no server.',
      'Because the snapshot is hashed, a commit id is really a checksum of its content and its parent chain. Change anything in an old commit and its id changes, which changes every id that follows it. That is the reason rewriting published history breaks other people.',
      'Three areas hold your work. The working directory is the files you can see and edit. The index, also called the staging area, is the draft of your next commit. The repository holds the commits. `git add` copies the current content of a file into the index; `git commit` turns the index into a snapshot.',
      'HEAD is a pointer to the branch you are currently on, and the branch itself is only a movable label on a commit. That single fact explains most of Git: switching branches moves a pointer, and your working directory is updated to match the commit it points at.',
    ],
    questions: [
      MCQ(
        'What does `git add README.md` actually do?',
        'It copies the current content of README.md into the index, the draft of your next commit',
        [
          'It copies the current content of README.md into the index, the draft of your next commit',
          'It uploads README.md to the remote server',
          'It creates a commit containing README.md',
          'It locks README.md so no one else can edit it',
        ],
        'Adding stages content; it does not commit and does not touch any remote. `git commit` is the step that writes the snapshot.'
      ),
      MCQ(
        'Why does amending an old commit change every commit id after it?',
        'Each commit hash covers its parent, so replacing one forces the whole chain to be recomputed',
        [
          'Each commit hash covers its parent, so replacing one forces the whole chain to be recomputed',
          'Because Git deletes the later commits when you amend',
          'Because the branch pointer moves back to the amended commit',
          'Because Git stores only diffs, so a later diff cannot be applied',
        ],
        'Git snapshots files, not diffs, but the hash still covers the parent pointer. New parent hash means new child hash, all the way down.'
      ),
      MCQ(
        'What is HEAD in Git?',
        'A pointer to the commit you are currently working on, usually through a branch name',
        [
          'A pointer to the commit you are currently working on, usually through a branch name',
          'The newest commit by timestamp in the whole repository',
          'The remote branch you push to by default',
          'The list of files that are currently modified',
        ],
        'HEAD normally points at a branch name, and the branch points at a commit. Checking out a commit directly leaves HEAD detached.'
      ),
      MATCH(
        'Pair each Git area or command with what it holds or does',
        [
          { left: 'Working directory', right: 'The files you are editing right now' },
          { left: 'The index', right: 'The draft snapshot for your next commit' },
          { left: 'git commit', right: 'Writes the staged content as a new snapshot' },
          { left: 'git status', right: 'Reports modified and staged files' },
          { left: '.git folder', right: 'The whole history, inside your project' },
        ],
        'Working directory, index, repository — the three places your files live. `git status` tells you which of the three each change sits in.'
      ),
      TEXT(
        'You have edited two files but only want to commit one of them. Which command stages a single file? Type it with the file name src/app.tsx',
        ['git add src/app.tsx'],
        'Staging is per path, so `git add src/app.tsx` puts just that file in the index and leaves the other change in the working directory.'
      ),
    ],
  },

  'git-branching': {
    id: 'git-branching',
    title: 'Branches, merges, and conflicts',
    theory: [
      'A branch is a movable pointer to a commit, nothing more — creating one costs almost nothing and takes no copy of your files. `git switch -c fix-login` makes a new pointer at your current commit and moves HEAD to it. Older scripts use `git checkout -b`, which does the same job.',
      'When two branches have both moved on from a shared ancestor, Git performs a three-way merge: it compares each side against that common ancestor and combines the changes automatically where they do not overlap.',
      'A merge conflict means two sides changed the same region. Git writes both versions into the file between markers: `<<<<<<< HEAD` for your side, `=======` as the divider, and `>>>>>>> fix-login` for the incoming side. You resolve it by editing the file, then `git add` the result and finish the merge with `git commit`.',
      'Rebasing replays your commits onto a new base, producing a linear history but new commit ids. That is why the rule is: rebase commits that only exist on your machine, never commits your teammates have already pulled.',
    ],
    questions: [
      MCQ(
        'What does `git switch -c experiment` do?',
        'Creates a new branch pointer at your current commit and moves HEAD to it',
        [
          'Creates a new branch pointer at your current commit and moves HEAD to it',
          'Copies every tracked file into a new folder',
          'Merges experiment into the branch you were on',
          'Downloads the experiment branch from the remote',
        ],
        'The -c flag creates, and switching moves HEAD. No files are duplicated: a branch is only a pointer.'
      ),
      MCQ(
        'A three-way merge compares the two branches against what?',
        'Their closest common ancestor commit',
        [
          'Their closest common ancestor commit',
          'The tip of the main branch',
          'The stash where the conflict was recorded',
          'The most recent tag in the repository',
        ],
        'The merge base is the common ancestor. Changes on each side are computed against it, then combined.'
      ),
      MCQ(
        'Inside a conflicted file, what does the section under `=======` and above `>>>>>>>` show?',
        'The version coming from the branch being merged in',
        [
          'The version coming from the branch being merged in',
          'The version from your current branch',
          'The common ancestor version',
          'A suggestion generated by Git',
        ],
        'The first block is yours (HEAD), the second is theirs. The ancestor is not written into the file unless you ask for a zdiff3 style conflict.'
      ),
      MATCH(
        'Pair each branch operation with its effect',
        [
          { left: 'git switch -c', right: 'Create a branch and move onto it' },
          { left: 'git merge', right: 'Combine another branch into the current one' },
          { left: 'git rebase', right: 'Replay commits onto a new base, rewriting ids' },
          { left: 'git cherry-pick', right: 'Apply one chosen commit onto the current branch' },
          { left: 'git branch -d', right: 'Delete a branch label' },
        ],
        'Branch labels are cheap to create and cheap to delete. Rewriting ids is the expensive one — that is the rebase.'
      ),
      BUILD(
        'Assemble the command that creates a branch called fix-login and switches to it',
        ['git', 'switch -c', 'fix-login'],
        ['git', 'switch -c', 'fix-login', 'checkout -d', 'main'],
        'git switch -c fix-login. Modern Git uses switch; the older spelling is git checkout -b fix-login.'
      ),
    ],
  },

  'git-workshop-history': {
    id: 'git-workshop-history',
    title: 'Workshop: a clean commit, staged in the VM',
    theory: [
      'A commit that is easy to read is a commit that is easy to review. The habit is: look before you stage, stage deliberately, describe the change in the imperative mood, and keep one logical change per commit.',
      'Four of the five steps below run in the offline Git VM, and each one is graded from the repository the VM builds rather than from the command you can recall. `git status` shows what changed and where each change sits: `git diff` compares the working directory with the index, `git diff --staged` compares the index with the commit. Nothing counts as staged for naming a command here — a file counts only when `git status` in the repository reports it as added.',
      'The commit message has a subject line and an optional body. The subject answers what the codebase will do after this commit, in imperative mood: Fix the timeout, not Fixed the timeout or Fixing the timeout. Git and tooling read the subject alone in logs and in `git log --oneline`, and so does the VM: in step 3 your words are checked out of the finished commit, and in step 4 an amend has to keep them while changing the content. Patch staging with `git add -p` is the one move this VM cannot grade, because patch mode is interactive and no shipped scenario checks it, so it stays the last step and is labelled as a spelling drill.',
    ],
    questions: [
      {
        kind: 'terminal' as const,
        prompt:
          'Step 1, in the terminal: clone git-playground, create index.html, style.css, one.js, two.js, 1.py and 2.py, then build the index the way a reviewable commit builds it — the two front-end files by name, both JavaScript files with one glob, and everything left over so nothing stays untracked. Read git status after each step; every task is verified against the repository the VM actually builds.',
        correctChain: ['Complete every task in the terminal'],
        scrambledTokens: [],
        explain:
          'The VM re-reads the index rather than your intent: each file has to show as added in git status, and the shell history has to prove the by-name stage and the glob were actually typed. A file that is only on disk never reaches the commit, and a stage you did not run cannot be graded.',
        terminal: { scenarioId: 'labex-git-add-files-to-the-staging-area' },
      },
      {
        kind: 'terminal' as const,
        prompt:
          'Step 2, in the terminal: this repository is already set up for you, with newfile.txt staged by accident and a README.md edit staged on purpose. Enter git-playground and take only newfile.txt out of the index, leaving the README change staged and the file itself on disk.',
        correctChain: ['Complete every task in the terminal'],
        scrambledTokens: [],
        explain:
          'git restore --staged newfile.txt edits one index entry and nothing else. The VM reads git status for both halves of that sentence: the staged line for newfile.txt has to be gone while modified: README.md stays, and newfile.txt has to appear under Untracked files. Fixing an accident means editing the index, not starting the whole stage over.',
        terminal: { scenarioId: 'labex-git-remove-files-from-the-staging-area' },
      },
      {
        kind: 'terminal' as const,
        prompt:
          'Step 3, in the terminal: clone git-playground, set core.editor to vim in your global Git configuration, then create hello.txt containing “Hello, Git” and commit it with the imperative subject “Update hello.txt”.',
        correctChain: ['Complete every task in the terminal'],
        scrambledTokens: [],
        explain:
          'The subject is graded out of the finished commit, not out of a text box: git log -1 has to contain “Update hello.txt” and hello.txt has to hold the line you wrote, so the stage and the message both have to be real. core.editor is the setting behind every message composed without -m, which is why the task pins it before the commit rather than after.',
        terminal: { scenarioId: 'labex-git-configure-the-git-text-editor' },
      },
      {
        kind: 'terminal' as const,
        prompt:
          'Step 4, in the terminal: clone git-playground again — one line is missing from its newest commit. Append “New content” to README.md, stage it, and fold it into that commit with --amend --no-edit, leaving the original subject alone.',
        correctChain: ['Complete every task in the terminal'],
        scrambledTokens: [],
        explain:
          'Three facts have to hold at once and the VM reads all three: git log -1 still says “Added file2.txt”, git show HEAD now carries “New content”, and git status reports a clean tree. --no-edit is the difference between a repair and a rewrite — the forgotten line belongs to the commit you already described, so the description stays and only the snapshot changes.',
        terminal: { scenarioId: 'labex-git-edit-the-last-commit' },
      },
      BUILD(
        'Step 5 — assemble the command that splits one file across two commits. Patch mode is interactive, so this is the one step the VM cannot grade: drill the spelling.',
        ['git', 'add -p', 'src/session.ts'],
        ['git', 'add -p', 'src/session.ts', 'git commit', '--all'],
        'git add -p with a path opens each hunk and asks y or n, so unrelated edits stay out of the commit and each commit carries one logical change.'
      ),
    ],
  },

  'git-quiz-1': {
    id: 'git-quiz-1',
    title: 'Checkpoint: how Git works',
    theory: [
      'This checkpoint covers the model: the three areas your files can live in, what a commit really stores, and why branch pointers are cheap while rewritten ids are not.',
      'Answer from memory first. If a question feels foggy, the two lessons above hold the exact wording, and the workshop shows the commands in order.',
    ],
    questions: [
      MCQ(
        'Which command shows the changes that are already staged?',
        'git diff --staged',
        ['git diff --staged', 'git diff', 'git status --short', 'git show HEAD'],
        'Plain git diff compares the working directory with the index. Add --staged to compare the index with HEAD.'
      ),
      MCQ(
        'What is stored inside each commit object?',
        'A snapshot of files, metadata, and a pointer to its parent',
        [
          'A snapshot of files, metadata, and a pointer to its parent',
          'The list of edits made since the parent commit',
          'A copy of the remote branch at that moment',
          'Only the commit message and author',
        ],
        'Commits are snapshots plus parent pointers. Packing compresses the storage later, but the model stays snapshot-based.'
      ),
      MCQ(
        'You merged a conflicted branch and edited the file. What now?',
        'Stage the resolved file with git add, then commit to finish the merge',
        [
          'Stage the resolved file with git add, then commit to finish the merge',
          'Run git merge again to re-check the file',
          'Run git reset to discard the merge',
          'The merge completes itself once the markers are gone',
        ],
        'Git cannot tell that your edit was the resolution. Staging is the signal, and the commit records the merge with two parents.'
      ),
      MATCH(
        'Pair each command with the question it answers',
        [
          { left: 'git status', right: 'What changed and where does each change sit' },
          { left: 'git log --oneline', right: 'What are the recent commits in one line each' },
          { left: 'git diff', right: 'What is different in the working directory' },
          { left: 'git show HEAD', right: 'What is in the commit I am standing on' },
          { left: 'git blame file', right: 'Which commit last touched each line' },
        ],
        'Four inspection commands, four different comparisons. Knowing which area each one reads is the whole skill.'
      ),
      TEXT(
        'In at most twelve words, say what the staging area is for.',
        ['The draft of the next commit'],
        'The index is the draft snapshot. You build it with git add and freeze it into a commit with git commit.'
      ),
      BUILD(
        'Assemble the command that stages every tracked change in one step',
        ['git add', '--all'],
        ['git add', '--all', '--staged', 'git commit', '-m'],
        'git add --all (or git commit -a, which stages tracked modifications as it commits). Untracked files need an explicit path.'
      ),
    ],
  },

  /* ---------------- Unit 2 · Working with others and with trouble ---------------- */

  'git-remotes': {
    id: 'git-remotes',
    title: 'Remotes, fetch, pull, and push',
    theory: [
      'A remote is a named URL for another copy of your repository; `origin` is the conventional name for the one you cloned from. `git remote -v` lists them, and your own branches live under `main` while the copy on the server appears locally as `origin/main` — a remote-tracking ref that only moves when you fetch.',
      '`git fetch` downloads new commits and updates those remote-tracking refs. It changes no work of yours. `git pull` is fetch plus integrate: merge by default, or rebase with `git pull --rebase`. That is the entire difference, and it is why fetch-then-decide is the safer habit.',
      '`git push origin HEAD` publishes the branch you are on. A plain `git push` can be rejected as a non-fast-forward when the remote moved; the fix is to fetch and integrate, not to force. `git push --force-with-lease` is the version that refuses to overwrite commits you never saw.',
      'A fork is a server-side copy owned by someone else, and a pull request or merge request is a request to integrate a branch. The unit of review is the commit range, so a branch with focused commits reviews far better than one enormous commit.',
    ],
    questions: [
      MCQ(
        'What is the difference between git fetch and git pull?',
        'Fetch downloads and updates remote-tracking refs only; pull then merges or rebases into your branch',
        [
          'Fetch downloads and updates remote-tracking refs only; pull then merges or rebases into your branch',
          'Fetch works on branches, pull works on tags',
          'Fetch requires write access, pull is read-only',
          'They are aliases for the same operation',
        ],
        'pull is fetch plus integrate. Running them apart lets you inspect what arrived before it touches your work.'
      ),
      MCQ(
        'Your push is rejected as non-fast-forward. What went wrong?',
        'The remote branch has commits you do not have locally',
        [
          'The remote branch has commits you do not have locally',
          'You forgot to sign your commit',
          'Your branch name does not match the remote',
          'The repository history is corrupt',
        ],
        'Someone else published work first. Fetch, integrate their commits, then push again — forcing would drop their history.'
      ),
      MCQ(
        'What does origin/main refer to?',
        'Your local record of where the main branch was the last time you fetched from origin',
        [
          'Your local record of where the main branch was the last time you fetched from origin',
          'The live main branch on the server right now',
          'Your own branch that you renamed',
          'The first commit of the repository',
        ],
        'Remote-tracking refs are a cache of the server state. They only move when you fetch, so they can be behind.'
      ),
      BUILD(
        'Assemble the safe command that publishes the branch you are standing on',
        ['git', 'push origin', 'HEAD'],
        ['git', 'push origin', 'HEAD', '--force', 'git pull', 'main'],
        'git push origin HEAD avoids retyping the branch name and refuses nothing. Reserve force for branches you own.'
      ),
      MATCH(
        'Pair each remote concept with its meaning',
        [
          { left: 'origin', right: 'The conventional name for the repository you cloned' },
          { left: 'git remote -v', right: 'List the configured remote URLs' },
          { left: 'Fork', right: 'A server-side copy owned by another account' },
          { left: 'Pull request', right: 'A request to merge your branch into another one' },
          { left: '--force-with-lease', right: 'Overwrite only if nobody else pushed first' },
        ],
        'Collaboration is a set of copies of the same history. Names, refs, and requests are how those copies stay in agreement.'
      ),
    ],
  },

  'git-recovery': {
    id: 'git-recovery',
    title: 'Undoing things without losing work',
    theory: [
      'Almost nothing in Git is a delete. Commits stay in the object database until garbage collection removes unreferenced ones, and reflog records where each ref has stood, so the usual recovery is finding the id again rather than recreating the work.',
      'Pick the undo by how far the change has travelled. A mistake in the working directory: `git restore <file>` discards it, or `git restore --source=HEAD~1 <file>` brings back an older version. A mistake in the index: `git restore --staged <file>` unstages it while keeping your edits.',
      'A commit that is wrong and not yet pushed: `git commit --amend` rebuilds it. A commit that is wrong and already pushed: `git revert <sha>` writes a new commit that applies the inverse diff, so history keeps its shape and everyone can pull it.',
      '`git reset --soft` moves HEAD and leaves the index staged; `--mixed` (the default) unstages but keeps files; `--hard` throws away working directory changes too. Before any `--hard`, run `git stash` or commit to a temporary branch, because that is the one command that can lose work.',
      '`git bisect` finds the commit that introduced a bug by binary search. You mark a known-bad commit and a known-good one, then test at the midpoint; Git checks each version out for you. With a dozen commits it takes four tests, with a thousand it takes ten.',
    ],
    questions: [
      MCQ(
        'You have committed a broken change and already pushed it to a shared branch. What is the correct undo?',
        'git revert the commit, which adds a new commit applying the inverse',
        [
          'git revert the commit, which adds a new commit applying the inverse',
          'git reset --hard to the commit before, then force push',
          'git commit --amend to repair it in place',
          'git restore the files and commit again',
        ],
        'Reverting adds history instead of rewriting it, so other people can simply pull. Force pushing shared history breaks every copy that already fetched it.'
      ),
      MCQ(
        'Which form of git reset discards uncommitted changes in the working directory?',
        'git reset --hard',
        ['git reset --hard', 'git reset --soft', 'git reset --mixed', 'git restore --staged'],
        'Only --hard touches the files themselves. Run git stash first if there is anything in the working tree worth keeping.'
      ),
      MCQ(
        'What makes git bisect efficient at finding the commit that broke something?',
        'It tests the midpoint of the remaining range, so each answer halves the search',
        [
          'It tests the midpoint of the remaining range, so each answer halves the search',
          'It reads the diff of every commit and ranks them by risk',
          'It reruns the failing test on every commit from oldest to newest',
          'It compares the two branch tips against their merge base',
        ],
        'Binary search over an ordered range: log2(n) tests. A repository with 512 commits needs nine of them.'
      ),
      MATCH(
        'Pair each recovery goal with the command that fits',
        [
          { left: 'Throw away uncommitted edits to one file', right: 'git restore that file' },
          { left: 'Unstage a file but keep the edits', right: 'git restore --staged that file' },
          { left: 'Rewrite the commit you have not pushed', right: 'git commit --amend' },
          { left: 'Undo a commit that is already public', right: 'git revert that commit' },
          { left: 'Find the id of a deleted branch', right: 'git reflog HEAD' },
        ],
        'Every recovery question is really: how far has the change travelled, and what does the reflog still remember.'
      ),
      TEXT(
        'A teammate deleted a feature branch by accident and asks how to find the commits. Which command shows where HEAD has been? Type it.',
        ['git reflog', 'git reflog HEAD', 'reflog'],
        'git reflog lists each position HEAD has held, including the tip of a branch you just deleted, and those entries stay recoverable until they expire.'
      ),
    ],
  },

  'git-workshop-recovery': {
    id: 'git-workshop-recovery',
    title: 'Workshop: putting a mess right in the VM',
    theory: [
      'This workshop is a realistic sequence and it runs: four of its five steps are graded in the offline Git VM from the repository state you leave behind, not from the command you can recall. A committed file has to come out of a commit that stays, a subject line has to be rewritten and published over the old one, and two kinds of damage have to be undone without touching history at all.',
      'The moves split by how far the mistake travelled. Work that was never committed is thrown away with `git reset --hard`, and a tracked file deleted by mistake comes back from HEAD with `git checkout HEAD -- <path>` or `git restore` — neither rewrites anything. A commit that is still yours alone is amended, and if it was already pushed the rewritten history is force-published; anything other people have built on top gets reverted instead, the move `git-lab-undo` drills.',
      'Read the output of every step before moving on: `git status` tells you which area the change sits in, `git log -1` tells you whether the commit message changed, and `git show HEAD` tells you whether the snapshot did. The VM runs those same three reads as its checks, which is why a command that failed silently cannot tick a task here.',
    ],
    questions: [
      {
        kind: 'terminal' as const,
        prompt:
          'Step 1, in the terminal: clone git-playground and take file2.txt out of its newest commit without losing the file — untrack it from the index, fold that into the commit with the message left alone, and keep your copy on disk. Every task is verified against the repository the VM actually builds.',
        correctChain: ['Complete every task in the terminal'],
        scrambledTokens: [],
        explain:
          'Three facts have to hold at once and the VM reads all three: git log -1 still carries the original subject, git show HEAD no longer contains the change, and file2.txt is still on disk while git status lists it under Untracked files. That is why the move is git rm --cached and not a delete — the index forgets the path, the working tree keeps it.',
        terminal: { scenarioId: 'labex-git-remove-a-file-from-the-last-commit' },
      },
      {
        kind: 'terminal' as const,
        prompt:
          'Step 2, in the terminal: clone your fork (https://github.com/your-username/git-playground), rewrite the newest commit so its subject reads “Update file2.txt” instead of “Added file2.txt”, then publish that rewritten history to origin/master with a force push.',
        correctChain: ['Complete every task in the terminal'],
        scrambledTokens: [],
        explain:
          'The amend is graded from git log -1 and the publish from the remote ref: origin/master has to carry “Update file2.txt” and no longer carry “Added file2.txt”. A plain push is refused first, because the remote still holds the commit you replaced — that refusal is the lesson. Rewriting is safe here because this fork is yours alone; once other people have built on the commit, the same repair is a revert.',
        terminal: { scenarioId: 'labex-git-update-remote-branch-after-rewriting-history' },
      },
      {
        kind: 'terminal' as const,
        prompt:
          'Step 3, in the terminal: the damage here is uncommitted. Clone git-playground, create hello.txt containing “hello,world”, stage it, then throw that experiment away so the tree is clean and the file is gone.',
        correctChain: ['Complete every task in the terminal'],
        scrambledTokens: [],
        explain:
          'This is the undo that reaches only uncommitted work: git reset --hard HEAD copies the commit back over the index and the working tree at once. The VM checks both halves — a tree reporting nothing to commit, and a hello.txt that no longer exists — because a reset that leaves the file on disk has not finished the job, and no history had to be rewritten to get here.',
        terminal: { scenarioId: 'labex-git-discard-uncommitted-changes' },
      },
      {
        kind: 'terminal' as const,
        prompt:
          'Step 4, in the terminal: in git-playground, file2.txt has been deleted from the working tree by mistake and nothing else is broken. Bring it back from the newest commit and leave the tree clean.',
        correctChain: ['Complete every task in the terminal'],
        scrambledTokens: [],
        explain:
          'A deletion of a tracked file is just an unstaged change, so the repair is the same move that discards any other edit: git checkout HEAD -- file2.txt, or git restore file2.txt. The VM greps the restored content and reads git status for nothing to commit — recovering a file from the commit is a different job from rewinding the branch, and this one costs no history.',
        terminal: { scenarioId: 'labex-git-restore-a-deleted-file' },
      },
      TEXT(
        'Step 5 — config/local.env keeps showing up as untracked and you keep almost staging it. Name the file you edit to stop that, and the line you add to it.',
        ['.gitignore with the path config/local.env'],
        'A path in .gitignore stops being offered as untracked, so git status stops suggesting it. Ignore rules apply only to untracked files, which is why the git rm --cached in step 1 had to happen first for a file already committed. This is the one step the VM cannot grade: no shipped scenario checks an ignore rule, so the answer is written, not run.',
      ),
    ],
  },

  'git-quiz-2': {
    id: 'git-quiz-2',
    title: 'Checkpoint: remotes and recovery',
    theory: [
      'This checkpoint covers the collaborative half: how remote-tracking refs differ from your own branches, which undo fits which mistake, and how to prove a recovery worked.',
      'The commands here are the ones people reach for under pressure, so the point is not speed but choosing the reversible option first.',
    ],
    questions: [
      MCQ(
        'Which command can lose uncommitted work?',
        'git reset --hard',
        ['git reset --hard', 'git restore --staged README.md', 'git stash push', 'git revert HEAD'],
        'Hard reset overwrites the working tree from the commit. Stash, restore, and revert all keep your edits somewhere reachable.'
      ),
      MCQ(
        'A shared branch needs one specific commit from another branch. What do you run?',
        'git cherry-pick <sha>',
        ['git cherry-pick <sha>', 'git revert <sha>', 'git merge --no-ff <branch>', 'git rebase <branch>'],
        'Cherry-pick copies one commit onto your branch as a new commit with the same change and message.'
      ),
      MCQ(
        'git bisect ends with which command to return to your original branch?',
        'git bisect reset',
        ['git bisect reset', 'git bisect exit', 'git bisect --end', 'git bisect good HEAD'],
        'reset puts HEAD back where it was when you started the bisect and forgets the recorded bounds.'
      ),
      MATCH(
        'Pair each command with what it leaves behind',
        [
          { left: 'git restore --staged', right: 'Edits kept, changes unstaged' },
          { left: 'git revert', right: 'History kept, plus an inverse commit' },
          { left: 'git commit --amend', right: 'A replaced commit, safe only before publishing' },
          { left: 'git reset --hard', right: 'Nothing of the discarded working tree' },
          { left: 'git stash push', right: 'A saved snapshot and a clean working tree' },
        ],
        'Before running an undo, know what survives it. That single habit is most of Git safety.'
      ),
      TEXT(
        'You need a hotfix on top of the released version 2.1.0. Type the command that starts a branch from that tag, named hotfix/sessions.',
        ['git switch -c hotfix/sessions v2.1.0'],
        'A branch can start at any commit-ish, including a tag. The older spelling git checkout -b hotfix/sessions v2.1.0 does the same job.'
      ),
      BUILD(
        'Assemble the command that finds where HEAD has been over the last thirty days',
        ['git reflog', '--since=30 days'],
        ['git reflog', '--since=30 days', '--staged', 'git stash', 'git revert'],
        'git reflog --since="30 days". The reflog is a per-clone record, so it only holds what your own machine has done.'
      ),
    ],
  },

  'git-final': {
    id: 'git-final',
    title: 'Git final exam',
    theory: [
      'The final covers the whole course: the snapshot model, branching and merging, remotes and pull requests, and the recovery commands that keep work reversible.',
      'Every item below restates something taught in the two units. Answer from memory, and use the explanation after each one to find the lesson to revisit.',
    ],
    questions: [
      MCQ(
        'Why is a branch in Git described as a cheap operation?',
        'It is only a small movable pointer to an existing commit',
        [
          'It is only a small movable pointer to an existing commit',
          'It stores a compressed copy of the changed files',
          'It creates a new working directory for the project',
          'It asks the remote to reserve a slot for the name',
        ],
        'Creating a branch writes one ref, so thousands of branches cost almost nothing. Files are only copied when you switch and the content differs.'
      ),
      MCQ(
        'You ran git pull and now want the changes integrated by replaying your own commits on top. What should you have used, or what do you do now?',
        'Use git pull --rebase, or rebase the current branch onto the fetched tip',
        [
          'Use git pull --rebase, or rebase the current branch onto the fetched tip',
          'Run git merge --abort and delete the remote ref',
          'Run git reset --hard and start again from origin',
          'Force push so the server keeps your version',
        ],
        'pull --rebase fetches and replays your commits, giving a linear history. A merge commit is not wrong, just not what you wanted.'
      ),
      MCQ(
        'What does git log show that git reflog does not?',
        'The reachable commit history of a branch, rather than where HEAD has stood',
        [
          'The reachable commit history of a branch, rather than where HEAD has stood',
          'Commit history is the same data in both commands',
          'The diff of every file ever deleted from the branch',
          'The remote branches that have been force pushed',
        ],
        'git log walks parent pointers from a commit. git reflog lists ref movements recorded locally, including commits no longer on any branch.'
      ),
      MCQ(
        'A file must stop being tracked but stay in the working directory. Which command?',
        'git rm --cached <path>',
        ['git rm --cached <path>', 'git rm <path>', 'git restore <path>', 'git clean -fd <path>'],
        'The --cached form removes only the index entry. Plain git rm deletes the file from disk too, and git clean removes untracked files.'
      ),
      MATCH(
        'Pair each situation with the Git concept it exercises',
        [
          { left: 'Two branches changed the same lines', right: 'Merge conflict resolution' },
          { left: 'Push rejected as non-fast-forward', right: 'Fetch and integrate first' },
          { left: 'Release must stay reproducible', right: 'Annotated tag' },
          { left: 'Unknown commit introduced a failure', right: 'Bisect range with good and bad' },
          { left: 'Unrelated edits block a switch', right: 'Stash the working tree' },
        ],
        'The exam is really this mapping: recognise the situation, name the mechanism, then pick the reversible command.'
      ),
      TEXT(
        'Explain in at most fifteen words why you revert instead of rewriting a commit that other people have pulled.',
        ['Rewriting breaks their copies, revert adds history'],
        'Published history is shared. A new inverse commit moves everyone forward together instead of forcing each clone to be repaired.'
      ),
      BUILD(
        'Assemble the command that publishes your current branch and sets the upstream for later pushes',
        ['git push -u origin', 'HEAD'],
        ['git push -u origin', 'HEAD', 'git fetch', '--all', 'git switch -c'],
        'git push -u origin HEAD. The -u records the upstream so later git push and git status know which remote ref to compare against.'
      ),
    ],
  },

  /* ---------------- Labs that run in the offline Git VM ---------------- */

  'git-lab-branch': {
    id: 'git-lab-branch',
    title: 'Lab: branch, publish, and prove it',
    theory: [
      'A branch is a one-line file that holds a commit id, which is why creating one is instant and why deleting one loses nothing by itself. The work lives in the commits; the branch is only a movable label pointing at one of them, and HEAD is a pointer to the label you are standing on.',
      'This lab runs in the offline Git VM, so the repository it grades is a real one. Three tasks, three checks against repository state: the clone exists, git branch --show-current prints feature-1, and git branch -r lists origin/feature-1. Nothing counts as done because you typed a command; it counts because the repository changed.',
      'Publishing is two decisions, not one. git push copies commits; the -u flag records an upstream link so that later git push and git status know which remote ref to compare your branch against. A branch that exists only on your machine is a private idea, which is the difference between a local branch and a published one.',
    ],
    questions: [
      {
        kind: 'terminal' as const,
        prompt:
          'In the terminal: clone your fork of git-playground, create and switch to a branch named feature-1, then push it to origin with its upstream set. Each task is verified against the repository the VM actually builds.',
        correctChain: ['Complete every task in the terminal'],
        scrambledTokens: [],
        explain:
          'The VM re-reads the repository after every command: the .git folder, the current branch name, and the remote refs. Only state counts, so a command that failed silently cannot tick a task.',
        terminal: { scenarioId: 'labex-git-create-a-new-branch' },
      },
      MCQ(
        'What two things does git checkout -b feature-1 do?',
        'It creates the branch feature-1 at your current commit and moves HEAD onto it',
        [
          'It creates the branch feature-1 at your current commit and moves HEAD onto it',
          'It creates the branch and pushes it to origin',
          'It copies every commit from the branch it was created on',
          'It creates the branch at the newest commit in the repository',
        ],
        'The branch starts where you are standing, not at the newest commit in the whole repository. Pushing is a separate act, which is why an unpushed branch stays local.'
      ),
      BUILD(
        'Assemble the command that publishes your current branch and records its upstream in one step',
        ['git push -u origin', 'feature-1'],
        ['git push -u origin', 'feature-1', 'git clone origin', '--set-upstream-branch', 'git remote add'],
        'git push -u origin feature-1. Without -u the commits still travel, but the next push has to name the remote and branch again because no upstream was recorded.'
      ),
      MATCH(
        'Pair each Git name with the thing it actually is',
        [
          { left: 'feature-1', right: 'A label on one commit, stored as a 40-character file' },
          { left: 'origin/feature-1', right: 'Your memory of where the remote branch was at your last fetch' },
          { left: 'HEAD', right: 'The pointer to the branch you are currently on' },
          { left: 'upstream', right: 'The remote branch a local branch is configured to track' },
        ],
        'A local branch, a remote-tracking branch, and the remote branch itself are three different things. Confusing the first two is where most push-and-pull panic starts.'
      ),
      TEXT(
        'Which single command prints only the name of the branch you are on, with no asterisk and no list? Type it in full.',
        ['git branch --show-current'],
        'git branch --show-current prints one line: the current branch name, and nothing at all when HEAD is detached — a useful signal in scripts.',
        { placeholder: 'git branch …' }
      ),
    ],
  },

  'git-lab-stash': {
    id: 'git-lab-stash',
    title: 'Lab: park unfinished work and bring it back',
    theory: [
      'A stash entry is a commit-like object holding your index and working-tree state, kept on its own ref rather than on your branch. That is what makes it safe to switch branches mid-edit: the unfinished work leaves the working directory without becoming a commit you did not mean to make.',
      'This lab runs in the offline Git VM and grades the outcome, not the typing. The checks are that git stash list shows On feature: My changes, and that after you return to feature the stashed line is back in README.md. A stash you cannot find again is the same as work you threw away, which is why the message is part of the task.',
      'Learn three verbs and stay out of trouble: git stash push -m names an entry, git stash apply restores it while keeping the entry, and git stash pop restores and drops it. List before you pop, because pop always takes the most recent entry, and applying the wrong one is a merge you did not plan.',
    ],
    questions: [
      {
        kind: 'terminal' as const,
        prompt:
          'In the terminal: clone git-playground, append the line “Some changes” to README.md while on feature, stash it with the message “My changes”, then go back to feature and reapply it. Every task is verified against the repository the VM builds.',
        correctChain: ['Complete every task in the terminal'],
        scrambledTokens: [],
        explain:
          'The VM reads git stash list and the contents of README.md. Both halves matter: an entry that exists and content that came back — a stash left unapplied is a task half done.',
        terminal: { scenarioId: 'labex-git-create-a-git-stash' },
      },
      MCQ(
        'Why does git stash make the working directory clean?',
        'It saves the index and working-tree changes as an object on a stash ref, then resets the files to HEAD',
        [
          'It saves the index and working-tree changes as an object on a stash ref, then resets the files to HEAD',
          'It commits the changes to a hidden branch it deletes on checkout',
          'It copies the files to a temporary folder outside the repository',
          'It marks the files as ignored until you pop them',
        ],
        'The stash ref (refs/stash) holds the saved state inside .git, so it travels with the repository but stays off your branch history.'
      ),
      MCQ(
        'What is the practical difference between git stash apply and git stash pop?',
        'apply restores the entry and keeps it in the list; pop restores it and drops it',
        [
          'apply restores the entry and keeps it in the list; pop restores it and drops it',
          'pop works on any entry, apply only on the newest one',
          'apply restores tracked files, pop restores untracked ones',
          'They are aliases with identical behaviour',
        ],
        'apply is the reversible choice: if the restore conflicts, the entry is still in the list. pop is tidier but you have to reach for the reflog if it goes wrong.'
      ),
      BUILD(
        'Assemble the command that stores your current changes with a searchable message',
        ['git stash push', '-m', '"work on player volume"'],
        ['git stash push', '-m', '"work on player volume"', 'git stash clear', 'git commit', '--all'],
        'git stash push -m “work on player volume”. An unnamed stash becomes WIP on feature, which tells you nothing three entries later.'
      ),
      MATCH(
        'Pair each command with what it does to a stash entry',
        [
          { left: 'git stash list', right: 'Shows every stored entry with its message and origin branch' },
          { left: 'git stash show -p stash@{1}', right: 'Prints the diff stored in that specific entry' },
          { left: 'git stash drop stash@{2}', right: 'Deletes one entry without restoring it' },
          { left: 'git stash clear', right: 'Empties the whole stash list at once' },
        ],
        'Entries are addressed by position and renumber when one is removed, so name the entry you mean and check the list again after you delete.'
      ),
    ],
  },

  'git-lab-undo': {
    id: 'git-lab-undo',
    title: 'Lab: undo a commit other people can see',
    theory: [
      'There are two ways to take something back. git reset moves your branch pointer backwards and leaves the old commits unreachable, which rewrites history. git revert keeps the history and adds a new commit whose changes are the inverse of the one you named. Both undo the change; only one of them is honest to your collaborators.',
      'Once commits are pushed, other people have built on them. If you reset and force-push, their next pull replays work onto a history that no longer exists, and their merge conflicts become your bug report. Revert costs one extra commit in the log and cannot strand anybody — which is why the default answer on a shared branch is a revert.',
      'The VM grades this lab on three facts at once: file2.txt no longer exists on disk, the newest commit message starts with Revert, and the working tree is clean. That last one matters because a half-applied revert is exactly the state people describe as “I undid it but nothing changed”.',
    ],
    questions: [
      {
        kind: 'terminal' as const,
        prompt:
          'In the terminal: clone git-playground and take back its newest commit without rewriting history, so file2.txt is gone, the log records the reversal, and the working tree is clean. Tasks are verified against the repository the VM builds.',
        correctChain: ['Complete every task in the terminal'],
        scrambledTokens: [],
        explain:
          'The check reads the files, git log -1 and git status. A reverted commit plus a clean tree is the only state that counts, because that is the state the next person clones.',
        terminal: { scenarioId: 'labex-git-undo-the-last-commit' },
      },
      MCQ(
        'Your branch is public and the newest commit is wrong. Why prefer git revert HEAD over git reset --hard HEAD~1?',
        'revert adds a new commit, so nobody else has a history that no longer exists',
        [
          'revert adds a new commit, so nobody else has a history that no longer exists',
          'revert is faster because it does not touch the working tree',
          'reset only works on branches that have never been pushed',
          'revert also deletes the original commit from the object database',
        ],
        'reset rewrites which commits are reachable; revert keeps the record and moves forwards. The cost of revert is an extra log line, and the reward is that every clone of the branch agrees on history.'
      ),
      TEXT(
        'Type the command that undoes your newest commit by creating a new commit that reverses it.',
        ['git revert HEAD'],
        'git revert HEAD. Add --no-edit to accept the generated message in scripts and in a hurry.',
        { placeholder: 'git revert …' }
      ),
      MCQ(
        'git revert stops with conflicts. What does the repository look like at that moment?',
        'A revert is in progress: the conflicted files are marked, and the reversal is not committed yet',
        [
          'A revert is in progress: the conflicted files are marked, and the reversal is not committed yet',
          'The original commit has already been deleted',
          'The branch pointer has moved back one commit',
          'Nothing happened, and the files are unchanged',
        ],
        'Resolve the files and git revert --continue, or give up with git revert --abort to return exactly where you started. A revert is a normal commit in the making, so it can be finished or abandoned.'
      ),
      MATCH(
        'Pair each undo with the situation it fits',
        [
          { left: 'git restore README.md', right: 'Throw away uncommitted edits in one file' },
          { left: 'git restore --staged README.md', right: 'Unstage a file while keeping the edits' },
          { left: 'git commit --amend', right: 'Rewrite the newest commit before anyone has it' },
          { left: 'git revert HEAD', right: 'Undo a commit that other people have already pulled' },
          { left: 'git reflog', right: 'Find a commit that no branch points at any more' },
        ],
        'Each undo has a scope: the file, the index, one commit, shared history, or your own pointer trail. Choosing the scope is the whole skill.'
      ),
    ],
  },
};