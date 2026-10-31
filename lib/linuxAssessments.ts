/**
 * Linux Journey assessments.
 *
 * The imported course is 185 reading lessons; this file adds the missing
 * mastery layer: a guided command lab and a cumulative final for each of the
 * three units. Commands are graded as typed production, not recognition, so a
 * learner has to recall the real syntax. Everything is original and aligned to
 * the unit goals in `linuxCurriculum.ts`.
 */

import type { CurriculumBlock } from './curriculum';
import { MCQ, TEXT, type CourseLesson } from './quizBank';

export const LINUX_ASSESSMENTS: Record<string, CourseLesson> = {
  'linux-grasshopper-lab': {
    id: 'linux-grasshopper-lab',
    title: 'Grasshopper command lab',
    theory: [
      'A command lab is a rehearsal for a real shell. Type the exact command you would run, including flags, because flags are where the meaning lives.',
      'Work from what you know: pwd prints the working directory, ls lists it, mkdir creates a directory, chmod changes permissions, and grep searches text. Short flags can usually be combined, but spelling matters.',
    ],
    questions: [
      TEXT(
        'Print the absolute path of the directory you are currently in.',
        ['pwd'],
        'pwd = print working directory. It answers “where am I?” before you create or delete anything.',
        { placeholder: 'Type the command only', misconceptions: { 'cd': 'cd changes directory; it does not print where you are.' } }
      ),
      TEXT(
        'List every file, including hidden dotfiles, with a long listing.',
        ['ls -la', 'ls -al', 'ls -l -a', 'ls -a -l'],
        'ls -la combines long format (-l) with all entries (-a), including dotfiles such as .bashrc.',
        { placeholder: 'Type the command only', misconceptions: { 'ls': 'Plain ls hides dotfiles and omits permissions, owner, size and date.' } }
      ),
      TEXT(
        'Create a directory named projects inside the current directory.',
        ['mkdir projects'],
        'mkdir projects creates one directory at the relative path ./projects. Add -p when you need missing parents too.',
        { placeholder: 'Type the command only' }
      ),
      TEXT(
        'Make notes.txt readable and writable by its owner, and readable by everyone else.',
        ['chmod 644 notes.txt', 'chmod u=rw,go=r notes.txt'],
        '644 is the standard file mode: owner rw-, group r--, others r--. Directories usually need 755 so they can be entered.',
        { placeholder: 'Type the command only', misconceptions: { 'chmod 777 notes.txt': '777 grants write and execute to everyone — far more than the task asks for.' } }
      ),
      TEXT(
        'Search the file server.log for lines containing the word ERROR.',
        ['grep ERROR server.log', 'grep "ERROR" server.log', "grep 'ERROR' server.log", 'grep -i error server.log'],
        'grep pattern file prints matching lines. Add -i for case-insensitive matching and -n to include line numbers.',
        { placeholder: 'Type the command only' }
      ),
    ],
  },

  'linux-grasshopper-final': {
    id: 'linux-grasshopper-final',
    title: 'Grasshopper final exam',
    theory: [
      'This final covers the Grasshopper unit: the shell, files and directories, text tools, users, permissions, processes and packages.',
      'Expect applied decisions, not trivia. Read the scenario, choose the command whose behaviour actually matches the goal, and type exact syntax for production items.',
    ],
    questions: [
      MCQ(
        'A script prints “Permission denied” when you run ./deploy.sh. What is the safest first fix?',
        'Grant execute permission to the owner: chmod u+x deploy.sh',
        [
          'Grant execute permission to the owner: chmod u+x deploy.sh',
          'Run it with chmod 777 deploy.sh',
          'Delete the script and recreate it as root',
          'Move it to /tmp so permissions no longer apply',
        ],
        'The file needs the execute bit, not global write access. u+x grants exactly what is missing.'
      ),
      MCQ(
        'You need to find every .log file under /var, including nested directories. Which command fits?',
        'find /var -name "*.log"',
        ['find /var -name "*.log"', 'ls /var/*.log', 'grep /var "*.log"', 'cat /var/*.log'],
        'find walks the tree recursively; a shell glob only expands one directory level.'
      ),
      TEXT(
        'Show the manual page for the tar command.',
        ['man tar'],
        'man opens the manual page for a command. Use q to leave the pager.',
        { placeholder: 'Type the command only' }
      ),
      TEXT(
        'Show your current user name and the groups you belong to.',
        ['id', 'id -a', 'groups', 'whoami && groups'],
        'id prints uid, gid and group memberships in one line. groups prints just the group names; whoami prints only the user.',
        { placeholder: 'Type the command only' }
      ),
      MCQ(
        'A teammate can read a private key because it is mode 644. Which mode should it be?',
        '600 — owner read/write only',
        ['600 — owner read/write only', '777 — everyone can use it', '644 — the current mode is fine', '444 — read-only for everyone'],
        'Private keys must not be readable by group or others. 600 limits access to the owner.'
      ),
      TEXT(
        'Install the package named htop with apt.',
        ['sudo apt install htop', 'sudo apt-get install htop'],
        'apt install resolves and installs the package; sudo is required because package management writes system locations.',
        { placeholder: 'Type the command only' }
      ),
      MCQ(
        'A process is stuck and you want its PID before killing it. Which command shows running processes with PIDs?',
        'ps aux',
        ['ps aux', 'ls -l', 'pwd', 'df -h'],
        'ps aux lists processes with user, PID, CPU, memory and command. ps aux | grep name narrows it down.'
      ),
      TEXT(
        'Send the TERM signal to the process with PID 4242.',
        ['kill 4242', 'kill -TERM 4242', 'kill -15 4242'],
        'kill sends SIGTERM by default, giving the process a chance to shut down cleanly.',
        { placeholder: 'Type the command only', misconceptions: { 'kill -9 4242': 'SIGKILL cannot be caught or cleaned up; try TERM first.' } }
      ),
      MCQ(
        'You need to read the last 50 lines of a large log. Which command is the direct fit?',
        'tail -n 50 app.log',
        ['tail -n 50 app.log', 'head -n 50 app.log', 'cat app.log', 'wc -l app.log'],
        'tail reads from the end. head reads the beginning; cat dumps the whole file.'
      ),
    ],
  },

  'linux-journeyman-lab': {
    id: 'linux-journeyman-lab',
    title: 'Journeyman command lab',
    theory: [
      'Journeyman work is about seeing the machine: storage, mounts, boot and service state, kernels and logs.',
      'Type the command that answers the question, not a command that merely mentions the topic. Flags such as -h, -u and -f change the output enough to matter.',
    ],
    questions: [
      TEXT(
        'Show disk usage for all mounted filesystems in human-readable units.',
        ['df -h'],
        'df reports filesystem capacity; -h scales to K, M and G so the numbers are readable.',
        { placeholder: 'Type the command only' }
      ),
      TEXT(
        'Show the amount of space used by the current directory and its contents.',
        ['du -sh .', 'du -h --summarize .'],
        'du -s summarizes instead of listing every file; -h makes the total human-readable.',
        { placeholder: 'Type the command only' }
      ),
      TEXT(
        'Show whether the ssh service is active.',
        ['systemctl status ssh', 'systemctl status sshd', 'systemctl is-active ssh', 'systemctl is-active sshd'],
        'systemctl status shows the unit state and recent log lines; is-active returns just the state.',
        { placeholder: 'Type the command only' }
      ),
      TEXT(
        'Follow new log entries for the nginx service as they appear.',
        ['journalctl -u nginx -f', 'journalctl -f -u nginx'],
        '-u filters to one systemd unit; -f follows the journal until you press Ctrl+C.',
        { placeholder: 'Type the command only', misconceptions: { 'journalctl -u nginx': 'Without -f you see history and the command exits; it does not follow new entries.' } }
      ),
      TEXT(
        'Show the kernel version and machine architecture.',
        ['uname -a', 'uname -r', 'uname -m'],
        'uname -a prints kernel name, release, machine and more; -r is just the kernel release, -m just the architecture.',
        { placeholder: 'Type the command only' }
      ),
    ],
  },

  'linux-journeyman-final': {
    id: 'linux-journeyman-final',
    title: 'Journeyman final exam',
    theory: [
      'This final covers devices, filesystems, boot, the kernel, init and services, logging, and process utilization.',
      'The questions reward diagnosis: what state are you in, what evidence would prove it, and which command produces that evidence without changing the system?',
    ],
    questions: [
      MCQ(
        'A server boots but a service never starts. Where do you look first for its failure reason?',
        'The service journal: journalctl -u <service>',
        ['The service journal: journalctl -u <service>', 'The package changelog', 'The DNS zone file', 'The user’s bash history'],
        'systemd records unit start attempts and failures in the journal; start there before changing config.'
      ),
      TEXT(
        'Show the mounted filesystems and their mount points.',
        ['mount', 'findmnt', 'cat /proc/mounts'],
        'mount with no arguments lists active mounts. findmnt presents the same tree more readably.',
        { placeholder: 'Type the command only' }
      ),
      MCQ(
        'A disk is full but df shows free space. Which command helps find large directories under /var?',
        'du -sh /var/* | sort -h',
        ['du -sh /var/* | sort -h', 'ls /var', 'df -h /var', 'free -h'],
        'du reports per-directory usage; sorting by human-readable size puts the heavy directories last.'
      ),
      TEXT(
        'Show memory and swap usage in human-readable units.',
        ['free -h'],
        'free -h reports total, used, free, shared, cache and available memory plus swap.',
        { placeholder: 'Type the command only' }
      ),
      MCQ(
        'A process uses 100% CPU and you need its PID and parent. Which view is best?',
        'ps -eo pid,ppid,pcpu,comm --sort=-pcpu | head',
        ['ps -eo pid,ppid,pcpu,comm --sort=-pcpu | head', 'ls -l /proc', 'cat /etc/passwd', 'df -h'],
        'A custom ps format shows the identifiers and CPU together; sorting puts the heaviest process first.'
      ),
      TEXT(
        'Trace which process is listening on TCP port 443.',
        ['ss -tulpn | grep 443', 'ss -tlnp | grep 443', 'lsof -i :443', 'netstat -tulpn | grep 443'],
        'ss -tulpn lists TCP/UDP listeners with ports and owning processes; lsof -i :443 is the equivalent on many systems.',
        { placeholder: 'Type the command only' }
      ),
      MCQ(
        'A kernel update is installed but the running kernel is older. What proves the running version?',
        'uname -r',
        ['uname -r', 'apt list --installed', 'ls /boot', 'cat /etc/hostname'],
        'uname -r reports the kernel currently running, which can differ from the newest installed package until reboot.'
      ),
      TEXT(
        'Follow the system journal live while you reproduce a failure.',
        ['journalctl -f', 'journalctl -xf', 'tail -f /var/log/syslog'],
        'journalctl -f follows the journal; -x adds explanatory help text for each entry.',
        { placeholder: 'Type the command only' }
      ),
      MCQ(
        'You changed a systemd unit file. What must happen before the change takes effect?',
        'Reload systemd, then restart the service: systemctl daemon-reload && systemctl restart <service>',
        [
          'Reload systemd, then restart the service: systemctl daemon-reload && systemctl restart <service>',
          'Nothing — systemd watches files continuously',
          'Only reboot the whole machine',
          'Delete the unit and recreate it from scratch',
        ],
        'systemd caches unit definitions; daemon-reload rereads them, and the running service still needs a restart.'
      ),
    ],
  },

  'linux-networking-lab': {
    id: 'linux-networking-lab',
    title: 'Networking command lab',
    theory: [
      'Networking labs reward a disciplined sequence: find your address, test reachability, resolve names, trace the path, and inspect listeners.',
      'Type the command you would actually run, including the flags that change output. “ping” alone is not the same as “ping -c 4”.',
    ],
    questions: [
      TEXT(
        'Show all network interfaces and their IP addresses.',
        ['ip addr', 'ip a', 'ip address', 'ifconfig'],
        'ip addr is the modern replacement for ifconfig; it shows every interface, state and address.',
        { placeholder: 'Type the command only' }
      ),
      TEXT(
        'Send exactly four ICMP echo requests to example.com.',
        ['ping -c 4 example.com'],
        '-c 4 stops after four packets, so the command returns instead of running until interrupted.',
        { placeholder: 'Type the command only', misconceptions: { 'ping example.com': 'That pings forever until Ctrl+C; the task asks for exactly four.' } }
      ),
      TEXT(
        'Resolve the A record for example.com with dig.',
        ['dig example.com', 'dig example.com A', 'dig +short example.com'],
        'dig queries DNS directly. +short strips the section headers when you only need the answer.',
        { placeholder: 'Type the command only' }
      ),
      TEXT(
        'Show the network path packets take to example.com.',
        ['traceroute example.com', 'tracepath example.com', 'mtr example.com'],
        'traceroute prints each hop and its latency; mtr combines that view with continuous statistics.',
        { placeholder: 'Type the command only' }
      ),
      TEXT(
        'List listening TCP ports and the processes that own them.',
        ['ss -tlnp', 'ss -tulpn', 'netstat -tlnp', 'lsof -iTCP -sTCP:LISTEN'],
        'ss -tlnp filters to TCP listeners, numeric ports and process ownership; sudo may be required to see other users’ processes.',
        { placeholder: 'Type the command only' }
      ),
    ],
  },

  'linux-networking-final': {
    id: 'linux-networking-final',
    title: 'Networking final exam',
    theory: [
      'This final covers file sharing, network basics, subnetting, routing, interface configuration, troubleshooting and DNS.',
      'Every question is a diagnostic decision: which layer is failing, what evidence would distinguish the possible causes, and which command produces that evidence.',
    ],
    questions: [
      MCQ(
        'A host can ping 8.8.8.8 but cannot load example.com. Which layer is the first suspect?',
        'DNS resolution',
        ['DNS resolution', 'The physical link', 'The default gateway', 'The remote web server’s CPU'],
        'Reaching an IP proves routing works; name resolution is the next layer to test with dig or nslookup.'
      ),
      TEXT(
        'Show the routing table with numeric addresses.',
        ['ip route', 'ip route show', 'route -n', 'netstat -rn'],
        'ip route prints the kernel routing table; -n keeps addresses numeric instead of resolving names.',
        { placeholder: 'Type the command only' }
      ),
      MCQ(
        'A /24 subnet has how many usable host addresses?',
        '254',
        ['254', '256', '255', '128'],
        '256 total addresses minus the network and broadcast addresses leaves 254 usable hosts.'
      ),
      TEXT(
        'Query the DNS server at 1.1.1.1 for example.com.',
        ['dig @1.1.1.1 example.com', 'nslookup example.com 1.1.1.1'],
        '@server tells dig which resolver to ask; nslookup takes the server as its second argument.',
        { placeholder: 'Type the command only' }
      ),
      MCQ(
        'Users report slow transfers between two hosts on the same switch. Which tool measures the path and packet loss?',
        'mtr <host>',
        ['mtr <host>', 'lsblk', 'df -h', 'systemctl status'],
        'mtr combines traceroute and ping statistics, exposing the hop where loss or latency begins.'
      ),
      TEXT(
        'Show the default route only.',
        ['ip route show default', 'ip route | grep default', 'route -n | grep "^0.0.0.0"'],
        'The default route is the gateway used when no more specific route matches. Filtering ip route to “default” is the direct answer.',
        { placeholder: 'Type the command only' }
      ),
      MCQ(
        'A service is unreachable from another machine but works on localhost. What should you check first?',
        'Whether it listens on 0.0.0.0/all interfaces or only 127.0.0.1, and whether a firewall allows the port',
        [
          'Whether it listens on 0.0.0.0/all interfaces or only 127.0.0.1, and whether a firewall allows the port',
          'The local user’s shell history',
          'The size of /var/log',
          'The machine’s hostname length',
        ],
        'A localhost-only bind is invisible to the network; a firewall can block an otherwise correct bind. ss -tlnp shows the bind address.'
      ),
      MCQ(
        'You need to copy a directory to a remote host repeatedly, sending only changed files. Which tool is designed for that?',
        'rsync -av source/ user@host:/dest/',
        ['rsync -av source/ user@host:/dest/', 'scp -r source/ user@host:/dest/', 'cat source/* > /dest', 'tar -cf backup.tar source/'],
        'rsync compares both sides and transfers deltas; scp copies everything each time.'
      ),
      TEXT(
        'Ask the local resolver for the MX records of example.com.',
        ['dig example.com MX', 'dig MX example.com', 'nslookup -type=MX example.com'],
        'MX records name the mail exchangers for a domain. dig accepts the type before or after the name.',
        { placeholder: 'Type the command only' }
      ),
    ],
  },
};

/** Assessment blocks inserted before each unit's review node. */
export const LINUX_ASSESSMENT_BLOCKS: Record<string, CurriculumBlock[]> = {
  'linux-grasshopper': [
    {
      id: 'lx-grasshopper-lab',
      kind: 'lab',
      title: 'Grasshopper command lab',
      blurb: 'Independent lab: type the real commands for files, permissions, text search and processes.',
      minutes: 8,
      xp: 30,
      lessonId: 'linux-grasshopper-lab',
      lessonTitle: 'Grasshopper command lab',
    },
    {
      id: 'lx-grasshopper-final',
      kind: 'quiz',
      title: 'Grasshopper final exam',
      blurb: 'Prove the unit: applied shell decisions plus typed commands.',
      minutes: 10,
      xp: 50,
      lessonId: 'linux-grasshopper-final',
      lessonTitle: 'Grasshopper final exam',
    },
  ],
  'linux-journeyman': [
    {
      id: 'lx-journeyman-lab',
      kind: 'lab',
      title: 'Journeyman command lab',
      blurb: 'Independent lab: inspect disks, services, logs and running processes from the shell.',
      minutes: 8,
      xp: 30,
      lessonId: 'linux-journeyman-lab',
      lessonTitle: 'Journeyman command lab',
    },
    {
      id: 'lx-journeyman-final',
      kind: 'quiz',
      title: 'Journeyman final exam',
      blurb: 'Prove the unit: diagnose boot, storage, service and process problems.',
      minutes: 10,
      xp: 50,
      lessonId: 'linux-journeyman-final',
      lessonTitle: 'Journeyman final exam',
    },
  ],
  'linux-networking': [
    {
      id: 'lx-networking-lab',
      kind: 'lab',
      title: 'Networking command lab',
      blurb: 'Independent lab: addresses, reachability, DNS, routes and listening ports.',
      minutes: 8,
      xp: 30,
      lessonId: 'linux-networking-lab',
      lessonTitle: 'Networking command lab',
    },
    {
      id: 'lx-networking-final',
      kind: 'quiz',
      title: 'Networking final exam',
      blurb: 'Prove the unit: isolate failures across DNS, routing, interfaces and services.',
      minutes: 10,
      xp: 50,
      lessonId: 'linux-networking-final',
      lessonTitle: 'Networking final exam',
    },
  ],
};
