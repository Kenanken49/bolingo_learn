#!/usr/bin/env bash
# Clear one Android ABI's build artifacts for this project, wherever they live.
#
# Each extra ABI costs about 2.1 GB of native objects, and AGP keeps every ABI in
# its own folder, so clearing the ABIs you are not building is safe and reclaims
# real space. Only generated trees are searched: `.cxx` and `build`. The objects
# do not all sit where the project does — `android/` is on C:, while
# `node_modules/` is a junction onto D: — so module artifacts are found through
# the junction and deleted on the volume that actually holds them (see README:
# "Moving `node_modules` off `C:`").
#
# Usage (Git Bash / Linux / macOS):
#   bash scripts/clean-abi.sh                       # report only
#   bash scripts/clean-abi.sh --delete              # clear every ABI not pinned
#   bash scripts/clean-abi.sh --abi arm64-v8a --delete
#   bash scripts/clean-abi.sh --abi x86_64 --force --delete   # the pinned ABI too
#
# What it never touches:
#   - anything under `src/` — a `src/main/jniLibs/<abi>/` folder is shipped code,
#     not an artifact, and deleting it breaks the next link;
#   - any target, or any `.cxx` / `build` anchor, that is itself a symbolic link
#     or junction, so a folder pointing outside the project cannot be cleared
#     through this script;
#   - every ABI in the active pin, unless `--force` is passed. The pin is
#     `reactNativeArchitectures` in `$GRADLE_USER_HOME/gradle.properties` (the
#     file `scripts/android-env.sh` keeps pointed at one ABI for the emulator),
#     then `$ANDROID_ARCHS`, then `x86_64`.
#
# Two facts about what clearing actually buys, both measured against a real
# `assembleDebug` (see README: "Partial deletes, checked against Gradle's
# up-to-date checks"):
#   - an ABI folder sitting inside a Gradle task's own output directory
#     self-heals: the task's output fingerprint no longer matches, the task
#     re-runs and writes the same bytes back. Such targets are reported as
#     `heals`, and deleting one reclaims nothing durable.
#   - only `.cxx` object trees stay gone, because bringing those back means
#     recompiling the ABI — a full `arm64-v8a` set here took 2 h 54 m of
#     compiles across five passes, and `llama.rn` alone plans 2 978 ninja steps.
#
# A candidate is only accepted when it really is a folder of one ABI's artifacts
# (task outputs: parent `lib`, `jni`, `out`, `obj`, `debug` or `release`; `.cxx`:
# a `<Config>` or `tools` tree at most four levels above the ABI folder). Without
# that test the any-depth search also matches folders whose
# *name* merely equals an ABI string: llama.rn carries object dirs at
# `.../ggml-cpu/arch/x86`, which sit *inside* the pinned `x86_64` tree, so
# `--abi x86 --delete` would have deleted part of the one ABI the pin is supposed
# to protect. Those candidates are counted in `dropped=` and never deleted. The
# `abi-clean` gate (`npm run check:abi-clean`) proves these rules against a
# fixture tree, so the guard rails cannot rot.
#
# Exit codes: 0 ran (including a report that found nothing), 2 bad arguments or a
# refusal to clear the pinned ABI without `--force`, 1 a delete that failed.

set -o pipefail

SUPPORTED_ABIS="armeabi-v7a arm64-v8a x86 x86_64"

usage() {
  cat <<'USAGE'
usage: bash scripts/clean-abi.sh [--abi LIST] [--active LIST] [--project DIR]
                                 [--delete] [--force] [--quiet]

  --abi LIST      comma-separated ABIs to clear (default: every supported ABI
                  present under the generated trees that is not in the active pin)
  --active LIST   override the ABI list a build currently relies on
  --project DIR   project root to scan (default: this script's parent)
  --delete        delete; without it the run only reports
  --force         allow clearing an ABI that is in the active pin
  --quiet         print the SUMMARY line only
USAGE
}

csv_to_words() { printf '%s' "$1" | tr ',' ' ' | tr -s ' '; }

here=$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)
project=$(dirname "$here")
delete=0
force=0
quiet=0
arg_abis=""
arg_active=""

while [ $# -gt 0 ]; do
  case "$1" in
    --delete) delete=1 ;;
    --force) force=1 ;;
    --quiet) quiet=1 ;;
    --abi) arg_abis=${2-}; shift ;;
    --abi=*) arg_abis=${1#*=} ;;
    --active) arg_active=${2-}; shift ;;
    --active=*) arg_active=${1#*=} ;;
    --project) project=${2-}; shift ;;
    --project=*) project=${1#*=} ;;
    --delete=*) echo "clean-abi: --delete takes no value (it is a flag)" >&2; exit 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "clean-abi: unknown option '$1'" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

if [ ! -d "$project" ]; then
  echo "clean-abi: no such project directory: $project" >&2
  exit 2
fi
project=$(cd "$project" && pwd)

# --- Which ABIs a build currently relies on, and where that came from ------
active=$arg_active
active_from="the --active override"
props=""
[ -n "${GRADLE_USER_HOME:-}" ] && props="$GRADLE_USER_HOME/gradle.properties"
if [ -z "$active" ] && [ -n "$props" ] && [ -f "$props" ]; then
  active=$(sed -n -e 's/^reactNativeArchitectures=//p' "$props" | tr -d '\r' | tail -1)
  [ -n "$active" ] && active_from="reactNativeArchitectures in $props"
fi
if [ -z "$active" ] && [ -n "${ANDROID_ARCHS:-}" ]; then
  active=$ANDROID_ARCHS
  active_from='$ANDROID_ARCHS'
fi
if [ -z "$active" ]; then
  active=x86_64
  active_from='the default (no gradle.properties pin and no $ANDROID_ARCHS)'
fi
active=$(csv_to_words "$active")

is_pinned() { # is_pinned <abi>
  local abi=$1 item
  for item in $active; do
    [ "$item" = "$abi" ] && return 0
  done
  return 1
}

# --- Which ABIs this run is about -----------------------------------------
wanted=""
if [ -n "$arg_abis" ]; then
  for item in $(csv_to_words "$arg_abis"); do
    case " $SUPPORTED_ABIS " in
      *" $item "*) ;;
      *) echo "clean-abi: unsupported ABI '$item' (supported: $SUPPORTED_ABIS)" >&2; exit 2 ;;
    esac
    case " $wanted " in
      *" $item "*) ;;
      *) wanted="$wanted $item" ;;
    esac
  done
else
  for item in $SUPPORTED_ABIS; do
    is_pinned "$item" && continue
    wanted="$wanted $item"
  done
fi
wanted=${wanted# }

refused=""
for item in $wanted; do
  is_pinned "$item" && refused="$refused $item"
done
refused=${refused# }
if [ -n "$refused" ] && [ "$force" -ne 1 ]; then
  if [ "$delete" -eq 1 ]; then
    echo "clean-abi: refusing to clear $refused — it is in the active pin ($active_from). A build with this pin needs those objects; re-run with --force to clear them anyway." >&2
    # Refusals are machine-readable too: mode=refused says "nothing was looked
    # for and nothing was deleted", which an exit code alone cannot.
    echo "SUMMARY targets=0 size_kb=0 deleted=0 skipped_links=0 mode=refused heals=0 durable=0 dropped=0"
    exit 2
  fi
  echo "clean-abi: $refused is in the active pin ($active_from) — listed below, never deleted without --force." >&2
fi

if [ -z "$wanted" ]; then
  echo "clean-abi: nothing to clear — every supported ABI is in the active pin ($active)." >&2
  echo "SUMMARY targets=0 size_kb=0 deleted=0 skipped_links=0 mode=report heals=0 durable=0 dropped=0"
  exit 0
fi

# --- Collect the artifacts -------------------------------------------------
roots="$project/android"
for d in "$project"/node_modules/*/android "$project"/node_modules/@*/*/android; do
  [ -d "$d" ] && roots="$roots
$d"
done

targets=""          # one "<kb>|<abi>|<path>|<kind>" per line, sorted later
anchors_hit=""
skipped_links=0
heals=0
durable=0
dropped=0
while IFS= read -r root; do
  [ -n "$root" ] || continue
  [ -d "$root" ] || continue
  # Physical path of the root. `node_modules` is a junction onto another volume,
  # so its roots legitimately resolve outside the project directory; what must
  # never happen is a target resolving outside *its own root*, which is how a
  # stray link or junction would drag this script into deleting someone else's
  # folder. `-L` alone is not enough: Git Bash reports an NTFS junction as an
  # ordinary directory, so the test is containment after full resolution.
  root_phys=$(cd "$root" 2>/dev/null && pwd -P)
  [ -n "$root_phys" ] || continue
  for anchor in "$root"/.cxx "$root"/build "$root"/*/.cxx "$root"/*/build; do
    [ -d "$anchor" ] || continue
    for abi in $wanted; do
      while IFS= read -r found; do
        [ -n "$found" ] || continue
        found_phys=$(cd "$found" 2>/dev/null && pwd -P)
        case "$found_phys/" in
          "$root_phys"/*) ;;
          *)
            skipped_links=$((skipped_links + 1))
            [ "$quiet" -eq 1 ] || echo "  skip    $found (resolves to ${found_phys:-unreadable}, outside $root)"
            continue
            ;;
        esac
        # Is this a real per-ABI artifact, or a directory that merely happens to
        # be spelled like an ABI? The two trees key their folders differently, so
        # each needs its own test — AGP and CMake both reuse ABI-shaped names
        # deeper inside a *single* ABI's tree, and deleting those reaches into the
        # ABI the pin protects. `case` globs cannot express that, since `*` matches
        # across `/`, so the .cxx test counts path components instead.
        #   task output : the parent holds one child per ABI
        #                 (lib/, jni/, out/, obj/, or a variant dir like debug/)
        #   .cxx        : <Config>/<hash>[/<extra>]/<abi>, i.e. at most 4
        #                 components below the config dir that starts the path
        parent=${found%/*}
        parent=${parent##*/}
        rel=${found#$anchor/}
        head=${rel%%/*}
        depth=1
        rest=$rel
        while [ "$rest" != "${rest%%/*}" ]; do
          rest=${rest#*/}
          depth=$((depth + 1))
        done
        kind=""
        case "$anchor" in
          */.cxx)
            case "$head" in
              Debug|Release|RelWithDebInfo|MinSizeRel|tools)
                [ "$depth" -le 4 ] && kind=cxx
                ;;
            esac
            ;;
          *)
            case "$parent" in
              lib|jni|out|obj|debug|release) kind=heals ;;
            esac
            ;;
        esac
        if [ -z "$kind" ]; then
          dropped=$((dropped + 1))
          [ "$quiet" -eq 1 ] || echo "  drop    $found (parent $parent/ is not a per-ABI folder — not an ABI artifact, never deleted)"
          continue
        fi
        kb=$(du -sk "$found" 2>/dev/null | cut -f1)
        [ -n "$kb" ] || kb=0
        anchors_hit="$anchors_hit
$anchor"
        # `.cxx` holds compiled objects, whose loss is durable because restoring
        # them costs compiles. Anything else sits in a task's own output
        # directory, which Gradle re-runs and writes back on the next build.
        if [ "$kind" = cxx ]; then
          durable=$((durable + 1))
        else
          kind=heals
          heals=$((heals + 1))
        fi
        targets="$targets$kb|$abi|$found|$kind
"
      # -type l as well as -type d: a link or junction named after the ABI is a
      # candidate too, and the containment test below decides whether it is safe.
      # Plain `-type d` would hide it on Linux, where a symlink is not a directory.
      done < <(find "$anchor" \( -type d -o -type l \) -name "$abi" 2>/dev/null | LC_ALL=C sort)
    done
  done
done <<EOFROOTS
$roots
EOFROOTS

targets=$(printf '%s' "$targets" | sed '/^$/d')
total_kb=0
count=0
if [ -n "$targets" ]; then
  while IFS= read -r line; do
    total_kb=$((total_kb + ${line%%|*}))
    count=$((count + 1))
  done <<EOFT
$targets
EOFT
fi

# --- Delete ----------------------------------------------------------------
deleted=0
fail=0
anchors_hit=$(printf '%s' "${anchors_hit:-}" | sed '/^$/d' | sort -u)
if [ "$delete" -eq 1 ] && [ -n "$targets" ]; then
  while IFS='|' read -r kb abi path kind; do
    [ -n "$path" ] || continue
    if is_pinned "$abi" && [ "$force" -ne 1 ]; then
      continue
    fi
    # Git Bash only: `cmd //c` with MSYS_NO_PATHCONV set opens an interactive cmd
    # that never returns, and path conversion mangles the Windows argument, so
    # clear it here and hand cmd an explicit Windows path.
    unset MSYS_NO_PATHCONV
    if command -v cygpath >/dev/null 2>&1 && command -v cmd >/dev/null 2>&1; then
      # `rd /s /q` cleared 5.9 GB of object files in seconds; rm -rf needs minutes.
      cmd //c "rd /s /q $(cygpath -w "$path")" >/dev/null 2>&1
    fi
    [ -d "$path" ] && rm -rf "$path"
    if [ -e "$path" ]; then
      echo "clean-abi: could not delete $path" >&2
      fail=$((fail + 1))
    else
      deleted=$((deleted + 1))
      [ "$quiet" -eq 1 ] || echo "  deleted $abi  $kb KB  $path"
    fi
  done <<EOFDEL
$targets
EOFDEL

  # An emptied hash folder left behind makes `android-env.sh --check` report a
  # split native cache for a configuration that no longer exists.
  while IFS= read -r anchor; do
    [ -n "$anchor" ] && [ -d "$anchor" ] && find "$anchor" -mindepth 1 -type d -empty -delete 2>/dev/null
  done <<EOFA
$anchors_hit
EOFA
fi

# --- Report ----------------------------------------------------------------
mode=report
[ "$delete" -eq 1 ] && mode=delete
if [ "$quiet" -ne 1 ]; then
  echo "clean-abi · $project"
  echo "  active pin : $(printf '%s' "$active" | tr ' ' ',')  ($active_from)"
  echo "  clearing   : $(printf '%s' "$wanted" | tr ' ' ',')"
  if [ -n "$targets" ]; then
    while IFS='|' read -r kb abi path kind; do
      [ -n "$path" ] || continue
      mark=""
      is_pinned "$abi" && mark="  [pinned]"
      # `heals` goes before the path: the gate reads the path as the last token.
      echo "  target  $abi  $kb KB  $kind  $path$mark"
    done <<EOFP
$targets
EOFP
  fi
  echo "  found      : $count folder(s), $total_kb KB"
  if [ "$delete" -eq 1 ]; then
    # Free space is reported per volume, because node_modules artifacts are on D:
    # while the app module's own objects stay on C:.
    seen_vols=""
    while IFS='|' read -r kb abi path kind; do
      [ -n "$path" ] || continue
      fsname=$(df -P "$path" 2>/dev/null | awk 'NR==2 {print $1}')
      [ -n "$fsname" ] || continue
      case " $seen_vols " in *" $fsname "*) continue ;; esac
      seen_vols="$seen_vols $fsname"
      free=$(df -Pm "$path" 2>/dev/null | awk 'NR==2 {print $4}')
      echo "  volume    $fsname now $free MB free"
    done <<EOFV
$targets
EOFV
  fi
fi
if [ "$heals" -gt 0 ] && [ "$quiet" -ne 1 ]; then
  echo "  note     $heals of $count target(s) sit in a task's own output dir: the next build re-runs that task and writes the same files back (measured: 39 480 KB restored by one warm assembleDebug). Deleting them frees space only until then; the reclaim that stays is in .cxx objects, and those cost a recompile to bring back."
fi
if [ "$dropped" -gt 0 ] && [ "$quiet" -ne 1 ]; then
  echo "  note     $dropped candidate(s) dropped for not being per-ABI folders (see the drop lines above); never deleted."
fi
echo "SUMMARY targets=$count size_kb=$total_kb deleted=$deleted skipped_links=$skipped_links mode=$mode heals=$heals durable=$durable dropped=$dropped"

if [ "$fail" -gt 0 ]; then
  echo "clean-abi: $fail delete(s) failed." >&2
  exit 1
fi
exit 0
