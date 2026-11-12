# Step 52 · Instance Folder

**Module 10 of 17 — Configuration Management**

**Goal:** Load deployment-specific settings from the instance folder.

## Instructions

Flask provides an instance folder for storing configuration files that are specific to a particular deployment. This allows you to separate deployment-specific configurations from the rest of your code. By default, Flask uses a folder named instance in the same directory as your application.

Create a new folder called instance in the same directory as your app.py file. In the instance folder, create a file called config.cfg and add the following code:

In the app.py file, add the following code before the configuration code:

The instance_path is set to the absolute path of the instance folder. The from_pyfile method loads the configuration from the config.cfg file in the instance folder.

```text
DEBUG = True
SECRET_KEY = 'instancekey'
```

```python
app.instance_path = os.path.abspath(os.path.dirname(__file__))
app.config.from_pyfile('config.cfg')
```

## Expected filesystem state afterwards

```
workspace/config-lab/          (as it should look after step 52)
├── instance/config.cfg   (this step)
├── app.py   (this step)
├── config.py   (earlier step)
├── config_prod.py   (earlier step)
```

## Files this step touches

- `workspace/config-lab/instance/config.cfg`
- `workspace/config-lab/app.py`

## Verify

```bash
./lab check 52
```

Exit code `0` means the step passed. The checker inspects the real files, imports the real code and talks to the real server on port 8080 — it never grades you on matching text. On a `build` step the checker may start a private copy of your app on port 18080 so your own server on 8080 is never disturbed.

What this step checks:

- `file` on `config-lab/instance/config.cfg` — file config-lab/instance/config.cfg — at least 2 bytes
- `app` on `app:app` — application factory app:app — config {"SECRET_KEY":"instancekey"}

Stuck? `./lab solve --step 52` lays down the finished code up to this step, `./lab reset --module 10` puts the module back to its starter state.
