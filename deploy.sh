#!/usr/bin/env bash
# Check how this checkout is wired into the live web profile, and refuse to
# install into a running server.
#
# Why the refusal: overwriting the Host half while `dsh web` runs unloads it and
# polling stops silently until the next restart. That looks exactly like a
# plugin bug and is not one — it cost two debugging rounds on 2026-11-11.
#
# Why there is nothing to copy: the profile installs this package with
# `link:`, so `node_modules/dsh-od-quota` is a symlink to this checkout. Editing
# a file here IS the install. Copying over the symlink would replace the link
# with a stale duplicate, which is how the checkout and the profile drifted
# apart in the first place.
set -euo pipefail

PROFILE="${DSH_PROFILE:-$HOME/.dsh/profiles/web}"
LINK="$PROFILE/node_modules/dsh-od-quota"
SRC="$(cd "$(dirname "$0")" && pwd)"

if pgrep -f "dsh web" >/dev/null 2>&1; then
  echo "refusing to run: 'dsh web' is running (pid $(pgrep -f 'dsh web' | tr '\n' ' '))"
  echo
  echo "The Host half is already loaded in that process. Files on disk are fine to"
  echo "change, but the new code only takes effect after a restart:"
  echo "  kill <pid> && ss -ltnp | grep 3080   # expect no output"
  echo "  dsh web"
  exit 1
fi

if [ -L "$LINK" ]; then
  target="$(readlink -f "$LINK")"
  echo "installed as a symlink -> $target"
  if [ "$target" = "$SRC" ]; then
    echo "this checkout IS the install; nothing to copy"
  else
    echo "warning: the symlink points somewhere else, not at this checkout"
  fi
elif [ -d "$LINK" ]; then
  echo "installed as a real directory (a copy, not a link)"
  echo "re-install it as a link so the two can never drift:"
  echo "  dsh plugin --profile web add \"link:$SRC\""
else
  echo "not installed. run:"
  echo "  dsh plugin --profile web add \"link:$SRC\""
fi

echo
echo "start the server with: dsh web"
