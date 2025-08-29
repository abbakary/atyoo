#!/usr/bin/env python3
import os
import sys
from pathlib import Path

def main():
    # Ensure Django and deps are importable even if pip isn't available in the environment
    venv_site = Path(__file__).resolve().parent / 'venv' / 'Lib' / 'site-packages'
    if venv_site.exists():
        sys.path.append(str(venv_site))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError("Django is required to run this project.") from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
