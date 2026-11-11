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
#
# Sourcing also keeps $GRADLE_USER_HOME/gradle.properties pointed at the two
# build settings that decide how long a rebuild takes (set
# ANDROID_GRADLE_PROPS=off to keep that file entirely your own):
#
#   reactNativeArchitectures  Which ABIs get CMake-compiled. `expo prebuild`
#                             writes all four into android/gradle.properties,
#                             and each extra ABI costs about 2.1 GB of object
#                             files and a fresh full compile of every native
#                             library (llama.rn alone is 818 ninja targets).
#   org.gradle.caching=true   The Gradle build cache, so wiping android/ does
#                             not mean recompiling Kotlin, Java and dex.
#                             `expo run:android` already passes --build-cache;
#                             plain ./gradlew only gets it from this file.
#
# The file is the only place these can live durably: android/ is generated, so
# editing android/gradle.properties is undone by the next prebuild. Gradle
# reads the user-level file last, which makes it win over the generated
# project one, and a command-line -P... still wins over both — so
# `expo run:android` keeps overriding the ABI with the attached device's own
# ABI for debug builds, and a store build can ask for the full set explicitly.

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

# ABIs for builds that do not pick one themselves (plain ./gradlew, or a debug
# build with no device attached). One ABI for the emulator is the default; a
# phone wants arm64-v8a, and a store upload wants the whole set:
#   ANDROID_ARCHS=arm64-v8a,x86_64 source scripts/android-env.sh
export ANDROID_ARCHS="${ANDROID_ARCHS:-x86_64}"

case ":$PATH:" in
  *":$ANDROID_HOME/platform-tools:"*) ;;
  *) export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH" ;;
esac

# Make Windows-style paths work with the .exe tools from Git Bash.
to_win() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}

# --- Gradle settings that outlive a regenerated android/ ------------------
# Write key=value into $GRADLE_USER_HOME/gradle.properties, replacing an
# existing value for that key and leaving every other line alone. Only touches
# the file when something actually differs.
gradle_prop() {
  local key="$1" value="$2" file="$GRADLE_USER_HOME/gradle.properties"
  local current=""
  [ -f "$file" ] && current=$(sed -n -e "s/^${key}=//p" "$file" | tr -d '\r' | tail -1)
  if [ "$current" = "$value" ]; then
    return 0
  fi
  mkdir -p "$GRADLE_USER_HOME" || return 1
  if [ -f "$file" ] && grep -q "^${key}=" "$file"; then
    # Rewrite just this key, keeping the file's own line endings elsewhere.
    local tmp="$file.tmp.$$"
    sed -e "s/^${key}=.*/${key}=${value}/" "$file" >"$tmp" && mv "$tmp" "$file" || return 1
  else
    if ! grep -q "# Kept by scripts/android-env.sh" "$file" 2>/dev/null; then
      [ -s "$file" ] && echo
      echo "# Kept by scripts/android-env.sh (bolingo_learn). Safe to edit by hand:"
      echo "# keeping these values steady is what lets the caches below be reused."
    fi >>"$file"
    echo "${key}=${value}" >>"$file"
  fi
  echo "  [set] $key=$value -> $(to_win "$file")"
}

ensure_gradle_props() {
  if [ "${ANDROID_GRADLE_PROPS:-on}" = "off" ]; then
    echo "  gradle.properties  left alone (ANDROID_GRADLE_PROPS=off)"
    return 0
  fi
  gradle_prop reactNativeArchitectures "$ANDROID_ARCHS"
  gradle_prop org.gradle.caching true
}

echo "Android environment"
echo "  ANDROID_HOME      $(to_win "$ANDROID_HOME")"
echo "  ANDROID_AVD_HOME  $(to_win "$ANDROID_AVD_HOME")  ($(ls "$ANDROID_AVD_HOME"/*.ini 2>/dev/null | wc -l) AVD config(s))"
echo "  GRADLE_USER_HOME  $(to_win "$GRADLE_USER_HOME")"
echo "  ANDROID_NDK_HOME  $(to_win "$ANDROID_NDK_HOME")"
echo "  ANDROID_ARCHS     $ANDROID_ARCHS"
ensure_gradle_props

# --- Optional self-check --------------------------------------------------
if [ "${1:-}" = "--check" ]; then
  status=0
  props="$GRADLE_USER_HOME/gradle.properties"
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

  # The settings that keep a rebuild short, and the cache they depend on.
  if [ -f "$props" ] && grep -q "^reactNativeArchitectures=" "$props"; then
    echo "  [ok]  ABIs pinned: $(sed -n -e 's/^reactNativeArchitectures=//p' "$props" | tr -d '\r' | tail -1)"
  else
    echo "  [FAIL] no reactNativeArchitectures in $props — every build compiles all four ABIs"; status=1
  fi

  if [ -f "$props" ] && grep -q "^org.gradle.caching=true" "$props"; then
    echo "  [ok]  Gradle build cache enabled"
  else
    echo "  [warn] no org.gradle.caching=true in $props — plain ./gradlew rebuilds Kotlin from scratch"
  fi

  # Losing cmake.dir re-hashes every .cxx folder, which recompiles every C++
  # library. expo prebuild --clean drops this file.
  if [ -d ../android ] || [ -d android ]; then
    lp=$(ls android/local.properties ../android/local.properties 2>/dev/null | head -1)
    if [ -z "$lp" ]; then
      echo "  [warn] no android/local.properties — expo run:android will create it without cmake.dir"
    elif grep -q "^cmake.dir=" "$lp"; then
      echo "  [ok]  cmake.dir=$(sed -n -e 's/^cmake.dir=//p' "$lp" | tr -d '\r') (keeps the .cxx hashes stable)"
    else
      echo "  [FAIL] $lp has no cmake.dir — the next build reconfigures CMake and recompiles all C++"
      status=1
    fi
  fi

  # A second hash folder per module means the native cache is split across
  # configurations and the next build pays for it again.
  if [ -d node_modules ]; then
    splits=""
    for d in node_modules/*/android/.cxx/Debug node_modules/@*/*/android/.cxx/Debug; do
      [ -d "$d" ] || continue
      n=$(find "$d" -mindepth 1 -maxdepth 1 -type d | wc -l)
      if [ "$n" -gt 1 ]; then
        # Name the package, not the `android` folder the path ends in.
        m="${d#node_modules/}"
        splits="$splits ${m%%/android/.cxx*}"
      fi
    done
    if [ -n "$splits" ]; then
      echo "  [warn] native cache split by changed CMake settings in:$splits (see README: what invalidates .cxx)"
    else
      echo "  [ok]  one native (.cxx) configuration per module — compiles get reused"
    fi
  fi

  # The .cxx objects grow under node_modules, which is a junction onto D: here, but
  # each extra ABI still wants ~2.1 GB of obj/*.so copies and packaging room on C:.
  free_c=$(df -Pm /c 2>/dev/null | awk 'NR==2 {print $4}')
  if [ -n "$free_c" ] && [ "$free_c" -lt 8192 ]; then
    echo "  [warn] only $((free_c / 1024)) GB free on C: — each additional ABI needs about 2.1 GB"
  fi

  echo
  if [ "$status" -eq 0 ]; then echo "Android environment is ready."; else echo "Android environment has problems (see above)."; fi
  # Keep `source` from killing the caller's shell when we are only reporting.
  return "$status" 2>/dev/null || exit "$status"
fi
