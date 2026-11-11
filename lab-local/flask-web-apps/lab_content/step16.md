# Step 16 · Address Already in Use

**Module 3 of 17 — Working with the Development Server**

**Goal:** Diagnose a port conflict with lsof / ss / netstat before choosing a new port.

## Instructions

If you see an OSError with the message "Address already in use" when trying to start the server, it means that another program is already using the port 5000, which is the default port for the development server. You can either identify and stop the other program or choose a different port.

To identify the process using port 5000, you can use the netstat or lsof command. Here are examples for Linux, macOS, and Windows:

Once you have identified the process, you can use other operating system tools to stop it. After stopping the process, you should be able to run the development server without any issues.

```bash
netstat -nlp | grep 5000
```

```bash
lsof -P -i :5000
```

```bash
netstat -ano | findstr :5000
```

> Diagnosis step: there is no file artefact. The commands are shown so you can run them yourself; step 17 proves you recovered by serving on a free port.

**This step has nothing to grade.** It is the end of module 3: the work was done by hand on the LabEx VM and the original lab recorded it as an observation, so the honest local check is `SKIP` with exit code 0. Do the reading, then move on.

## Expected filesystem state afterwards

```
workspace/devserver-lab/          (as it should look after step 16)
├── app.py   (earlier step)
├── myapp.py   (earlier step)
└── unchanged - this step produces no files
```

## Verify

```bash
./lab check 16
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

Stuck? `./lab solve --step 16` lays down the finished code up to this step, `./lab reset --module 3` puts the module back to its starter state.
