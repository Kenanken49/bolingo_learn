/**
 * The `git-playground` remote used by the Git labs, rebuilt offline.
 *
 * The upstream corpus teaches against https://github.com/labex-labs/git-playground.
 * Shipping that clone as a fixture would add a network-fetched repo to the app,
 * so the same three commits, trees and branches are constructed here with the
 * lab engine's own Git implementation. Pushes and fetches then work against this
 * simulated remote with no network at all. Commit hashes are engine-generated,
 * so labs refer to commits by message instead of by upstream hash.
 */

import { VFS, objectHash } from './fs';
import { GitCommit, GitRepo, normalizeRemote } from './git';

const URL = 'https://github.com/labex-labs/git-playground';
/** 2023-04-26 14:16:00 +0800, the upstream author date. */
const BASE_TIME = Date.UTC(2023, 3, 26, 6, 16, 0) / 1000;

const README = '# git-playground\nGit Playground\n';
const FILE1 = 'This is file1.\n';
const FILE2 = 'This is file2.\n';

interface Seed {
  message: string;
  tree: Record<string, string>;
  email: string;
}

function build(repo: GitRepo, seeds: Seed[], branches: Record<string, number>): string[] {
  let parent: string | null = null;
  const shas: string[] = [];
  seeds.forEach((seed, index) => {
    const time = BASE_TIME + index * 25;
    const commit: GitCommit = {
      sha: objectHash(JSON.stringify({ tree: seed.tree, parent, message: seed.message, time })),
      tree: seed.tree,
      parents: parent ? [parent] : [],
      message: seed.message,
      author: 'Hang',
      email: seed.email,
      time,
    };
    repo.writeCommit(commit);
    shas.push(commit.sha);
    parent = commit.sha;
  });
  for (const [branch, index] of Object.entries(branches)) {
    repo.writeRef(`refs/heads/${branch}`, shas[index]);
  }
  repo.writeHead(`ref: refs/heads/master\n`);
  return shas;
}

export function buildPlaygroundRemote(): VFS {
  const remote = new VFS();
  remote.mkdirp('/srv/remote');
  const repo = GitRepo.init(remote, '/srv/remote');
  const base = { 'README.md': README };
  const withFile1 = { ...base, 'file1.txt': FILE1 };
  const withFile2 = { ...withFile1, 'file2.txt': FILE2 };
  build(
    repo,
    [
      { message: 'Initial commit', tree: base, email: 'huhuhang@gmail.com' },
      { message: 'Added file1.txt', tree: withFile1, email: 'huhuhang@users.noreply.github.com' },
      { message: 'Added file2.txt', tree: withFile2, email: 'huhuhang@users.noreply.github.com' },
    ],
    { master: 2, main: 2, 'feature-branch': 2 }
  );
  return remote;
}

/** Fresh remotes for a session. Add aliases so fork-flavoured labs work too. */
export function playgroundRemotes(): Map<string, VFS> {
  const canonical = buildPlaygroundRemote();
  const map = new Map<string, VFS>();
  map.set(normalizeRemote(URL), canonical);
  map.set(normalizeRemote('https://github.com/your-username/git-playground'), canonical.clone());
  return map;
}

export const PLAYGROUND_URL = URL;
