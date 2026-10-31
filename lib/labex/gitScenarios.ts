/**
 * Runnable Git labs. Each scenario is authored from the upstream lab's own
 * setup, tasks and solution (30-seconds-of-git, CC-BY-4.0), then executed by
 * scripts/check-vm.cjs: the reference solution must satisfy every check and
 * the untouched starting state must fail at least one, so a lab can only ship
 * if it is solvable and non-trivial.
 */

import type { LabScenario } from '../vm/scenario';

const PLAYGROUND = 'https://github.com/labex-labs/git-playground';
const REPO = 'git-playground';
const DIR = '/home/labex/project/git-playground';

function clone(url = PLAYGROUND): string {
  return `git clone ${url}`;
}

const FORK = 'https://github.com/your-username/git-playground';

/** Setup script lines, run from the project folder. */
function seeded(...lines: string[]): string {
  return ['cd /home/labex/project', ...lines].join('\n');
}

/** A check that runs inside the playground clone. */
function inRepo(command: string): string {
  return `cd ${DIR} && ${command}`;
}

/** The learner typed this command at least once (history persists in the VM). */
function typed(needle: string): string {
  return `grep -q "${needle}" /home/labex/.zsh_history`;
}

function solved(...lines: string[]): string[] {
  return [clone(), `cd ${REPO}`, ...lines];
}

function forked(...lines: string[]): string[] {
  return [clone(FORK), `cd ${REPO}`, ...lines];
}

/** Reference solution for a scenario whose setup already cloned the repo. */
function repo(...lines: string[]): string[] {
  return [`cd ${DIR}`, ...lines];
}


export const GIT_SCENARIOS: Record<string, LabScenario> = {
  'labex-git-apply-the-latest-stash': {
    id: 'labex-git-apply-the-latest-stash',
    title: 'Apply the Latest Stash',
    brief:
      'You need to switch tasks without losing uncommitted work. Stash the pending change, confirm it is stored, then bring it back with the latest-stash shortcut.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} into your project folder.`,
        check: `test -d ${DIR}/.git`,
        hint: 'A clone creates the git-playground folder inside your current directory.',
      },
      {
        id: 'stash',
        text: 'Append the line “This is a new line” to README.md, then stash the change.',
        check: `cd ${DIR} && git stash list | grep -q "WIP on master"`,
        hint: 'Edit the file first, then run git stash. The stash entry is listed by git stash list.',
      },
      {
        id: 'apply',
        text: 'Apply the most recent stash and confirm the line is back in README.md.',
        check: `cd ${DIR} && grep -q "This is a new line" README.md`,
        hint: 'git stash apply without an index reapplies stash@{0}.',
      },
    ],
    solution: [
      clone(),
      `cd ${REPO}`,
      'echo "This is a new line" >> README.md',
      'git stash',
      'git stash list',
      'git stash apply',
      'grep "This is a new line" README.md',
    ],
  },

  'labex-git-apply-a-stash': {
    id: 'labex-git-apply-a-stash',
    title: 'Apply a Stash',
    brief:
      'The feature branch already holds a stash called “my changes”. Fix a bug on master, stash that work too, then return to the feature branch and reapply the older stash by index.',
    setup: [
      `cd /home/labex/project`,
      `git clone ${PLAYGROUND}`,
      `cd ${REPO}`,
      'git checkout -b feature-branch',
      'echo "some changes" >> README.md',
      'git stash save "my changes"',
    ].join('\n'),
    cwd: '/home/labex/project',
    tasks: [
      {
        id: 'bugfix',
        text: 'Switch to master, set file1.txt to "hello,world", and stash that fix with the message "fix the bug".',
        check: `cd ${DIR} && git stash list | grep -q "fix the bug"`,
        hint: 'git stash save "fix the bug" records the message shown in git stash list.',
      },
      {
        id: 'feature',
        text: 'Switch to feature-branch and apply the stash whose message is "my changes".',
        check: `cd ${DIR} && test "$(git branch --show-current)" = "feature-branch" && grep -q "some changes" README.md`,
        hint: 'That stash is older than the one you just saved, so it is stash@{1}.',
      },
    ],
    solution: [
      `cd ${REPO}`,
      'git checkout master',
      'echo "hello,world" > file1.txt',
      'git stash save "fix the bug"',
      'git checkout feature-branch',
      'git stash list',
      'git stash apply stash@{1}',
    ],
  },

  'labex-git-configure-git-user-information': {
    id: 'labex-git-configure-git-user-information',
    title: 'Configure Git User Information',
    brief:
      'Every commit you create is signed with an identity. Set the repository-local name and email that later labs will reuse.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'identity',
        text: 'Set user.name to "Jane Doe" and user.email to "jane.doe@example.com" for this repository.',
        check: `cd ${DIR} && git config --list | grep -q "user.name=Jane Doe" && git config --list | grep -q "user.email=jane.doe@example.com"`,
        hint: 'Omit --global so the identity stays scoped to this repository.',
      },
    ],
    solution: [clone(), `cd ${REPO}`, 'git config user.name "Jane Doe"', 'git config user.email "jane.doe@example.com"'],
  },

  'labex-git-create-a-new-branch': {
    id: 'labex-git-create-a-new-branch',
    title: 'Create a New Branch',
    brief:
      'Fork the playground into your own account, create the feature-1 branch, and publish it so collaborators can see it on the remote.',
    tasks: [
      {
        id: 'clone',
        text: 'Clone https://github.com/your-username/git-playground into your project folder.',
        check: `test -d ${DIR}/.git && cd ${DIR} && git remote -v | grep -q your-username`,
        hint: 'The forked URL points at your-username, not labex-labs.',
      },
      {
        id: 'branch',
        text: 'Create and switch to a branch named feature-1.',
        check: `cd ${DIR} && test "$(git branch --show-current)" = "feature-1"`,
        hint: 'git checkout -b creates the branch and switches to it in one step.',
      },
      {
        id: 'push',
        text: 'Push feature-1 to origin and set its upstream.',
        check: `cd ${DIR} && git branch -r | grep -q "origin/feature-1"`,
        hint: 'git push -u origin feature-1 publishes the branch and records the tracking link.',
      },
    ],
    solution: [
      `git clone https://github.com/your-username/git-playground`,
      `cd ${REPO}`,
      'git checkout -b feature-1',
      'git branch',
      'git push -u origin feature-1',
    ],
  },

  'labex-git-automate-upstream-branch-creation': {
    id: 'labex-git-automate-upstream-branch-creation',
    title: 'Automate Upstream Branch Creation',
    brief:
      'Pushing a brand-new branch should be a single command. Set push.default to current, then publish new-feature without spelling out origin and the branch name.',
    tasks: [
      {
        id: 'clone',
        text: 'Clone your fork (https://github.com/your-username/git-playground) into your project folder.',
        check: `test -d ${DIR}/.git && cd ${DIR} && git remote -v | grep -q your-username`,
        hint: 'The fork URL contains your-username.',
      },
      {
        id: 'config',
        text: 'Set push.default to current for this repository.',
        check: inRepo('test "$(git config push.default)" = "current"'),
        hint: 'git config push.default current writes the setting into .git/config.',
      },
      {
        id: 'push',
        text: 'Create new-feature and publish it with a plain git push.',
        check: inRepo('test "$(git branch --show-current)" = "new-feature" && git branch -r | grep -q "origin/new-feature"'),
        hint: 'With push.default=current, git push uses the current branch as the remote name.',
      },
    ],
    solution: forked('git config push.default current', 'git checkout -b new-feature', 'git push'),
  },

  'labex-git-find-branches-containing-a-commit': {
    id: 'labex-git-find-branches-containing-a-commit',
    title: 'Find Branches Containing a Commit',
    brief:
      'The playground has four branches sitting on the same history. Ask Git which branches contain the newest commit instead of comparing hashes by hand.',
    setup: seeded(clone(), `cd ${REPO}`, 'git branch new-branch', 'git branch new-branch-1', 'git branch new-branch-2'),
    tasks: [
      {
        id: 'inspect',
        text: 'List every branch that contains the current commit (Added file2.txt).',
        check: `${inRepo('git branch --contains HEAD | grep -q "new-branch-1"')} && ${typed('git branch --contains')}`,
        hint: 'git branch --contains <commit> accepts HEAD as the revision.',
      },
    ],
    solution: repo('git branch --contains HEAD'),
  },

  'labex-git-find-branches-not-containing-a-commit': {
    id: 'labex-git-find-branches-not-containing-a-commit',
    title: 'Find Branches Not Containing a Commit',
    brief:
      'Commit a change on a fresh branch, then ask which branches are missing that commit. This is how you spot branches that still need a fix.',
    tasks: [
      {
        id: 'commit',
        text: 'Create new-branch, set file1.txt to "hello,world", and commit with the message "Create a new-branch branch".',
        check: inRepo('git log new-branch | grep -q "Create a new-branch branch"'),
        hint: 'git commit -am stages the tracked file and commits in one step.',
      },
      {
        id: 'inspect',
        text: 'List the branches that do not contain your new commit.',
        check: `${inRepo('git branch --no-contains HEAD | grep -q master')} && ${typed('no-contains')}`,
        hint: 'git branch --no-contains HEAD is the complement of --contains.',
      },
    ],
    solution: solved(
      'git checkout -b new-branch',
      'echo "hello,world" > file1.txt',
      'git commit -am "Create a new-branch branch"',
      'git branch --no-contains HEAD'
    ),
  },

  'labex-git-change-the-remote-url': {
    id: 'labex-git-change-the-remote-url',
    title: 'Change the Remote URL',
    brief:
      'The playground was cloned from labex-labs, but your work belongs in your own fork. Repoint origin at your fork and confirm the new URL.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} into your project folder.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'repoint',
        text: 'Change origin to https://github.com/your-username/git-playground.',
        check: inRepo('test "$(git config --get remote.origin.url)" = "https://github.com/your-username/git-playground"'),
        hint: 'git remote set-url origin <url> rewrites remote.origin.url.',
      },
    ],
    solution: solved('git remote set-url origin https://github.com/your-username/git-playground', 'git remote -v'),
  },

  'labex-git-change-the-last-commit-s-author': {
    id: 'labex-git-change-the-last-commit-s-author',
    title: "Change the Last Commit's Author",
    brief:
      'The newest commit carries the wrong identity. Rewrite only its author while keeping the message and file contents exactly as they are.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'author',
        text: 'Amend the last commit so its author is Duck Quackers <cool.duck@qua.ck>, keeping the message.',
        check: inRepo('git log -1 | grep -q "Author: Duck Quackers <cool.duck@qua.ck>"'),
        hint: 'git commit --amend --author="Name <email>" --no-edit keeps the existing message.',
      },
    ],
    solution: solved(
      'git config user.name "Hang"',
      'git config user.email "hang@example.com"',
      'git commit --amend --author="Duck Quackers <cool.duck@qua.ck>" --no-edit'
    ),
  },

  'labex-git-copy-a-file-from-another-branch': {
    id: 'labex-git-copy-a-file-from-another-branch',
    title: 'Copy a File from Another Branch',
    brief:
      'hello.txt exists on feature-1 but feature-2 needs it too. Copy the file across branches with checkout instead of merging the whole branch.',
    tasks: [
      {
        id: 'source',
        text: 'On feature-1, create hello.txt containing "hello,world" and commit it with the message "add hello.txt".',
        check: inRepo('git log feature-1 | grep -q "add hello.txt"'),
        hint: 'Create the branch, write the file, stage it and commit.',
      },
      {
        id: 'copy',
        text: 'On feature-2, copy hello.txt from feature-1 and commit it with the message "copy hello.txt".',
        check: inRepo('test "$(git branch --show-current)" = "feature-2" && git log -1 | grep -q "copy hello.txt" && grep -q "hello,world" hello.txt'),
        hint: 'git checkout feature-1 hello.txt copies the file into the index and worktree.',
      },
    ],
    solution: solved(
      'git checkout -b feature-1',
      'echo "hello,world" > hello.txt',
      'git add .',
      'git commit -m "add hello.txt"',
      'git checkout master',
      'git checkout -b feature-2',
      'git checkout feature-1 hello.txt',
      'git commit -am "copy hello.txt"'
    ),
  },

  'labex-git-create-an-empty-commit': {
    id: 'labex-git-create-an-empty-commit',
    title: 'Create an Empty Commit',
    brief:
      'Sometimes a commit is a bookmark, not a change — a build trigger or a checkpoint. Create one with no file modifications at all.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'empty',
        text: 'Create an empty commit with the message "Empty commit".',
        check: inRepo('git log -1 | grep -q "Empty commit" && ! git log --name-status HEAD^..HEAD | grep -q "file"'),
        hint: 'git commit --allow-empty lets Git record a commit whose tree matches its parent.',
      },
    ],
    solution: solved('git commit --allow-empty -m "Empty commit"', 'git log --name-status HEAD^..HEAD'),
  },

  'labex-git-create-your-first-git-repository': {
    id: 'labex-git-create-your-first-git-repository',
    title: 'Create Your First Git Repository',
    brief:
      'Every repository starts with git init. Turn the empty my_project folder into a working Git repository and prove .git exists.',
    setup: 'mkdir /home/labex/project/my_project',
    tasks: [
      {
        id: 'init',
        text: 'Initialize a Git repository in ~/project/my_project.',
        check: 'test -d /home/labex/project/my_project/.git && cd /home/labex/project/my_project && git status | grep -q "On branch"',
        hint: 'Run git init my_project from the project folder, or git init from inside it.',
      },
    ],
    solution: ['cd /home/labex/project', 'git init my_project'],
  },

  'labex-git-delete-a-branch': {
    id: 'labex-git-delete-a-branch',
    title: 'Delete a Branch',
    brief:
      'feature-1 has served its purpose. Delete it safely with the merged-only form of branch deletion.',
    setup: seeded(clone(), `cd ${REPO}`, 'git branch feature-1'),
    tasks: [
      {
        id: 'delete',
        text: 'Delete the feature-1 branch.',
        check: inRepo('! git branch | grep -q feature-1 && git branch | grep -q master'),
        hint: 'git branch -d refuses to delete unmerged work, which is exactly what you want here.',
      },
    ],
    solution: repo('git branch', 'git branch -d feature-1', 'git branch'),
  },

  'labex-git-delete-detached-branches': {
    id: 'labex-git-delete-detached-branches',
    title: 'Delete Detached Branches',
    brief:
      'After the upstream feature-branch disappears, your local copy becomes a detached leftover. Track it, delete it on the remote, then clean up locally.',
    tasks: [
      {
        id: 'remote',
        text: 'Delete the feature-branch branch on origin.',
        check: inRepo('! git branch -r | grep -q "origin/feature-branch"'),
        hint: 'Check it out first so a local branch tracks it, then git push origin --delete feature-branch.',
      },
      {
        id: 'local',
        text: 'Return to master and delete your local feature-branch.',
        check: inRepo('test "$(git branch --show-current)" = "master" && ! git branch | grep -q feature-branch'),
        hint: 'git branch -D removes a branch even when it no longer has a live upstream.',
      },
      {
        id: 'inspect',
        text: 'Inspect the tracking relationship with git branch -vv before deleting.',
        check: typed('git branch -vv'),
        hint: 'Lines ending in [origin/feature-branch: gone] show a stale upstream.',
      },
    ],
    solution: solved(
      'git checkout feature-branch',
      'git branch -vv',
      'git push origin --delete feature-branch',
      'git checkout master',
      'git branch -D feature-branch',
      'git branch'
    ),
  },

  'labex-git-delete-merged-branches': {
    id: 'labex-git-delete-merged-branches',
    title: 'Delete Merged Branches',
    brief:
      'Four temporary branches all point at merged history. List what is merged, then delete every one of them in a single command.',
    setup: seeded(
      clone(),
      `cd ${REPO}`,
      'git checkout -b new-branch',
      'git checkout -b new-branch-1',
      'git checkout -b new-branch-2',
      'git checkout -b new-branch-3',
      'git checkout master'
    ),
    tasks: [
      {
        id: 'cleanup',
        text: 'Delete all four new-branch branches, leaving only master.',
        check: inRepo('! git branch | grep -q new-branch && git branch | grep -q master'),
        hint: 'git branch --merged lists them; git branch -d accepts several names at once.',
      },
    ],
    solution: repo('git branch --merged', 'git branch -d new-branch new-branch-1 new-branch-2 new-branch-3', 'git branch'),
  },

  'labex-git-delete-a-remote-branch': {
    id: 'labex-git-delete-a-remote-branch',
    title: 'Delete a Remote Branch',
    brief:
      'feature-branch was merged and is no longer needed on origin. Publish your local copy, then delete the remote branch without losing your local work.',
    tasks: [
      {
        id: 'clone',
        text: 'Clone your fork (https://github.com/your-username/git-playground) into your project folder.',
        check: `test -d ${DIR}/.git && cd ${DIR} && git remote -v | grep -q your-username`,
        hint: 'The fork URL contains your-username.',
      },
      {
        id: 'publish',
        text: 'Create feature-branch and push it with upstream tracking.',
        check: inRepo('git branch | grep -q feature-branch && test "$(git config branch.feature-branch.remote)" = "origin"'),
        hint: 'git push -u origin feature-branch records the tracking link.',
      },
      {
        id: 'delete',
        text: 'Delete feature-branch on origin and confirm it is gone from git branch -r.',
        check: inRepo('! git branch -r | grep -q "origin/feature-branch"'),
        hint: 'git push -d origin feature-branch deletes the remote ref and its tracking ref.',
      },
    ],
    solution: forked(
      'git checkout -b feature-branch',
      'git push -u origin feature-branch',
      'git branch -r',
      'git push -d origin feature-branch',
      'git branch -r'
    ),
  },

  'labex-git-disable-fast-forward-merging': {
    id: 'labex-git-disable-fast-forward-merging',
    title: 'Disable Fast-Forward Merging',
    brief:
      'A fast-forward hides where a feature landed. Configure merge.ff=false so Git always records a merge commit, then merge my-branch.',
    tasks: [
      {
        id: 'branch',
        text: 'Create my-branch, add hello.txt containing "hello,world", and commit with "Added hello.txt".',
        check: inRepo('git log my-branch | grep -q "Added hello.txt"'),
        hint: 'Create the branch first, then write, stage and commit the file.',
      },
      {
        id: 'merge',
        text: 'Disable fast-forward merges and merge my-branch into master.',
        check: inRepo('test "$(git config merge.ff)" = "false" && git log --oneline | grep -q "Merge branch .my-branch."'),
        hint: 'git config --add merge.ff false, then git merge my-branch from master.',
      },
    ],
    solution: solved(
      'git checkout -b my-branch',
      'echo "hello,world" > hello.txt',
      'git add .',
      'git commit -m "Added hello.txt"',
      'git config --add merge.ff false',
      'git checkout master',
      'git merge my-branch'
    ),
  },

  'labex-git-discard-uncommitted-changes': {
    id: 'labex-git-discard-uncommitted-changes',
    title: 'Discard Uncommitted Changes',
    brief:
      'A staged experiment is no longer wanted. Throw away every uncommitted change and return the working tree to the last commit.',
    tasks: [
      {
        id: 'discard',
        text: 'Create hello.txt containing "hello,world", stage it, then discard it so the working tree is clean again.',
        check: inRepo('git status | grep -q "nothing to commit, working tree clean" && ! test -f hello.txt'),
        hint: 'git reset --hard HEAD resets the index and the worktree to HEAD.',
      },
    ],
    solution: solved(
      'echo "hello,world" > hello.txt',
      'git add .',
      'git status',
      'git reset --hard HEAD',
      'git status'
    ),
  },

  'labex-git-discard-untracked-changes': {
    id: 'labex-git-discard-untracked-changes',
    title: 'Discard Untracked Changes',
    brief:
      'new-file.txt is untracked clutter. Remove untracked files — including any empty directories — without touching the commit history.',
    setup: seeded(clone(), `cd ${REPO}`, 'touch new-file.txt'),
    tasks: [
      {
        id: 'clean',
        text: 'Discard every untracked file so git status reports a clean tree.',
        check: inRepo('git status | grep -q "nothing to commit, working tree clean" && ! test -f new-file.txt'),
        hint: 'git clean -f removes untracked files; add -d to include untracked directories.',
      },
    ],
    solution: repo('git status', 'git clean -f -d', 'git status'),
  },

  'labex-git-fetch-latest-changes-from-remote': {
    id: 'labex-git-fetch-latest-changes-from-remote',
    title: 'Fetch Latest Changes from Remote',
    brief:
      'Another developer published fetch-branch. Download the new remote state without merging it into your working branch.',
    tasks: [
      {
        id: 'publish',
        text: 'Create fetch-branch with a hello.txt containing "hello, world" and publish it to origin.',
        check: inRepo('git branch -r | grep -q "origin/fetch-branch" && git log origin/fetch-branch | grep -q "Create hello.txt"'),
        hint: 'Commit first, then push with -u so the branch is tracked.',
      },
      {
        id: 'cleanup',
        text: 'Delete your local fetch-branch but keep the remote-tracking ref.',
        check: inRepo('! git branch | grep -q fetch-branch'),
        hint: 'git checkout master then git branch -D fetch-branch.',
      },
      {
        id: 'fetch',
        text: 'Run git fetch and read the log of origin/fetch-branch.',
        check: `${inRepo('git log origin/fetch-branch | grep -q "Create hello.txt"')} && ${typed('git fetch')}`,
        hint: 'fetch only updates refs/remotes; it never changes your working tree.',
      },
    ],
    solution: solved(
      'git checkout -b fetch-branch',
      'echo "hello, world" > hello.txt',
      'git add .',
      'git commit -m "Create hello.txt"',
      'git push -u origin fetch-branch',
      'git checkout master',
      'git branch -D fetch-branch',
      'git fetch',
      'git branch -r',
      'git log origin/fetch-branch'
    ),
  },

  'labex-git-find-lost-files': {
    id: 'labex-git-find-lost-files',
    title: 'Find Lost Files',
    brief:
      'A branch was deleted after committing a file removal. Recover the unreachable commit with git fsck --lost-found before garbage collection runs.',
    tasks: [
      {
        id: 'recover',
        text: 'On one-branch, delete file2.txt and commit with the message "Remove file2". Then leave the branch and recover the dangling commit with git fsck --lost-found.',
        check: inRepo('! git branch | grep -q one-branch && test -d .git/lost-found/commit && grep -rl "Remove file2" .git/lost-found/commit | grep -q .'),
        hint: 'Deleting the branch makes its commits unreachable; git fsck --lost-found writes them to .git/lost-found/commit.',
      },
    ],
    solution: solved(
      'git checkout -b one-branch',
      'git rm file2.txt',
      'git commit -m "Remove file2"',
      'git checkout master',
      'git branch -D one-branch',
      'git fsck --lost-found',
      'ls .git/lost-found/commit'
    ),
  },

  'labex-git-update-remote-branch-after-rewriting-history': {
    id: 'labex-git-update-remote-branch-after-rewriting-history',
    title: 'Update Remote Branch After Rewriting History',
    brief:
      'Amending the newest commit creates a new history that the remote refuses. See the rejection, then force the update.',
    tasks: [
      {
        id: 'amend',
        text: 'Rename the newest commit (Added file2.txt) to "Update file2.txt".',
        check: inRepo('git log -1 | grep -q "Update file2.txt"'),
        hint: 'git commit --amend -m "Update file2.txt" replaces the message.',
      },
      {
        id: 'force',
        text: 'Push the rewritten history to origin/master with a force push.',
        check: inRepo('git log origin/master | grep -q "Update file2.txt" && ! git log origin/master | grep -q "Added file2.txt"'),
        hint: 'A normal push is rejected; git push -f origin master updates the remote ref.',
      },
    ],
    solution: forked(
      'git commit --amend -m "Update file2.txt"',
      'git push origin master || true',
      'git push -f origin master',
      'git log origin/master'
    ),
  },

  'labex-git-configure-line-endings': {
    id: 'labex-git-configure-line-endings',
    title: 'Configure Line Endings',
    brief:
      'Mixed line endings create noisy diffs. Pin the repository to LF so every checkout uses Unix endings.',
    tasks: [
      {
        id: 'configure',
        text: 'Configure core.eol to lf for this repository.',
        check: `test -d ${DIR}/.git && test "$(cd ${DIR} && git config core.eol)" = "lf"`,
        hint: 'git config core.eol lf writes the setting into .git/config.',
      },
    ],
    solution: solved('git config core.eol lf', 'git config core.eol'),
  },

  'labex-git-list-all-git-aliases': {
    id: 'labex-git-list-all-git-aliases',
    title: 'List All Git Aliases',
    brief:
      'Aliases turn long commands into muscle memory. Define st, co and rb, then filter the configuration to show only the alias entries.',
    tasks: [
      {
        id: 'aliases',
        text: 'Define the aliases st=status, co=checkout and rb=rebase globally.',
        check: inRepo('git config --list | grep -q "alias.st=status" && git config --list | grep -q "alias.co=checkout" && git config --list | grep -q "alias.rb=rebase"'),
        hint: 'git config --global alias.<name> <command> writes to ~/.gitconfig.',
      },
      {
        id: 'list',
        text: 'List the configuration and filter it down to the alias lines.',
        check: `${inRepo('git config --list | grep -q "alias.co=checkout"')} && ${typed('git config -l | grep alias')}`,
        hint: 'git config -l prints every key; pipe it through grep alias.',
      },
    ],
    solution: solved(
      'git config --global alias.st status',
      'git config --global alias.co checkout',
      'git config --global alias.rb rebase',
      'git config -l | grep alias'
    ),
  },

  'labex-git-merge-a-branch': {
    id: 'labex-git-merge-a-branch',
    title: 'Merge a Branch',
    brief:
      'feature-branch-A holds a fix that master needs. Create the branch, commit the change, then merge it back into master and confirm both branches share the commit.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'commit',
        text: 'On feature-branch-A, append "hello,world" to file2.txt and commit with "fix file2.txt".',
        check: inRepo('git log feature-branch-A | grep -q "fix file2.txt"'),
        hint: 'git checkout -b creates the branch; then edit, add and commit.',
      },
      {
        id: 'merge',
        text: 'Switch to master and merge feature-branch-A so the fix is on both branches.',
        check: inRepo('test "$(git branch --show-current)" = "master" && git log master | grep -q "fix file2.txt"'),
        hint: 'A fast-forward merge is enough because master has not moved.',
      },
    ],
    solution: solved(
      'git checkout -b feature-branch-A',
      'echo "hello,world" >> file2.txt',
      'git add .',
      'git commit -m "fix file2.txt"',
      'git checkout master',
      'git merge feature-branch-A',
      'git log'
    ),
  },

  'labex-git-git-collaborative-version-control': {
    id: 'labex-git-git-collaborative-version-control',
    title: 'Merge a Branch and Create a Merge Commit',
    brief:
      'Two developers want an explicit record of when a feature landed. Merge feature-branch with --no-ff so Git always writes a merge commit, even though a fast-forward would work.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'feature',
        text: 'Create feature-branch, append "This is a new line." to README.md, and commit with "Add new line to README.md".',
        check: inRepo('git log feature-branch | grep -q "Add new line to README.md"'),
        hint: 'Create the branch, edit README.md, stage and commit.',
      },
      {
        id: 'merge',
        text: 'Merge feature-branch into master with a merge commit whose message is "Merge feature-branch".',
        check: inRepo('git log master | grep -q "Add new line to README.md" && git log -1 --oneline master | grep -q "Merge feature-branch"'),
        hint: 'git merge --no-ff -m "Merge feature-branch" feature-branch forces the merge commit.',
      },
    ],
    solution: solved(
      'git checkout -b feature-branch',
      'echo "This is a new line." >> README.md',
      'git add .',
      'git commit -m "Add new line to README.md"',
      'git checkout master',
      'git merge --no-ff -m "Merge feature-branch" feature-branch',
      'git log'
    ),
  },

  'labex-git-git-merge-collaborative-project-management': {
    id: 'labex-git-git-merge-collaborative-project-management',
    title: 'Git Merge Collaborative Project Management',
    brief:
      'A teammate delivered feature-branch. Merge it into master with an explicit merge commit so the collaboration history is auditable, then verify the line is present on both branches.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and configure a repository identity.`,
        check: inRepo('test -n "$(git config user.email)"'),
        hint: 'Set user.name and user.email inside the clone.',
      },
      {
        id: 'feature',
        text: 'Create feature-branch, add "This is a new line." to README.md, and commit with "Add new line to README.md".',
        check: inRepo('git log feature-branch | grep -q "Add new line to README.md"'),
        hint: 'The commit must live on feature-branch before you merge.',
      },
      {
        id: 'merge',
        text: 'Merge feature-branch into master with the merge message "Merge feature-branch".',
        check: inRepo('git log master | grep -q "Add new line to README.md" && git log --oneline master | grep -q "Merge feature-branch"'),
        hint: 'Use git merge --no-ff -m to guarantee the merge commit.',
      },
    ],
    solution: [
      clone(),
      `cd ${REPO}`,
      'git config user.name "LabEx Learner"',
      'git config user.email "learner@labex.io"',
      'git checkout -b feature-branch',
      'echo "This is a new line." >> README.md',
      'git add .',
      'git commit -m "Add new line to README.md"',
      'git checkout master',
      'git merge --no-ff -m "Merge feature-branch" feature-branch',
    ],
  },

  'labex-git-move-commits-to-a-new-branch': {
    id: 'labex-git-move-commits-to-a-new-branch',
    title: 'Move Commits to a New Branch',
    brief:
      'You committed experiment work directly to master. Point a new feature branch at that commit, then rewind master to its previous state without losing the work.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'commit',
        text: 'On master, create hello.txt containing "hello,world" and commit with "Added hello.txt".',
        check: inRepo('git log master | grep -q "Added hello.txt" || git log feature | grep -q "Added hello.txt"'),
        hint: 'Write the file, stage it, then commit.',
      },
      {
        id: 'move',
        text: 'Create feature at that commit, then reset master one commit back so the commit only lives on feature.',
        check: inRepo('git log feature | grep -q "Added hello.txt" && ! git log master | grep -q "Added hello.txt"'),
        hint: 'git branch feature captures the commit; git reset HEAD~1 --hard removes it from master.',
      },
    ],
    solution: solved(
      'git checkout master',
      'echo "hello,world" > hello.txt',
      'git add .',
      'git commit -m "Added hello.txt"',
      'git branch feature',
      'git reset HEAD~1 --hard',
      'git log --oneline',
      'git checkout feature',
      'git log --oneline'
    ),
  },

  'labex-git-applying-selective-git-commit-changes': {
    id: 'labex-git-applying-selective-git-commit-changes',
    title: 'Git Cherry-Pick',
    brief:
      'one-branch contains a change master needs, but merging would drag in everything else. Identify the commit and copy just that change onto master with cherry-pick.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'commit',
        text: 'Create one-branch with hello.txt containing "hello,world" and commit with "add hello.txt".',
        check: inRepo('git log one-branch | grep -q "add hello.txt"'),
        hint: 'Create the branch first, then write, stage and commit.',
      },
      {
        id: 'pick',
        text: 'Switch to master and cherry-pick that commit so master gains the same change.',
        check: inRepo('test "$(git branch --show-current)" = "master" && git log master | grep -q "add hello.txt" && grep -q "hello,world" hello.txt'),
        hint: 'Find the commit in git log one-branch, then git cherry-pick <hash>.',
      },
    ],
    solution: solved(
      'git checkout -b one-branch',
      'echo "hello,world" > hello.txt',
      'git add .',
      'git commit -m "add hello.txt"',
      'git log --oneline',
      'git checkout master',
      'git cherry-pick one-branch',
      'git log --oneline'
    ),
  },

  'labex-git-git-cherry-pick-code-changes': {
    id: 'labex-git-git-cherry-pick-code-changes',
    title: 'Git Cherry-Pick Code Changes',
    brief:
      'A single fix on one-branch is ready for release, but the branch as a whole is not. Cherry-pick that one commit onto master and prove the file arrived.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'commit',
        text: 'Create one-branch with hello.txt containing "hello,world" and commit with "add hello.txt".',
        check: inRepo('git log one-branch | grep -q "add hello.txt"'),
        hint: 'Create the branch first, then write, stage and commit.',
      },
      {
        id: 'pick',
        text: 'On master, cherry-pick the commit and confirm hello.txt contains "hello,world".',
        check: inRepo('test "$(git branch --show-current)" = "master" && git log master | grep -q "add hello.txt" && grep -q "hello,world" hello.txt'),
        hint: 'git cherry-pick accepts the branch name or a commit hash.',
      },
    ],
    solution: solved(
      'git checkout -b one-branch',
      'echo "hello,world" > hello.txt',
      'git add .',
      'git commit -m "add hello.txt"',
      'git log --oneline',
      'git checkout master',
      'git cherry-pick one-branch',
      'git log --oneline'
    ),
  },

  'labex-git-pull-latest-changes-from-remote': {
    id: 'labex-git-pull-latest-changes-from-remote',
    title: 'Pull Latest Changes from Remote',
    brief:
      'Your clone is parked on an old commit. Pull master from origin so the local checkout catches up with the files your teammates already published.',
    setup: seeded(clone(), `cd ${REPO}`, 'git checkout HEAD~2'),
    tasks: [
      {
        id: 'pull',
        text: 'Pull the latest master from origin so file1.txt and file2.txt appear in the working tree.',
        check: inRepo('test -f file1.txt && test -f file2.txt && git log -1 origin/master | grep -q "Added file2.txt"'),
        hint: 'git pull origin master fetches and fast-forwards the checked-out commit.',
      },
    ],
    solution: repo('git pull origin master', 'ls'),
  },

  'labex-git-push-local-changes-to-remote': {
    id: 'labex-git-push-local-changes-to-remote',
    title: 'Push Local Changes to Remote',
    brief:
      'Finish a small feature on master, commit it, and publish it to origin. The lab is complete only when origin/master contains the commit.',
    tasks: [
      {
        id: 'clone',
        text: 'Clone your fork (https://github.com/your-username/git-playground) and enter it.',
        check: `test -d ${DIR}/.git && cd ${DIR} && git remote -v | grep -q your-username`,
        hint: 'The fork URL contains your-username.',
      },
      {
        id: 'push',
        text: 'Append "hello,world" to file1.txt, commit with "Added new feature", and push origin master.',
        check: inRepo('git log master | grep -q "Added new feature" && git log origin/master | grep -q "Added new feature"'),
        hint: 'Commit locally first, then git push origin master.',
      },
    ],
    solution: forked(
      'git pull origin master',
      'echo "hello,world" >> file1.txt',
      'git add .',
      'git commit -m "Added new feature"',
      'git push origin master',
      'git log'
    ),
  },

  'labex-git-rebase-onto-another-branch': {
    id: 'labex-git-rebase-onto-another-branch',
    title: 'Rebase onto Another Branch',
    brief:
      'You committed a README change on one-branch while master sat still. Rebase master onto one-branch to keep a clean linear history instead of creating a merge commit.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'branch',
        text: 'Create one-branch, append "hello,world" to README.md, and commit with "Added some changes to README.md".',
        check: inRepo('git log one-branch | grep -q "Added some changes to README.md"'),
        hint: 'Create the branch, edit, stage and commit.',
      },
      {
        id: 'rebase',
        text: 'Switch to master and rebase it onto one-branch so both branches share the commit and no merge commit exists.',
        check: inRepo('test "$(git branch --show-current)" = "master" && git log master | grep -q "Added some changes to README.md" && ! git log --oneline master | grep -qi merge'),
        hint: 'git rebase one-branch fast-forwards master to the feature commit.',
      },
    ],
    solution: solved(
      'git checkout -b one-branch',
      'echo "hello,world" >> README.md',
      'git add .',
      'git commit -m "Added some changes to README.md"',
      'git checkout master',
      'git pull',
      'git rebase one-branch',
      'git log --oneline'
    ),
  },

  'labex-git-remove-a-file-from-the-last-commit': {
    id: 'labex-git-remove-a-file-from-the-last-commit',
    title: 'Remove a File from the Last Commit',
    brief:
      'file2.txt was committed by mistake. Remove it from the newest commit while keeping the commit message and the file on disk as an untracked file.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'remove',
        text: 'Remove file2.txt from the index and amend the last commit without changing its message.',
        check: inRepo('git log -1 | grep -q "Added file2.txt" && ! git show HEAD | grep -q "^diff" && test -f file2.txt && git status | grep -q "Untracked files"'),
        hint: 'git rm --cached file2.txt then git commit --amend --no-edit.',
      },
    ],
    solution: solved('git rm --cached file2.txt', 'git commit --amend --no-edit', 'git show HEAD'),
  },

  'labex-git-rename-remote-branch': {
    id: 'labex-git-rename-remote-branch',
    title: 'Rename Remote Branch',
    brief:
      'feature-branch needs a clearer name. Rename it locally, delete the old remote ref, and publish the new name with upstream tracking.',
    tasks: [
      {
        id: 'clone',
        text: 'Clone your fork (https://github.com/your-username/git-playground) and enter it.',
        check: `test -d ${DIR}/.git && cd ${DIR} && git remote -v | grep -q your-username`,
        hint: 'The fork URL contains your-username.',
      },
      {
        id: 'rename',
        text: 'Rename feature-branch to new-feature-1 locally.',
        check: inRepo('git branch | grep -q new-feature-1 && ! git branch | grep -q " feature-branch$"'),
        hint: 'git branch -m feature-branch new-feature-1 renames in place.',
      },
      {
        id: 'publish',
        text: 'Delete origin/feature-branch and push new-feature-1 with upstream tracking.',
        check: inRepo('git branch -r | grep -q "origin/new-feature-1" && ! git branch -r | grep -q "origin/feature-branch"'),
        hint: 'Delete the old ref, then git push -u origin new-feature-1.',
      },
    ],
    solution: forked(
      'git checkout feature-branch',
      'git branch -m feature-branch new-feature-1',
      'git push origin --delete feature-branch',
      'git push -u origin new-feature-1',
      'git branch -a'
    ),
  },

  'labex-git-reset-local-master-branch-to-match-remote': {
    id: 'labex-git-reset-local-master-branch-to-match-remote',
    title: 'Reset Local Master Branch to Match Remote',
    brief:
      'Your local master was rewound and no longer matches origin. Fetch the remote refs and hard-reset master so the two branches point at the same commit.',
    setup: seeded(clone(), `cd ${REPO}`, 'git reset --hard HEAD~2'),
    tasks: [
      {
        id: 'reset',
        text: 'Fetch origin and reset master to origin/master so file1.txt and file2.txt return.',
        check: inRepo('test "$(git rev-parse master)" = "$(git rev-parse origin/master)" && test -f file1.txt && test -f file2.txt'),
        hint: 'git fetch origin, then git reset --hard origin/master.',
      },
    ],
    solution: repo('git fetch origin', 'git log --oneline', 'git reset --hard origin/master', 'git log --oneline'),
  },

  'labex-git-restore-a-deleted-file': {
    id: 'labex-git-restore-a-deleted-file',
    title: 'Restore a Deleted File',
    brief:
      'file2.txt was deleted from the working tree by accident. Bring it back from the newest commit without touching the rest of the repository.',
    setup: seeded(clone(), `cd ${REPO}`, 'rm file2.txt'),
    tasks: [
      {
        id: 'restore',
        text: 'Restore file2.txt from HEAD and leave the working tree clean.',
        check: inRepo('grep -q "This is file2." file2.txt && git status | grep -q "nothing to commit, working tree clean"'),
        hint: 'git checkout HEAD -- file2.txt copies the committed version back.',
      },
    ],
    solution: repo('git log --oneline', 'git checkout HEAD -- file2.txt', 'ls'),
  },

  'labex-git-rewind-to-a-specific-commit': {
    id: 'labex-git-rewind-to-a-specific-commit',
    title: 'Rewind to a Specific Commit',
    brief:
      'The two feature commits on master are wrong. Rewind the branch to the Initial commit and discard the working-tree changes along with them.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'rewind',
        text: 'Hard-reset master to the Initial commit so only that commit remains and file1.txt/file2.txt are gone.',
        check: inRepo('! git log --oneline | grep -q "Added file" && ! test -f file1.txt && ! test -f file2.txt'),
        hint: 'git reset --hard HEAD~2 rewinds two commits and cleans the worktree.',
      },
    ],
    solution: solved('git log --oneline', 'git reset --hard HEAD~2', 'git log --oneline'),
  },

  'labex-git-create-a-git-stash': {
    id: 'labex-git-create-a-git-stash',
    title: 'Create a Git Stash',
    brief:
      'You are mid-edit on feature and need master clean for a moment. Stash the README change with the message "My changes", then reapply it on feature.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'stash',
        text: 'On feature, append "Some changes" to README.md and stash it with the message "My changes".',
        check: inRepo('git stash list | grep -q "On feature: My changes"'),
        hint: 'git stash save "My changes" records the message in the stash list.',
      },
      {
        id: 'apply',
        text: 'Return to feature and reapply the stash so the line is back in README.md.',
        check: inRepo('test "$(git branch --show-current)" = "feature" && grep -q "Some changes" README.md'),
        hint: 'git stash apply restores the most recent stash.',
      },
    ],
    solution: solved(
      'git checkout -b feature',
      'echo "Some changes" >> README.md',
      'git stash save "My changes"',
      'git checkout master',
      'git checkout feature',
      'git stash apply',
      'git stash list'
    ),
  },

  'labex-git-set-default-push-branch-name': {
    id: 'labex-git-set-default-push-branch-name',
    title: 'Set Default Push Branch Name',
    brief:
      'Stop spelling out origin and the branch name on every push. Set push.default to current, then publish my-branch with a bare git push -u.',
    tasks: [
      {
        id: 'clone',
        text: 'Clone your fork (https://github.com/your-username/git-playground) and enter it.',
        check: `test -d ${DIR}/.git && cd ${DIR} && git remote -v | grep -q your-username`,
        hint: 'The fork URL contains your-username.',
      },
      {
        id: 'config',
        text: 'Set push.default to current for this repository.',
        check: inRepo('test "$(git config push.default)" = "current"'),
        hint: 'git config push.default current writes the setting locally.',
      },
      {
        id: 'push',
        text: 'Create my-branch with hello.txt, commit, and publish it with git push -u (no remote or branch arguments).',
        check: inRepo('git branch -r | grep -q "origin/my-branch" && git branch -r --contains my-branch | grep -q "origin/my-branch"'),
        hint: 'With push.default=current, git push -u uses the current branch name.',
      },
    ],
    solution: forked(
      'git config push.default current',
      'git checkout -b my-branch',
      'echo "Hello, World" > hello.txt',
      'git add hello.txt',
      'git commit -m "Add hello.txt"',
      'git push -u',
      'git branch -a'
    ),
  },

  'labex-git-configure-the-git-text-editor': {
    id: 'labex-git-configure-the-git-text-editor',
    title: 'Configure the git text editor',
    brief:
      'Git opens an editor for commit messages. Point core.editor at vim globally, then commit a change — in this VM you pass the message inline.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'editor',
        text: 'Set core.editor to "vim" in your global Git configuration.',
        check: inRepo('git config --list | grep -q "core.editor=vim"'),
        hint: 'git config --global core.editor "vim" writes to ~/.gitconfig.',
      },
      {
        id: 'commit',
        text: 'Create hello.txt containing "Hello, Git" and commit it with "Update hello.txt".',
        check: inRepo('git log -1 | grep -q "Update hello.txt" && grep -q "Hello, Git" hello.txt'),
        hint: 'Stage the file and commit with -m.',
      },
    ],
    solution: solved(
      'git config --global core.editor "vim"',
      'echo "Hello, Git" > hello.txt',
      'git add hello.txt',
      'git commit -m "Update hello.txt"',
      'git log'
    ),
  },

  'labex-git-sort-git-branches-by-date': {
    id: 'labex-git-sort-git-branches-by-date',
    title: 'Sort Git Branches by Date',
    brief:
      'Several branches have drifted apart. Create two branches with different commit dates, then sort by committer date to see which moved most recently.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'branches',
        text: 'Create branch one with a hello.txt commit, then branch two from master.',
        check: inRepo('git branch | grep -q " one$" && git branch | grep -q " two$" && git log one | grep -q "hello.txt"'),
        hint: 'Commit on one, switch back to master, then create two.',
      },
      {
        id: 'sort',
        text: 'List the branches sorted newest-first by committer date.',
        check: `${inRepo('git branch --sort=-committerdate | head -1 | grep -q one')} && ${typed('--sort=-committerdate')}`,
        hint: 'git branch --sort=-committerdate puts the newest branch first.',
      },
    ],
    solution: solved(
      'git checkout -b one',
      'touch hello.txt',
      'git add .',
      'git commit -m "hello.txt"',
      'git checkout master',
      'git checkout -b two',
      'git branch --sort=-committerdate'
    ),
  },

  'labex-git-add-files-to-the-staging-area': {
    id: 'labex-git-add-files-to-the-staging-area',
    title: 'Add Files to the Staging Area',
    brief:
      'Six loose files are waiting. Stage HTML and CSS by name, JavaScript with a glob, then everything else — inspecting git status at each step.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'stage',
        text: 'Create index.html, style.css, one.js, two.js, 1.py and 2.py, then stage only the HTML and CSS files.',
        check: `${inRepo('git status -s | grep -q "^A  index.html" && git status -s | grep -q "^A  style.css"')} && ${typed('git add index.html style.css')}`,
        hint: 'git add index.html style.css stages exactly those two paths.',
      },
      {
        id: 'glob',
        text: 'Stage both JavaScript files with a single glob and check status.',
        check: `${inRepo('git status -s | grep -q "^A  one.js" && git status -s | grep -q "^A  two.js"')} && ${typed('git add [*].js')}`,
        hint: 'git add *.js expands the glob before Git sees it.',
      },
      {
        id: 'all',
        text: 'Stage the remaining Python files and confirm nothing is left untracked.',
        check: inRepo('! git status -s | grep -q "??" && git status -s | grep -q "^A  1.py" && git status -s | grep -q "^A  2.py"'),
        hint: 'git add . stages every remaining change.',
      },
    ],
    solution: solved(
      'echo "hello" > index.html',
      'echo "world" > style.css',
      'echo "git" > one.js',
      'echo "labex" > two.js',
      'echo "hello git" > 1.py',
      'echo "hello labex" > 2.py',
      'git add index.html style.css',
      'git status',
      'git add *.js',
      'git status',
      'git add .',
      'git status'
    ),
  },

  'labex-git-return-to-previous-branch': {
    id: 'labex-git-return-to-previous-branch',
    title: 'Return to Previous Branch',
    brief:
      'You hopped onto feature-branch to inspect something and now want master back. Use the checkout shorthand that returns to the previous branch.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'return',
        text: 'Create feature-branch, then return to master with git checkout -.',
        check: `${inRepo('test "$(git branch --show-current)" = "master" && git branch | grep -q feature-branch')} && ${typed('git checkout -')}`,
        hint: 'The dash is a shorthand for the previously checked-out branch.',
      },
    ],
    solution: solved('git checkout -b feature-branch', 'git checkout -', 'git branch'),
  },

  'labex-git-undo-the-last-commit': {
    id: 'labex-git-undo-the-last-commit',
    title: 'Undo the Last Commit',
    brief:
      'The newest commit is wrong, but the project must keep a public history. Revert it with a new commit that reverses its changes.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'revert',
        text: 'Revert the newest commit so file2.txt is gone and the history records the reversal.',
        check: inRepo('! test -f file2.txt && git log -1 | grep -q "Revert" && git status | grep -q "nothing to commit, working tree clean"'),
        hint: 'git revert HEAD writes a new commit that undoes the last change.',
      },
    ],
    solution: solved('git revert HEAD', 'git log --oneline'),
  },

  'labex-git-remove-files-from-the-staging-area': {
    id: 'labex-git-remove-files-from-the-staging-area',
    title: 'Remove Files from the Staging Area',
    brief:
      'newfile.txt was staged by accident and the README edit is ready. Unstage only newfile.txt, leaving the README change staged and the file untracked.',
    setup: seeded(
      clone(),
      `cd ${REPO}`,
      'touch newfile.txt',
      'echo "hello,world" > README.md',
      'git add .'
    ),
    tasks: [
      {
        id: 'unstage',
        text: 'Unstage newfile.txt while keeping the README change staged.',
        check: inRepo('git status | grep -q "Untracked files" && git status | grep -q "newfile.txt" && ! git status | grep -q "new file:   newfile.txt" && git status | grep -q "modified:   README.md"'),
        hint: 'git restore --staged newfile.txt removes it from the index only.',
      },
    ],
    solution: repo('git status', 'git restore --staged newfile.txt', 'git status'),
  },

  'labex-git-edit-the-last-commit': {
    id: 'labex-git-edit-the-last-commit',
    title: 'Edit the Last Commit',
    brief:
      'You forgot a README line in the newest commit. Amend that commit with the staged change without altering its message.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'amend',
        text: 'Append "New content" to README.md, stage it, and amend the last commit with --no-edit.',
        check: inRepo('git log -1 | grep -q "Added file2.txt" && git show HEAD | grep -q "New content" && git status | grep -q "nothing to commit, working tree clean"'),
        hint: 'git commit --amend --no-edit folds staged changes into the previous commit.',
      },
    ],
    solution: solved(
      'echo "New content" >> README.md',
      'git add README.md',
      'git commit --amend --no-edit',
      'git show HEAD'
    ),
  },

  'labex-git-view-changes-between-commits': {
    id: 'labex-git-view-changes-between-commits',
    title: 'View Changes Between Commits',
    brief:
      'Summarize the two commits since the Initial commit. git shortlog groups them by author so you can see what landed in that range.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'summary',
        text: 'Summarize HEAD~2..HEAD with git shortlog and confirm both added files are listed.',
        check: `${inRepo('git shortlog HEAD~2..HEAD | grep -q "Added file1.txt" && git shortlog HEAD~2..HEAD | grep -q "Added file2.txt"')} && ${typed('git shortlog')}`,
        hint: 'git shortlog <from>..HEAD groups the commits in that range by author.',
      },
    ],
    solution: solved('git shortlog HEAD~2..HEAD'),
  },

  'labex-git-view-a-visual-graph-of-the-repository': {
    id: 'labex-git-view-a-visual-graph-of-the-repository',
    title: 'View a Visual Graph of the Repository',
    brief:
      'A visual graph makes branch structure obvious. Render all refs as a decorated one-line graph and locate the newest commit.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'graph',
        text: 'Render the graph with git log --pretty=oneline --graph --decorate --all.',
        check: `${inRepo('git log --pretty=oneline --graph --decorate --all | grep -q "Added file2.txt" && git log --pretty=oneline --graph --decorate --all | grep -q "^\\* "')} && ${typed('--graph')}`,
        hint: 'Each graph line starts with * followed by the abbreviated commit.',
      },
    ],
    solution: solved('git log --pretty=oneline --graph --decorate --all'),
  },

  'labex-git-find-commits-that-manipulated-a-specific-str': {
    id: 'labex-git-find-commits-that-manipulated-a-specific-str',
    title: 'Find Commits that Manipulated a Specific String',
    brief:
      'Search history for the commit that introduced the phrase "Git Playground" in README.md. The pickaxe option follows content, not just messages.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'search',
        text: 'Use git log -S to find commits that changed "Git Playground" in README.md.',
        check: `${inRepo('git log -S"Git Playground" README.md | grep -q "Initial commit"')} && ${typed('Git Playground')}`,
        hint: 'git log -S"text" path shows commits where that text count changed.',
      },
    ],
    solution: solved('git log -S"Git Playground" README.md'),
  },

  'labex-git-view-commits-in-a-specific-date-range': {
    id: 'labex-git-view-commits-in-a-specific-date-range',
    title: 'View Commits in a Specific Date Range',
    brief:
      'History can be sliced by time. List only the commits authored in the ten seconds around the Initial commit and confirm the later commits are filtered out.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'range',
        text: 'List commits from 2023-04-26T06:16:00Z through 2023-04-26T06:16:10Z.',
        check: `${inRepo('git log --since="2023-04-26T06:16:00Z" --until="2023-04-26T06:16:10Z" | grep -q "Initial commit" && ! git log --since="2023-04-26T06:16:00Z" --until="2023-04-26T06:16:10Z" | grep -q "Added file1.txt"')} && ${typed('--since')}`,
        hint: 'Pass both --since and --until; ISO timestamps keep the window exact.',
      },
    ],
    solution: solved(
      'git log --since="2023-04-26T06:16:00Z" --until="2023-04-26T06:16:10Z" --oneline'
    ),
  },

  'labex-git-view-git-commit-summary-excluding-merges': {
    id: 'labex-git-view-git-commit-summary-excluding-merges',
    title: 'View Git Commit Summary Excluding Merges',
    brief:
      'Merge commits add noise to a release summary. Create a feature, merge it without fast-forward, then list history with --no-merges.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'merge',
        text: 'Create feature1 with file.txt containing "Feature 1", commit as "Add feature 1", then merge it into master with --no-ff.',
        check: inRepo('git log master | grep -q "Add feature 1" && git log --oneline master | grep -q "Merge branch"'),
        hint: 'git merge --no-ff feature1 guarantees a merge commit.',
      },
      {
        id: 'summary',
        text: 'List the one-line history without merge commits.',
        check: `${inRepo('git log --oneline --no-merges | grep -q "Add feature 1" && ! git log --oneline --no-merges | grep -q "Merge branch"')} && ${typed('--no-merges')}`,
        hint: 'git log --oneline --no-merges hides merge commits.',
      },
    ],
    solution: solved(
      'git checkout -b feature1',
      'echo "Feature 1" >> file.txt',
      'git add .',
      'git commit -m "Add feature 1"',
      'git checkout master',
      'git merge --no-ff feature1',
      'git log --oneline --no-merges'
    ),
  },

  'labex-git-view-last-commit': {
    id: 'labex-git-view-last-commit',
    title: 'View Last Commit',
    brief:
      'Inspect the newest commit in detail: hash, author, date and message. git log -1 limits the output to exactly that commit.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'last',
        text: 'Show only the last commit and confirm its message is "Added file2.txt".',
        check: `${inRepo('git log -1 | grep -q "Added file2.txt" && ! git log -1 | grep -q "Added file1.txt"')} && ${typed('git log -1')}`,
        hint: 'git log -1 prints just the newest commit.',
      },
    ],
    solution: solved('git log -1'),
  },

  'labex-git-view-merged-branches': {
    id: 'labex-git-view-merged-branches',
    title: 'View Merged Branches',
    brief:
      'Before cleanup, check which branches are already merged. List local and remote branches that git considers fully contained in HEAD.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'merged',
        text: 'List merged local and remote branches with git branch -a --merged.',
        check: `${inRepo('git branch -a --merged | grep -q "remotes/origin/master" && git branch -a --merged | grep -q "master"')} && ${typed('--merged')}`,
        hint: 'git branch -a --merged includes remote-tracking branches.',
      },
    ],
    solution: solved('git branch -a --merged'),
  },

  'labex-git-view-the-remote-url': {
    id: 'labex-git-view-the-remote-url',
    title: 'View the Remote URL',
    brief:
      'Confirm which repository origin points at. Read the URL straight from the local configuration and verify it is the LabEx playground.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'url',
        text: 'Print remote.origin.url and confirm it points at the playground repository.',
        check: `${inRepo('git config --get remote.origin.url | grep -q "labex-labs/git-playground"')} && ${typed('remote.origin.url')}`,
        hint: 'git config --get remote.origin.url prints the stored URL.',
      },
    ],
    solution: solved('git config --get remote.origin.url'),
  },

  'labex-git-create-a-new-repository': {
    id: 'labex-git-create-a-new-repository',
    title: 'Create a New Repository',
    brief:
      'Not every project starts as a clone. Create my_repo from scratch with git init and prove Git recognizes it as a repository.',
    tasks: [
      {
        id: 'init',
        text: 'Initialize a repository at ~/project/my_repo and show its status.',
        check: 'test -d /home/labex/project/my_repo/.git && cd /home/labex/project/my_repo && git status | grep -q "On branch"',
        hint: 'git init my_repo creates the folder and its .git directory.',
      },
    ],
    solution: ['cd /home/labex/project', 'git init my_repo', 'ls -a my_repo', 'ls -a my_repo/.git'],
  },

  'labex-git-tracking-code-changes-with-git': {
    id: 'labex-git-tracking-code-changes-with-git',
    title: 'Tracking Code Changes with Git',
    brief:
      'Hunt the regression in file2.txt with git bisect. Start the search, mark the bad and good endpoints, test the middle commit, then reset.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'bisect',
        text: 'Bisect from "Initial commit" (good) to HEAD (bad), mark the middle commit good, then reset the bisect.',
        check: `${typed('git bisect start')} && ${typed('git bisect bad')} && ${typed('git bisect good')} && ${typed('git bisect reset')} && ${inRepo('test "$(git branch --show-current)" = "master" && git log --oneline | grep -q "Added file2.txt"')}`,
        hint: 'Start, mark HEAD bad, mark the Initial commit good, test file2.txt, then git bisect reset.',
      },
    ],
    solution: solved(
      'git bisect start',
      'git bisect bad HEAD',
      'git bisect good HEAD~2',
      'cat file2.txt',
      'git bisect good',
      'git bisect reset'
    ),
  },

  'labex-git-tracking-bugs-in-git-codebase': {
    id: 'labex-git-tracking-bugs-in-git-codebase',
    title: 'Tracking Bugs in Git Codebase',
    brief:
      'A bug says file2.txt should read "This is file2.txt." but it does not. Binary-search the history with git bisect to find the exact commit that introduced it.',
    tasks: [
      {
        id: 'clone',
        text: `Clone ${PLAYGROUND} and enter the repository.`,
        check: `test -d ${DIR}/.git`,
        hint: 'Clone first, then cd into git-playground.',
      },
      {
        id: 'find',
        text: 'Run a bisect between Initial commit and HEAD, mark the middle commit, and reset when the first bad commit is found.',
        check: `${typed('git bisect good')} && ${typed('git bisect bad')} && ${typed('git bisect reset')} && ${inRepo('test "$(git branch --show-current)" = "master"')}`,
        hint: 'The bad commit is the one that created file2.txt.',
      },
    ],
    solution: solved(
      'git bisect start',
      'git bisect bad HEAD',
      'git bisect good HEAD~2',
      'git bisect good',
      'git bisect reset'
    ),
  },

  'labex-git-reverting-git-commits-a-powerful-technique': {
    id: 'labex-git-reverting-git-commits-a-powerful-technique',
    title: 'Reverting Git Commits: A Powerful Technique',
    brief:
      'The rewind-commits branch needs to lose its last commit for good. Rewind it, then force-push so the remote branch matches the new history.',
    tasks: [
      {
        id: 'clone',
        text: 'Clone your fork (https://github.com/your-username/git-playground) and enter it.',
        check: `test -d ${DIR}/.git && cd ${DIR} && git remote -v | grep -q your-username`,
        hint: 'The fork URL contains your-username.',
      },
      {
        id: 'rewind',
        text: 'Create rewind-commits, hard-reset it one commit back, and force-push it to origin.',
        check: inRepo('test "$(git branch --show-current)" = "rewind-commits" && ! git log --oneline | grep -q "Added file2.txt" && git branch -r | grep -q "origin/rewind-commits" && ! git log origin/rewind-commits --oneline | grep -q "Added file2.txt"'),
        hint: 'git reset HEAD~1 --hard then git push --force origin rewind-commits.',
      },
    ],
    solution: forked(
      'git checkout -b rewind-commits',
      'git reset HEAD~1 --hard',
      'git push --force origin rewind-commits',
      'git log --oneline'
    ),
  },
};
