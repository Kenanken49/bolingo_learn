#!/usr/bin/env bash
# Android toolchain, split across two drives.
#
# The SDK binaries live on C: (installed by Android Studio), but the two things
# that actually grow — the emulator's AVDs and the Gradle caches — live on the
# D: volume where there is real space. Nothing exports them by default, so a
# plain `npx expo run:android` looks in %USERPROFILE%\.android\avd and
# %USERPROFILE%\.gradle, finds nothing, and either offers no emulator or
# re-downloads the whole Gradle dependency graph onto C:.
#
# Usage (Git Bash / MINGW64):
#   source scripts/android-env.sh          # export into this shell
#   source scripts/android-env.sh --check  # export, then verify both locations
#
# After sourcing, the usual commands pick up the right paths:
#   emulator -list-avds
#   emulator -avd Medium_Phone
#   npx expo run:android
#   ./android/gradlew assembleDebug
#
# This only sets environment variables for the current shell. To make it
# permanent instead, set the same names with `setx` once — see README.

# --- Where the pieces are -------------------------------------------------
# Override any of these before sourcing if the layout moves.
ANDROID_SDK_DEFAULT="${LOCALAPPDATA:-$HOME/AppData/Local}/Android/Sdk"
export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$ANDROID_SDK_DEFAULT}}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

# AVDs and Gradle caches on the roomy volume.
export ANDROID_AVD_HOME="${ANDROID_AVD_HOME:-/d/android-avd}"
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-/d/gradle-home}"

# CMake is already referenced by android/local.properties (cmake.dir); the NDK
# ships inside the SDK, so it needs no variable of its own.
export ANDROID_NDK_HOME="${ANDROID_NDK_HOME:-$ANDROID_HOME/ndk/27.1.12297006}"

case ":$PATH:" in
  *":$ANDROID_HOME/platform-tools:"*) ;;
  *) export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH" ;;
esac

# Make Windows-style paths work with the .exe tools from Git Bash.
to_win() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}

echo "Android environment"
echo "  ANDROID_HOME      $(to_win "$ANDROID_HOME")"
echo "  ANDROID_AVD_HOME  $(to_win "$ANDROID_AVD_HOME")  ($(ls "$ANDROID_AVD_HOME"/*.ini 2>/dev/null | wc -l) AVD config(s))"
echo "  GRADLE_USER_HOME  $(to_win "$GRADLE_USER_HOME")"
echo "  ANDROID_NDK_HOME  $(to_win "$ANDROID_NDK_HOME")"

# --- Optional self-check --------------------------------------------------
if [ "${1:-}" = "--check" ]; then
  status=0
  echo
  echo "Checks"

  if [ -d "$ANDROID_HOME/platform-tools" ]; then
    echo "  [ok]  SDK platform-tools present"
  else
    echo "  [FAIL] no platform-tools under $ANDROID_HOME"; status=1
  fi

  if [ -x "$ANDROID_HOME/emulator/emulator.exe" ] || [ -x "$ANDROID_HOME/emulator/emulator" ]; then
    avds=$("$ANDROID_HOME/emulator/emulator" -list-avds 2>/dev/null | tr -d '\r')
    if [ -n "$avds" ]; then
      echo "  [ok]  emulator sees: $(echo "$avds" | paste -sd', ' -)"
    else
      echo "  [FAIL] emulator found no AVDs in $ANDROID_AVD_HOME"; status=1
    fi
  else
    echo "  [FAIL] emulator binary missing under $ANDROID_HOME"; status=1
  fi

  if [ -d "$GRADLE_USER_HOME/caches" ]; then
    echo "  [ok]  Gradle caches present (no re-download)"
  else
    echo "  [warn] $GRADLE_USER_HOME/caches missing — the next build re-downloads dependencies"
  fi

  echo
  if [ "$status" -eq 0 ]; then echo "Android environment is ready."; else echo "Android environment has problems (see above)."; fi
  # Keep `source` from killing the caller's shell when we are only reporting.
  return "$status" 2>/dev/null || exit "$status"
fi
