# starter/

Pristine copies of every directory under `../workspace/`, one per project folder
the course uses:

```
quickstart  templates-lab  devserver-lab  cli-lab  flaskr-app  config-lab
signals-lab shell-lab      test-lab       secure-lab  async-lab
```

They are empty on purpose. Unlike some LabEx VMs, nothing in this course hands
you a half-written project: every file you touch is one you create, so that the
graders can tell your work apart from ours. The only files here are
`.gitkeep`, which exist so the skeleton survives `git clone` and `./lab reset`.

`./lab reset --module <n>` replaces `workspace/<dir>` with the copy from here,
then replays the finished code of every earlier module that shares that
directory (the `flaskr-app` chain: 5 → 6 → 7 → 8 → 9 → 14 → 17). So after a
reset you are exactly where the module's first step expects you to be.

Do not edit these files to solve a step — that changes the reset target for
every future run. Use `../workspace/` for your code and
`../solutions/<module>/` to read the reference implementation.
