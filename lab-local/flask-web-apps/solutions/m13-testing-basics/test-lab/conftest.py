import os
import sys

# tests/ is two levels below the app module; make `import my_app` work no
# matter which directory pytest was started from.
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
