#!/usr/bin/env bash
set -e

# Frontend
if [ -f package.json ]; then
  npm ci
fi

# Backend
if [ -f backend/requirements.txt ]; then
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r backend/requirements.txt
fi