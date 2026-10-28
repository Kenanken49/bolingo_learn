/**
 * Track Linux · Journeyman — Linux Journey course bank.
 *
 * Lesson theory verbatim from linuxjourney-desktop (GPL-3.0):
 * https://github.com/Sempiternal-Futility/linuxjourney-desktop
 * (fork of LinuxJourney.com). Quiz questions are original, derived from
 * each lesson's own text so every answer is provable from the theory.
 * SPDX-License-Identifier: GPL-3.0-only (this file).
 */

import { MCQ, BUILD, type CourseLesson } from '../quizBank';

export const TRACK_LINUX_JOURNEYMAN: Record<string, CourseLesson> = {
  'linux-devices-1': {
    id: 'linux-devices-1',
    title: 'Dev Directory',
    theory: [
      'When you connect a device to your machine, it generally needs a device driver to function properly. You can interact with device drivers through device files or device nodes, these are special files that look like regular files. Since these device files are just like regular files, you can use programs such as ls, cat, etc to interact with them. These device files are generally stored in the /dev directory. Go ahead and ls the /dev directory on your system, you\'ll see a large amount of devices files that are on your system.',
      '"ls /dev"',
      'Some of these devices you\'ve already used and interacted with such as "/dev/null". Remember when we send output to "/dev/null", the kernel knows that this device takes all of our input and just discards it, so nothing gets returned.',
      'In the old days, if you wanted to add a device to your system, you\'d add the device file in /dev and then probably forget about it. Well repeat that a couple of times and you can see where there was a problem. The /dev directory would get cluttered with static device files of devices that you\'ve long since upgraded, stopped using, etc.',
      'Devices are also assigned device files in the order that the kernel finds them. So if everytime you rebooted your system, the devices could have different device files depending on when they were discovered.',
      'Thankfully we no longer use that method! Now we have something that we use to dynamically add and remove devices that are currently being used on the system and we\'ll be discussing this in the coming lessons.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Dev Directory’ cover?',
        'Dev Directory',
        ['Dev Directory', 'Device Types', 'Device Names', 'Sysfs'],
        'This lesson is ‘Dev Directory’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ls /dev',
        ['ls', '/dev'],
        ['ls', '/dev', 'sudo', '-la'],
        'Type it exactly as shown: ls /dev. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “When you connect a device to your machine, it generally needs a device driver to function properly. You can interact with device drivers through device files o…” — which lesson is this?',
        'Dev Directory',
        ['Dev Directory', 'Device Types', 'Device Names', 'Sysfs'],
        'Those opening lines are from ‘Dev Directory’.'
      ),
      MCQ(
        'The lesson continues with: “"ls /dev"” — which lesson is this?',
        'Dev Directory',
        ['Dev Directory', 'Device Types', 'Device Names', 'Sysfs'],
        'Those lines are from ‘Dev Directory’.'
      ),
    ],
  },
  'linux-devices-2': {
    id: 'linux-devices-2',
    title: 'Device Types',
    theory: [
      'Before we chat about how devices are managed, let\'s actually take a look at some devices. "ls -l /dev" brw-rw---- 1 root disk 8, 0 Dec 20 20:13 sda crw-rw-rw- 1 root root 1, 3 Dec 20 20:13 null srw-rw-rw- 1 root root 0 Dec 20 20:13 log prw-r--r-- 1 root root 0 Dec 20 20:13 fdata',
      'The columns are as follows from left to right: 1- Permissions 2- Owner 3- Group 4- Major Device Number 5- Minor Device Number 6- Timestamp 7- Device Name',
      'Remember in the ls command you can see the type of file with the first bit on each line. Device files are denoted as the following: 1- c - character 2- b - block 3- p - pipe 4- s - socket',
      'Character Device: These devices transfer data, but one a character at a time. You\'ll see a lot of pseudo devices (/dev/null) as character devices, these devices aren\'t really physically connected to the machine, but they allow the operating system greater functionality.',
      'Block Device: These devices transfer data, but in large fixed-sized blocks. You\'ll most commonly see devices that utilize data blocks as block devices, such as harddrives, filesystems, etc.',
      'Pipe Device: Named pipes allow two or more processes to communicate with each other, these are similar to character devices, but instead of having output sent to a device, it\'s sent to another process.',
      'Socket Device: Socket devices facilitate communication between processes, similar to pipe devices but they can communicate with many processes at once.',
      'Device Characterization: Devices are characterized using two numbers, "major device number" and "minor device number". You can see these numbers in the above ls example, they are separated by a comma. For example, let\'s say a device had the device numbers: "8, 0":',
      'The major device number represents the device driver that is used, in this case 8, which is often the major number for sd block devices. The minor number tells the kernel which unique device it is in this driver class, in this case 0 is used to represent the first device (a).',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Device Types’ cover?',
        'Device Types',
        ['Device Types', 'Dev Directory', 'Device Names', 'Sysfs'],
        'This lesson is ‘Device Types’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ls -l /dev',
        ['ls', '-l', '/dev'],
        ['ls', '-l', '/dev', 'sudo', '-la'],
        'Type it exactly as shown: ls -l /dev. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Before we chat about how devices are managed, let\'s actually take a look at some devices. "ls -l /dev" brw-rw---- 1 root disk 8, 0 Dec 20 20:13 sda crw-rw-rw-…” — which lesson is this?',
        'Device Types',
        ['Device Types', 'Dev Directory', 'Device Names', 'Sysfs'],
        'Those opening lines are from ‘Device Types’.'
      ),
      BUILD(
        'Assemble another command from this lesson: major device number',
        ['major', 'device', 'number'],
        ['major', 'device', 'number', 'sudo', '-la'],
        'Type it exactly as shown: major device number.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Device Types’ lesson?',
        'minor device number',
        ['minor device number', 'core', 'echo Hello World', 'pwd'],
        'The ‘Device Types’ lesson mentions “minor device number” — find it in the theory above.'
      ),
    ],
  },
  'linux-devices-3': {
    id: 'linux-devices-3',
    title: 'Device Names',
    theory: [
      'Here are the most common device names that you will encounter:',
      'SCSI Devices: If you have any sort of mass storage on your machine, chances are it is using the SCSI (pronounced "scuzzy") protocol. SCSI stands for Small Computer System Interface, it is a protocol used for allow communication between disks, printers, scanners and other peripherals to your system.',
      'You may have heard of SCSI devices which aren\'t actually in use in modern systems, however our Linux systems correspond SCSI disks with hard disk drives in /dev. They are represented by a prefix of sd (SCSI disk):',
      'Common SCSI device files: 1- /dev/sda - First hard disk 2- /dev/sdb - Second hard disk 3- /dev/sda3 - Third partition on the first hard disk',
      'Pseudo Devices: As we discussed earlier, pseudo devices aren\'t really physically connected to your system, most common pseudo devices are character devices: 1- /dev/zero - accepts and discards all input, produces a continuous stream of NULL (zero value) bytes 2- /dev/null - accepts and discards all input, produces no output 3- /dev/random - produces random numbers',
      'PATA Devices: Sometimes in older systems you may see hard drives being referred to with an hd prefix: 1- /dev/hda - First hard disk 2- /dev/hdd2 - Second partition on 4th hard disk',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Device Names’ cover?',
        'Device Names',
        ['Device Names', 'Dev Directory', 'Device Types', 'Sysfs'],
        'This lesson is ‘Device Names’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Here are the most common device names that you will encounter:” — which lesson is this?',
        'Device Names',
        ['Device Names', 'Dev Directory', 'Device Types', 'Sysfs'],
        'Those opening lines are from ‘Device Names’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Device Names’ lesson?',
        'scuzzy',
        ['scuzzy', 'core', 'echo Hello World', 'pwd'],
        'The ‘Device Names’ lesson mentions “scuzzy” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “SCSI Devices: If you have any sort of mass storage on your machine, chances are it is using the SCSI (pronounced "scuzzy") protocol. SCSI stands for Small Comp…” — which lesson is this?',
        'Device Names',
        ['Device Names', 'Dev Directory', 'Device Types', 'Sysfs'],
        'Those lines are from ‘Device Names’.'
      ),
    ],
  },
  'linux-devices-4': {
    id: 'linux-devices-4',
    title: 'Sysfs',
    theory: [
      'Sysfs was created long ago to better manage devices on our system that the /dev directory failed to do. Sysfs is a virtual filesystem, most often mounted to the /sys directory.',
      'It gives us more detailed information than what we would be able to see in the /dev directory. Both directories "/sys" and "/dev" seem to be very similar and they are in some regards, but they do have major differences.',
      'Basically, the /dev directory is simple, it allows other programs to access devices themselves, while the /sys filesystem is used to view information and manage the device.',
      'The /sys filesystem basically contains all the information for all devices on your system, such as the manufacturer and model, where the device is plugged in, the state of the device, the hierarchy of devices and more. The files you see here aren\'t device nodes, so you don\'t really interact with devices from the /sys directory, rather you are managing devices.',
      'Take a look at the contents of the /sys directory:',
      '"ls /sys/block/sda" alignment_offset discard_alignment holders removable sda6 trace bdi events inflight ro size uevent capability events_async power sda1 slaves dev events_poll_msecs queue sda2 stat device ext_range range sda5 subsystem',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Sysfs’ cover?',
        'Sysfs',
        ['Sysfs', 'Dev Directory', 'Device Types', 'Device Names'],
        'This lesson is ‘Sysfs’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ls /sys/block/sda',
        ['ls', '/sys/block/sda'],
        ['ls', '/sys/block/sda', 'sudo', '-la'],
        'Type it exactly as shown: ls /sys/block/sda. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Sysfs was created long ago to better manage devices on our system that the /dev directory failed to do. Sysfs is a virtual filesystem, most often mounted to th…” — which lesson is this?',
        'Sysfs',
        ['Sysfs', 'Dev Directory', 'Device Types', 'Device Names'],
        'Those opening lines are from ‘Sysfs’.'
      ),
      MCQ(
        'The lesson continues with: “It gives us more detailed information than what we would be able to see in the /dev directory. Both directories "/sys" and "/dev" seem to be very similar and t…” — which lesson is this?',
        'Sysfs',
        ['Sysfs', 'Dev Directory', 'Device Types', 'Device Names'],
        'Those lines are from ‘Sysfs’.'
      ),
    ],
  },
  'linux-devices-5': {
    id: 'linux-devices-5',
    title: 'Udev ',
    theory: [
      'Back in the old days and actually today if you really wanted to, you would create device nodes using a command such as: "mknod /dev/sdb1 b 8 3"',
      'This command will make a device node /dev/sdb1 and it will make it a block device (b) with a major number of 8 and a minor number of 3.',
      'To remove a device, you would simply "rm" the device file in the /dev directory.',
      'Luckily, we really don\'t need to do this anymore because of udev. The udev system dynamically creates and removes device files for us depending on whether or not they are connected.',
      'There is a udevd daemon that is running on the system and it listens for messages from the kernel about devices connected to the system. Udevd will parse that information and it will match the data with the rules that are specified in "/etc/udev/rules.d",',
      'depending on those rules it will most likely create device nodes and symbolic links for the devices. You can write your own udev rules, but that is a little out of scope for this lesson. Fortunately, your system already comes with lots of udev rules so you may never need to write your own.',
      'You can also view the udev database and sysfs using the "udevadm" command. This tool is very useful, but sometimes can get very convoluted, a simple command to view information for a device would be:',
      '"udevadm info --query=all --name=/dev/sda"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Udev ’ cover?',
        'Udev ',
        ['Udev ', 'Dev Directory', 'Device Types', 'Device Names'],
        'This lesson is ‘Udev ’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: mknod /dev/sdb1 b 8 3',
        ['mknod', '/dev/sdb1', 'b', '8', '3'],
        ['mknod', '/dev/sdb1', 'b', '8', '3', 'sudo', '-la'],
        'Type it exactly as shown: mknod /dev/sdb1 b 8 3. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Back in the old days and actually today if you really wanted to, you would create device nodes using a command such as: "mknod /dev/sdb1 b 8 3"” — which lesson is this?',
        'Udev ',
        ['Udev ', 'Dev Directory', 'Device Types', 'Device Names'],
        'Those opening lines are from ‘Udev ’.'
      ),
      BUILD(
        'Assemble another command from this lesson: udevadm info --query=all --name=/dev/sda',
        ['udevadm', 'info', '--query=all', '--name=/dev/sda'],
        ['udevadm', 'info', '--query=all', '--name=/dev/sda', 'sudo', '-la'],
        'Type it exactly as shown: udevadm info --query=all --name=/dev/sda.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Udev ’ lesson?',
        'rm',
        ['rm', 'core', 'echo Hello World', 'pwd'],
        'The ‘Udev ’ lesson mentions “rm” — find it in the theory above.'
      ),
    ],
  },
  'linux-devices-6': {
    id: 'linux-devices-6',
    title: 'Listing Devices',
    theory: [
      'Just like we would use the ls command to list files and directories, we can use similar tools that list information about devices.',
      'Listing USB Devices: "lsusb"',
      'Listing PCI Devices: "lspci"',
      'Listing SCSI Devices: "lsscsi"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Listing Devices’ cover?',
        'Listing Devices',
        ['Listing Devices', 'Dev Directory', 'Device Types', 'Device Names'],
        'This lesson is ‘Listing Devices’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Just like we would use the ls command to list files and directories, we can use similar tools that list information about devices.” — which lesson is this?',
        'Listing Devices',
        ['Listing Devices', 'Dev Directory', 'Device Types', 'Device Names'],
        'Those opening lines are from ‘Listing Devices’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Listing Devices’ lesson?',
        'lsusb',
        ['lsusb', 'core', 'echo Hello World', 'pwd'],
        'The ‘Listing Devices’ lesson mentions “lsusb” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “Listing USB Devices: "lsusb"” — which lesson is this?',
        'Listing Devices',
        ['Listing Devices', 'Dev Directory', 'Device Types', 'Device Names'],
        'Those lines are from ‘Listing Devices’.'
      ),
    ],
  },
  'linux-devices-7': {
    id: 'linux-devices-7',
    title: 'Command dd',
    theory: [
      'The dd tool is super useful for converting and copying data. It reads input from a file or data stream and writes it to a file or data stream.',
      'Consider the following command: "dd if=/home/pete/backup.img of=/dev/sdb bs=1024"',
      'This command is copying the contents of backup.img to /dev/sdb. It will copy the data in blocks of 1024 bytes until there is no more data to be copied.',
      '1- if=file - Input file, read from a file instead of standard input',
      '2- of=file - Output file, write to a file instead of standard output',
      '3- bs=bytes - Block size, it reads and writes this many bytes of data at a time. You can use different size metrics by denoting the size with a k for kilobyte, m for megabyte, etc, so 1024 bytes is 1k',
      '4- count=number - Number of blocks to copy.',
      'You will see some dd commands that use the count option, usually with dd if you want to copy a file that is 1 megabyte, you\'ll usually want to see that file as 1 megabyte when it\'s done being copied. Let\'s say you run the following command:',
      '"dd if=/home/pete/backup.img of=/dev/sdb bs=1M count=2"',
      'Our backup.img file is 10M, however, we are saying in this command to copy over 1M 2 times, so only 2M is being copied, leaving our copied data incomplete. Count can come in handy in many situations, but if you are just copying over data, you can pretty much omit count and even bs for that matter. If you really want to optimize your data transfers, then you\'ll want to start using those options.',
      'dd is extremely powerful, you can use it to make backups of anything, including whole disk drives, restoring disks images, and more. Be careful, that powerful tool can come at a price if you aren\'t sure what you are doing.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Command dd’ cover?',
        'Command dd',
        ['Command dd', 'Dev Directory', 'Device Types', 'Device Names'],
        'This lesson is ‘Command dd’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: dd if=/home/pete/backup.img of=/dev/sdb bs=1024',
        ['dd', 'if=/home/pete/backup.img', 'of=/dev/sdb', 'bs=1024'],
        ['dd', 'if=/home/pete/backup.img', 'of=/dev/sdb', 'bs=1024', 'sudo', '-la'],
        'Type it exactly as shown: dd if=/home/pete/backup.img of=/dev/sdb bs=1024. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The dd tool is super useful for converting and copying data. It reads input from a file or data stream and writes it to a file or data stream.” — which lesson is this?',
        'Command dd',
        ['Command dd', 'Dev Directory', 'Device Types', 'Device Names'],
        'Those opening lines are from ‘Command dd’.'
      ),
      BUILD(
        'Assemble another command from this lesson: dd if=/home/pete/backup.img of=/dev/sdb bs=1M count=2',
        ['dd', 'if=/home/pete/backup.img', 'of=/dev/sdb', 'bs=1M', 'count=2'],
        ['dd', 'if=/home/pete/backup.img', 'of=/dev/sdb', 'bs=1M', 'count=2', 'sudo', '-la'],
        'Type it exactly as shown: dd if=/home/pete/backup.img of=/dev/sdb bs=1M count=2.'
      ),
      MCQ(
        'The lesson continues with: “Consider the following command: "dd if=/home/pete/backup.img of=/dev/sdb bs=1024"” — which lesson is this?',
        'Command dd',
        ['Command dd', 'Dev Directory', 'Device Types', 'Device Names'],
        'Those lines are from ‘Command dd’.'
      ),
    ],
  },
  'linux-the-filesystem-1': {
    id: 'linux-the-filesystem-1',
    title: 'FileSystem Hierarchy',
    theory: [
      'At this point, you\'re probably well familiar with the directory structure of your system, if not you will be soon. Filesystems can vary with how they are structured, but for the most part they should conform to the Filesystem Hierarchy Standard.',
      'Go ahead and do an "ls -l" to see the directories listed under the root directory, yours may look different than mine, but the directories should for the most part look like the following:',
      '1- / - The root directory of the entire filesystem hierarchy, everything is nestled under this directory. 2- /bin - Essential ready-to-run programs (binaries), includes the most basic commands such as ls and cp. 3- /boot - Contains kernel boot loader files. 4- /dev - Device files. 5- /etc - Core system configuration directory, should hold only configuration files and not any binaries. 6- /home - Personal directories for users, holds your documents, files, settings, etc. 7- /lib - Holds library files that binaries can use. 8- /media - Used as an attachment point for removable media like USB drives. 9- /mnt - Temporarily mounted filesystems. 10- /opt - Optional application software packages. 11- /proc - Information about currently running processes. 12- /root - The root user\'s home directory. 13- /run - Information about the running system since the last boot. 14- /sbin - Contains essential system binaries, usually can only be ran by root. 15- /srv - Site-specific data which are served by the system. 16- /tmp - Storage for temporary files',
      '17- /usr - This is unfortunately named, most often it does not contain user files in the sense of a home folder. This is meant for user installed software and utilities, however that is not to say you can\'t add personal directories in there. Inside this directory are sub-directories for /usr/bin, /usr/local, etc.',
      '18- /var - Variable directory, it\'s used for system logging, user tracking, caches, etc. Basically anything that is subject to change all the time.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘FileSystem Hierarchy’ cover?',
        'FileSystem Hierarchy',
        ['FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk', 'Disk Partitioning'],
        'This lesson is ‘FileSystem Hierarchy’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ls -l',
        ['ls', '-l'],
        ['ls', '-l', 'sudo', '-la'],
        'Type it exactly as shown: ls -l. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “At this point, you\'re probably well familiar with the directory structure of your system, if not you will be soon. Filesystems can vary with how they are struc…” — which lesson is this?',
        'FileSystem Hierarchy',
        ['FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk', 'Disk Partitioning'],
        'Those opening lines are from ‘FileSystem Hierarchy’.'
      ),
      MCQ(
        'The lesson continues with: “Go ahead and do an "ls -l" to see the directories listed under the root directory, yours may look different than mine, but the directories should for the most…” — which lesson is this?',
        'FileSystem Hierarchy',
        ['FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk', 'Disk Partitioning'],
        'Those lines are from ‘FileSystem Hierarchy’.'
      ),
    ],
  },
  'linux-the-filesystem-2': {
    id: 'linux-the-filesystem-2',
    title: 'FileSystem Types',
    theory: [
      'There are many different filesystem implementations available. Some are faster than others, some support larger capacity storage and others only work on smaller capacity storage. Different filesystems have different ways of organizing their data and we\'ll go into detail about what types of filesystems there are. Since there are so many different implementations available, applications need a way to deal with the different operations.',
      'So there is something called the Virtual File System (VFS) abstraction layer. It is a layer between applications and the different filesystem types, so no matter what filesystem you have, your applications will be able to work with it.',
      'You can have many filesystem on your disks, depending on how they are partitioned and we will go through that in a coming lesson.',
      'Journaling: Journaling comes by default on most filesystem types, but just in case it doesn\'t, you should know what it does. Let\'s say you\'re copying a large file and all of a sudden you lose power.',
      'Well if you are on a non-journaled filesystem, the file would end up corrupted and your filesystem would be inconsistent and then when you boot back up, your system would perform a filesystem check to make sure everything is ok. However, the repairs could take awhile depending on how large your filesystem was.',
      'Now if you were on a journaled system, before your machine even begins to copy the file, it will write what you\'re going to be doing in a log file (journal). Now when you actually copy the file, once it completes, the journal marks that task as complete. The filesystem is always in a consistent state because of this, so it will know exactly where you left off if your machine shutdown suddenly. This also decreases the boot time because instead of checking the entire filesystem it just looks at your journal.',
      'Common Desktop Filesystem Types: 1- ext4 - This is the most current version of the native Linux filesystems. It is compatible with the older ext2 and ext3 versions. It supports disk volumes up to 1 exabyte and file sizes up to 16 terabytes and much more. It is the standard choice for Linux filesystems.',
      '2- Btrfs - "Better or Butter FS" it is a new filesystem for Linux that comes with snapshots, incremental backups, performance increase and much more. It is widely available, but not quite stable and compatible yet.',
      '3- XFS - High performance journaling file system, great for a system with large files such as a media server.',
      '4- NTFS and FAT - Windows filesystems',
      '5- HFS+ - Macintosh filesystem',
      'Check out what filesystems are on your machine: "df -T" Filesystem Type 1K-blocks Used Available Use% Mounted on /dev/sda1 ext4 6461592 2402708 3707604 40% / udev devtmpfs 501356 4 501352 1% /dev tmpfs tmpfs 102544 1068 101476 2% /run /dev/sda6 xfs 13752320 460112 13292208 4% /home',
      'The "df" command reports file system disk space usage and other details about your disk, we will talk more about this tool later.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘FileSystem Types’ cover?',
        'FileSystem Types',
        ['FileSystem Types', 'FileSystem Hierarchy', 'Anatomy Of A Disk', 'Disk Partitioning'],
        'This lesson is ‘FileSystem Types’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: df -T',
        ['df', '-T'],
        ['df', '-T', 'sudo', '-la'],
        'Type it exactly as shown: df -T. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “There are many different filesystem implementations available. Some are faster than others, some support larger capacity storage and others only work on smalle…” — which lesson is this?',
        'FileSystem Types',
        ['FileSystem Types', 'FileSystem Hierarchy', 'Anatomy Of A Disk', 'Disk Partitioning'],
        'Those opening lines are from ‘FileSystem Types’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘FileSystem Types’ lesson?',
        'df',
        ['df', 'core', 'echo Hello World', 'pwd'],
        'The ‘FileSystem Types’ lesson mentions “df” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “So there is something called the Virtual File System (VFS) abstraction layer. It is a layer between applications and the different filesystem types, so no matt…” — which lesson is this?',
        'FileSystem Types',
        ['FileSystem Types', 'FileSystem Hierarchy', 'Anatomy Of A Disk', 'Disk Partitioning'],
        'Those lines are from ‘FileSystem Types’.'
      ),
    ],
  },
  'linux-the-filesystem-3': {
    id: 'linux-the-filesystem-3',
    title: 'Anatomy Of A Disk',
    theory: [
      'Hard disks can be subdivided into partitions, essentially making multiple block devices. Recall such examples as, /dev/sda1 and /dev/sda2, /dev/sda is the whole disk, but /dev/sda1 is the first partition on that disk. Partitions are extremely useful for separating data and if you need a certain filesystem, you can easily create a partition instead of making the entire disk one filesystem type.',
      'Partition Table: Every disk will have a partition table, this table tells the system how the disk is partitioned. This table tells you where partitions begin and end, which partitions are bootable, what sectors of the disk are allocated to what partition,etc. There are two main partition table schemes used, Master Boot Record (MBR) and GUID Partition Table (GPT).',
      'Partition: Disks are comprised of partitions that help us organize our data. You can have multiple partitions on a disk and they can\'t overlap each other. If there is space that is not allocated to a partition, then it is known as free space. The types of partitions depend on your partition table. Inside a partition, you can have a filesystem or dedicate a partition to other things like swap (we\'ll get to that soon).',
      'MBR: 1- Traditional partition table, was used as the standard 2- Can have primary, extended, and logical partitions 3- MBR has a limit of four primary partitions 4- Additional partitions can be made by making a primary partition into an extended partition (there can only be one extended partition on a disk). Then inside the extended partition you add logical partitions. The logical partitions are used just like any other partition. Silly I know. 5- Supports disks up to 2 terabytes',
      'GPT: 1- GUID Partition Table (GPT) is becoming the new standard for disk partitioning 2- Has only one type of partition and you can make many of them 3- Each partition has a globally unique ID (GUID) 4- Used mostly in conjunction with UEFI based booting (we\'ll get into details in another course)',
      'Filesystem Structure: We know from our previous lesson that a filesystem is an organized collection of files and directories. In its simplest form, it is comprised of a database to manage files and the actual files themselves, however we\'re going to go into a little more detail.',
      '1- Boot block - This is located in the first few sectors of the filesystem, and it\'s not really used the by the filesystem. Rather, it contains information used to boot the operating system. Only one boot block is needed by the operating system. If you have multiple partitions, they will have boot blocks, but many of them are unused. 2- Super block - This is a single block that comes after the boot block, and it contains information about the filesystem, such as the size of the inode table, size of the logical blocks and the size of the filesystem. 3- Inode table - Think of this as the database that manages our files (we have a whole lesson on inodes, so don\'t worry). Each file or directory has a unique entry in the inode table and it has various information about the file. 4- Data blocks - This is the actual data for the files and directories.',
      'Let\'s take a look at the different partition tables. Below is an example of a partition using the MBR partitioning table (msdos). You can see the primary, extended and logical partitions on the machine: "sudo parted -l" Model: Seagate (scsi) Disk /dev/sda: 21.5GB Sector size (logical/physical): 512B/512B Partition Table: msdos',
      'Number Start End Size Type File system Flags 1 1049kB 6860MB 6859MB primary ext4 boot 2 6861MB 21.5GB 14.6GB extended 5 6861MB 7380MB 519MB logical linux-swap(v1) 6 7381MB 21.5GB 14.1GB logical xfs',
      'This example is GPT, using just a unique ID for the partitions.',
      'Model: Thumb Drive (scsi) Disk /dev/sdb: 4041MB Sector size (logical/physical): 512B/512B Partition Table: gpt',
      'Number Start End Size File system Name Flags 1 17.4kB 1000MB 1000MB first 2 1000MB 4040MB 3040MB second',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Anatomy Of A Disk’ cover?',
        'Anatomy Of A Disk',
        ['Anatomy Of A Disk', 'FileSystem Hierarchy', 'FileSystem Types', 'Disk Partitioning'],
        'This lesson is ‘Anatomy Of A Disk’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo parted -l',
        ['sudo', 'parted', '-l'],
        ['sudo', 'parted', '-l', '-la', '-r'],
        'Type it exactly as shown: sudo parted -l. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Hard disks can be subdivided into partitions, essentially making multiple block devices. Recall such examples as, /dev/sda1 and /dev/sda2, /dev/sda is the whol…” — which lesson is this?',
        'Anatomy Of A Disk',
        ['Anatomy Of A Disk', 'FileSystem Hierarchy', 'FileSystem Types', 'Disk Partitioning'],
        'Those opening lines are from ‘Anatomy Of A Disk’.'
      ),
      MCQ(
        'The lesson continues with: “Partition Table: Every disk will have a partition table, this table tells the system how the disk is partitioned. This table tells you where partitions begin a…” — which lesson is this?',
        'Anatomy Of A Disk',
        ['Anatomy Of A Disk', 'FileSystem Hierarchy', 'FileSystem Types', 'Disk Partitioning'],
        'Those lines are from ‘Anatomy Of A Disk’.'
      ),
    ],
  },
  'linux-the-filesystem-4': {
    id: 'linux-the-filesystem-4',
    title: 'Disk Partitioning',
    theory: [
      'Let\'s do some practical stuff with filesytems by working through the process on a USB drive. If you don\'t have one, no worries, you can still follow along these next couple of lessons.',
      'First we\'ll need to partition our disk. There are many tools available to do this: 1- fdisk - basic command-line partitioning tool, it does not support GPT 2- parted - this is a command line tool that supports both MBR and GPT partitioning 3- gparted - this is the GUI version of parted 4- gdisk - fdisk, but it does not support MBR only GPT',
      'Let\'s use parted to do our partitioning. Let\'s say I connect the USB device and we see the device name is /dev/sdb2. Launch parted: "sudo parted" You\'ll be entered in the parted tool, here you can run commands to partition your device.',
      'Select the device: "select /dev/sdb2" To select the device you\'ll be working with, select it by its device name.',
      'View current partition table: (parted) print Model: Seagate (scsi) Disk /dev/sda: 21.5GB Sector size (logical/physical): 512B/512B Partition Table: msdos',
      'Number Start End Size Type File system Flags 1 1049kB 6860MB 6859MB primary ext4 boot 2 6861MB 21.5GB 14.6GB extended 5 6861MB 7380MB 519MB logical linux-swap(v1) 6 7381MB 21.5GB 14.1GB logical xfs',
      'Here you will see the available partitions on the device. The "start" and "end" points are where the partitions take up space on the hard drive, you\'ll want to find a good start and end location for your partitions.',
      'Partition the device: "mkpart primary 123 4567" Now just choose a start and end point and make the partition, you\'ll need to specify the type of partition depending on what table you used.',
      'Resize a partition: You can also resize a partition if you don\'t have any space: "resize 2 1245 3456" Select the partition number and then the start and end points of where you want to resize it to.',
      'Parted is a very powerful tool and you should be careful when partitioning your disks.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Disk Partitioning’ cover?',
        'Disk Partitioning',
        ['Disk Partitioning', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'This lesson is ‘Disk Partitioning’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo parted',
        ['sudo', 'parted'],
        ['sudo', 'parted', '-la', '-r'],
        'Type it exactly as shown: sudo parted. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Let\'s do some practical stuff with filesytems by working through the process on a USB drive. If you don\'t have one, no worries, you can still follow along thes…” — which lesson is this?',
        'Disk Partitioning',
        ['Disk Partitioning', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'Those opening lines are from ‘Disk Partitioning’.'
      ),
      BUILD(
        'Assemble another command from this lesson: select /dev/sdb2',
        ['select', '/dev/sdb2'],
        ['select', '/dev/sdb2', 'sudo', '-la'],
        'Type it exactly as shown: select /dev/sdb2.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Disk Partitioning’ lesson?',
        'mkpart primary 123 4567',
        ['mkpart primary 123 4567', 'core', 'echo Hello World', 'pwd'],
        'The ‘Disk Partitioning’ lesson mentions “mkpart primary 123 4567” — find it in the theory above.'
      ),
    ],
  },
  'linux-the-filesystem-5': {
    id: 'linux-the-filesystem-5',
    title: 'Creating FileSystems',
    theory: [
      'Now that you\'ve actually partitioned a disk, let\'s create a filesystem! "sudo mkfs -t ext4 /dev/sdb2"',
      'Simple as that! The "mkfs" (make filesystem) tool allows us to specify the type of filesystem we want and where we want it.',
      'You\'ll only want to create a filesystem on a newly partitioned disk or if you are repartitioning an old one. You\'ll most likely leave your filesystem in a CORRUPTED state if you try to create one on top of an existing one.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Creating FileSystems’ cover?',
        'Creating FileSystems',
        ['Creating FileSystems', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'This lesson is ‘Creating FileSystems’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo mkfs -t ext4 /dev/sdb2',
        ['sudo', 'mkfs', '-t', 'ext4', '/dev/sdb2'],
        ['sudo', 'mkfs', '-t', 'ext4', '/dev/sdb2', '-la', '-r'],
        'Type it exactly as shown: sudo mkfs -t ext4 /dev/sdb2. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Now that you\'ve actually partitioned a disk, let\'s create a filesystem! "sudo mkfs -t ext4 /dev/sdb2"” — which lesson is this?',
        'Creating FileSystems',
        ['Creating FileSystems', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'Those opening lines are from ‘Creating FileSystems’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Creating FileSystems’ lesson?',
        'mkfs',
        ['mkfs', 'core', 'echo Hello World', 'pwd'],
        'The ‘Creating FileSystems’ lesson mentions “mkfs” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “Simple as that! The "mkfs" (make filesystem) tool allows us to specify the type of filesystem we want and where we want it.” — which lesson is this?',
        'Creating FileSystems',
        ['Creating FileSystems', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'Those lines are from ‘Creating FileSystems’.'
      ),
    ],
  },
  'linux-the-filesystem-6': {
    id: 'linux-the-filesystem-6',
    title: 'Mounting/Unmounting',
    theory: [
      'Before you can view the contents of your filesystem, you will have to mount it.',
      'To do that I\'ll need the device location, the filesystem type and a mount point, the mount point is a directory on the system where the filesystem is going to be attached. So we basically want to mount our device to a mount point.',
      'First create the mount point, in our case "mkdir /mydrive" "sudo mount -t ext4 /dev/sdb2 /mydrive"',
      'Simple as that! Now when we go to /mydrive we can see our filesystem contents, the "-t" specifies the type of filesystem, then we have the device location, then the mount point.',
      'To unmount a device from a mount point: "sudo umount /mydrive" or "sudo umount /dev/sdb2"',
      'Remember that the kernel names devices in the order it finds them. What if our device name changes for some reason after we mount it? Well fortunately, you can use a device\'s universally unique ID (UUID) instead of a name.',
      'To view the UUIDS on your system for block devices: "sudo blkid" /dev/sda1: UUID="130b882f-7d79-436d-a096-1e594c92bb76" TYPE="ext4" /dev/sda5: UUID="22c3d34b-467e-467c-b44d-f03803c2c526" TYPE="swap" /dev/sda6: UUID="78d203a0-7c18-49bd-9e07-54f44cdb5726" TYPE="xfs"',
      'We can see our device names, their corresponding filesystem types and their UUIDs. Now when we want to mount something, we can use: "sudo mount UUID=130b882f-7d79-436d-a096-1e594c92bb76 /mydrive"',
      'Most of the time you won\'t need to mount devices via their UUIDs, it\'s much easier to use the device name and often times the operating system will know to mount common devices like USB drives.',
      'If you need to automatically mount a filesystem at startup though like if you added a secondary hard drive, you\'ll want to use the UUID and we\'ll go over that in the next lesson.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Mounting/Unmounting’ cover?',
        'Mounting/Unmounting',
        ['Mounting/Unmounting', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'This lesson is ‘Mounting/Unmounting’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: mkdir /mydrive',
        ['mkdir', '/mydrive'],
        ['mkdir', '/mydrive', 'sudo', '-la'],
        'Type it exactly as shown: mkdir /mydrive. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Before you can view the contents of your filesystem, you will have to mount it.” — which lesson is this?',
        'Mounting/Unmounting',
        ['Mounting/Unmounting', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'Those opening lines are from ‘Mounting/Unmounting’.'
      ),
      BUILD(
        'Assemble another command from this lesson: sudo umount /mydrive',
        ['sudo', 'umount', '/mydrive'],
        ['sudo', 'umount', '/mydrive', '-la', '-r'],
        'Type it exactly as shown: sudo umount /mydrive.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Mounting/Unmounting’ lesson?',
        'sudo mount -t ext4 /dev/sdb2 /mydrive',
        ['sudo mount -t ext4 /dev/sdb2 /mydrive', 'core', 'echo Hello World', 'pwd'],
        'The ‘Mounting/Unmounting’ lesson mentions “sudo mount -t ext4 /dev/sdb2 /mydrive” — find it in the theory above.'
      ),
    ],
  },
  'linux-the-filesystem-7': {
    id: 'linux-the-filesystem-7',
    title: 'Etc/fstab',
    theory: [
      'When we want to automatically mount filesystems at startup we can add them to a file called /etc/fstab (pronounced "eff es tab" not "eff stab") short for filesystem table. This file contains a permanent list of filesystems that are mounted.',
      '"cat /etc/fstab" UUID=130b882f-7d79-436d-a096-1e594c92bb76 / ext4 relatime,errors=remount-ro 0 1 UUID=78d203a0-7c18-49bd-9e07-54f44cdb5726 /home xfs relatime 0 2 UUID=22c3d34b-467e-467c-b44d-f03803c2c526 none swap sw 0 0',
      'Each line represents one filesystem, the fields are:',
      '1- UUID - Device identifier 2- Mount point - Directory the filesystem is mounted to 3- Filesystem type 4- Options - other mount options, see manpage for more details 5- Dump - used by the dump utility to decide when to make a backup, you should just default to 0 6- Pass - Used by fsck to decide what order filesystems should be checked, if the value is 0, it will not be checked',
      'To add an entry, just directly modify the /etc/fstab file using the entry syntax above. Be careful when modifying this file, you could potentially make your life a little harder if you mess up.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Etc/fstab’ cover?',
        'Etc/fstab',
        ['Etc/fstab', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'This lesson is ‘Etc/fstab’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: eff es tab',
        ['eff', 'es', 'tab'],
        ['eff', 'es', 'tab', 'sudo', '-la'],
        'Type it exactly as shown: eff es tab. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “When we want to automatically mount filesystems at startup we can add them to a file called /etc/fstab (pronounced "eff es tab" not "eff stab") short for files…” — which lesson is this?',
        'Etc/fstab',
        ['Etc/fstab', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'Those opening lines are from ‘Etc/fstab’.'
      ),
      BUILD(
        'Assemble another command from this lesson: eff stab',
        ['eff', 'stab'],
        ['eff', 'stab', 'sudo', '-la'],
        'Type it exactly as shown: eff stab.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Etc/fstab’ lesson?',
        'cat /etc/fstab',
        ['cat /etc/fstab', 'core', 'echo Hello World', 'pwd'],
        'The ‘Etc/fstab’ lesson mentions “cat /etc/fstab” — find it in the theory above.'
      ),
    ],
  },
  'linux-the-filesystem-8': {
    id: 'linux-the-filesystem-8',
    title: 'Swap Space',
    theory: [
      'In our previous example, I showed you how to see your partition table, let\'s revisit that example, more specifically this line: Number Start End Size Type File system Flags 5 6861MB 7380MB 519MB logical linux-swap(v1)',
      'What is this swap partition? Well swap is what we used to allocate virtual memory to our system. If you are low on memory, the system uses this partition to "swap" pieces of memory of idle processes to the disk, so you\'re not bogged for memory.',
      'Using a partition for swap space: Let\'s say we wanted to set our partition of /dev/sdb2 to be used for swap space.',
      '1- First make sure we don\'t have anything on the partition 2- Run: mkswap /dev/sdb2 to initialize swap areas 3- Run: swapon /dev/sdb2 this will enable the swap device 4- If you want the swap partition to persist on bootup, you need to add an entry to the /etc/fstab file. sw is the filesystem type that you\'ll use. 5- To remove swap: swapoff /dev/sdb2',
      'Generally you should allocate about twice as much swap space as you have memory. But modern systems today are usually pretty powerful enough and have enough RAM as it is.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Swap Space’ cover?',
        'Swap Space',
        ['Swap Space', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'This lesson is ‘Swap Space’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “In our previous example, I showed you how to see your partition table, let\'s revisit that example, more specifically this line: Number Start End Size Type File…” — which lesson is this?',
        'Swap Space',
        ['Swap Space', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'Those opening lines are from ‘Swap Space’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Swap Space’ lesson?',
        'swap',
        ['swap', 'core', 'echo Hello World', 'pwd'],
        'The ‘Swap Space’ lesson mentions “swap” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “What is this swap partition? Well swap is what we used to allocate virtual memory to our system. If you are low on memory, the system uses this partition to "s…” — which lesson is this?',
        'Swap Space',
        ['Swap Space', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'Those lines are from ‘Swap Space’.'
      ),
    ],
  },
  'linux-the-filesystem-9': {
    id: 'linux-the-filesystem-9',
    title: 'Disk Usage',
    theory: [
      'There are a few tools you can used to see the utilization of your disks: "df -h" Filesystem 1K-blocks Used Available Use% Mounted on /dev/sda1 6.2G 2.3G 3.6G 40% /',
      'The df command shows you the utilization of your currently mounted filesystems. The -h flag gives you a human readable format. You can see what the device is, and how much capacity is used and available.',
      'Let\'s say your disk is getting full and you want to know what files or directories are taking up that space, for that you can use the "du" command.',
      '"du -h"',
      'This shows you the disk usage of the current directory you are in, you can take a peek at the root directory with "du -h /" but that can get a little cluttered.',
      'Both of these commands are so similar in syntax it can be hard to remember which one to use: to check how much of your disk is FREE use df. To check disk USAGE, use du.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Disk Usage’ cover?',
        'Disk Usage',
        ['Disk Usage', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'This lesson is ‘Disk Usage’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: df -h',
        ['df', '-h'],
        ['df', '-h', 'sudo', '-la'],
        'Type it exactly as shown: df -h. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “There are a few tools you can used to see the utilization of your disks: "df -h" Filesystem 1K-blocks Used Available Use% Mounted on /dev/sda1 6.2G 2.3G 3.6G 4…” — which lesson is this?',
        'Disk Usage',
        ['Disk Usage', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'Those opening lines are from ‘Disk Usage’.'
      ),
      BUILD(
        'Assemble another command from this lesson: du -h',
        ['du', '-h'],
        ['du', '-h', 'sudo', '-la'],
        'Type it exactly as shown: du -h.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Disk Usage’ lesson?',
        'du -h /',
        ['du -h /', 'core', 'echo Hello World', 'pwd'],
        'The ‘Disk Usage’ lesson mentions “du -h /” — find it in the theory above.'
      ),
    ],
  },
  'linux-the-filesystem-10': {
    id: 'linux-the-filesystem-10',
    title: 'FileSystem Repair',
    theory: [
      'Sometimes our filesystem isn\'t always in the best condition, if we have a sudden shutdown, our data can become corrupt. It\'s up to the system to try to get us back in a working state (although we sure can try ourselves).',
      'The "fsck" (filesystem check) command is used to check the consistency of a filesystem and can even try to repair it for us. Usually when you boot up a disk, fsck will run before your disk is mounted to make sure everything is ok.',
      'Sometimes though, your disk is so bad that you\'ll need to manually do this. HOWEVER, BE SURE TO DO THIS WHILE YOU ARE IN A RESCUE DISK OR SOMEWHERE WHERE YOU CAN ACCESS YOUR FILESYSTEM WITHOUT IT BEING MOUNTED.',
      '"sudo fsck /dev/sda"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘FileSystem Repair’ cover?',
        'FileSystem Repair',
        ['FileSystem Repair', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'This lesson is ‘FileSystem Repair’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo fsck /dev/sda',
        ['sudo', 'fsck', '/dev/sda'],
        ['sudo', 'fsck', '/dev/sda', '-la', '-r'],
        'Type it exactly as shown: sudo fsck /dev/sda. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Sometimes our filesystem isn\'t always in the best condition, if we have a sudden shutdown, our data can become corrupt. It\'s up to the system to try to get us…” — which lesson is this?',
        'FileSystem Repair',
        ['FileSystem Repair', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'Those opening lines are from ‘FileSystem Repair’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘FileSystem Repair’ lesson?',
        'fsck',
        ['fsck', 'core', 'echo Hello World', 'pwd'],
        'The ‘FileSystem Repair’ lesson mentions “fsck” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “The "fsck" (filesystem check) command is used to check the consistency of a filesystem and can even try to repair it for us. Usually when you boot up a disk, f…” — which lesson is this?',
        'FileSystem Repair',
        ['FileSystem Repair', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'Those lines are from ‘FileSystem Repair’.'
      ),
    ],
  },
  'linux-the-filesystem-11': {
    id: 'linux-the-filesystem-11',
    title: 'Inodes',
    theory: [
      'Remember how our filesystem is comprised of all our actual files and a database that manages these files? The database is known as the inode table.',
      'What is an inode?: An inode (index node) is an entry in this table and there is one for every file. It describes everything about the file, such as:',
      '1- File type - regular file, directory, character device, etc 2- Owner 3- Group 4- Access permissions 5- Timestamps - mtime (time of last file modification), ctime (time of last attribute change), atime (time of last access) 6- Number of hardlinks to the file 7- Size of the file 8- Number of blocks allocated to the file 9- Pointers to the data blocks of the file - most important!',
      'Basically inodes store everything about the file, except the filename and the file itself!',
      'When are inodes created?: When a filesystem is created, space for inodes is allocated as well. There are algorithms that take place to determine how much inode space you need depending on the volume of the disk and more. You\'ve probably at some point in your life seen errors for out of disk space issues. Well the same can occur for inodes as well (although less common), you can run out of inodes and therefore be unable to create more files. Remember data storage depends on both the data and the database (inodes).',
      'To see how many inodes are left on your system, use the command "df -i"',
      'Inode information: Inodes are identified by numbers, when a file gets created it is assigned an inode number, the number is assigned in sequential order. However, you may sometimes notice when you create a new file, it gets an inode number that is lower than others, this is because once inodes are deleted, they can be reused by other files.',
      'To view inode numbers run "ls -li": "ls -li" 140 drwxr-xr-x 2 pete pete 6 Jan 20 20:13 Desktop 141 drwxr-xr-x 2 pete pete 6 Jan 20 20:01 Documents',
      'The first field in this command lists the inode number.',
      'You can also see detailed information about a file with stat, it tells you information about the inode as well: "stat ~/Desktop/" File: ‘/home/pete/Desktop/’ Size: 6 Blocks: 0 IO Block: 4096 directory Device: 806h/2054d Inode: 140 Links: 2 Access: (0755/drwxr-xr-x) Uid: ( 1000/ pete) Gid: ( 1000/ pete) Access: 2016-01-20 20:13:50.647435982 -0800 Modify: 2016-01-20 20:13:06.191675843 -0800 Change: 2016-01-20 20:13:06.191675843 -0800 Birth: -',
      'How do inodes locate files?: We know our data is out there on the disk somewhere, unfortunately it probably wasn\'t stored sequentially, so we have to use inodes. Inodes point to the actual data blocks of your files. In a typical filesystem (not all work the same), each inode contains 15 pointers, the first 12 pointers point directly to the data blocks. The 13th pointer, points to a block containing pointers to more blocks, the 14th pointer points to another nested block of pointers, and the 15th pointer points yet again to another block of pointers! Confusing, I know! The reason this is done this way is to keep the inode structure the same for every inode, but be able to reference files of different sizes. If you had a small file, you could find it quicker with the first 12 direct pointers, larger files can be found with the nests of pointers. Either way the structure of the inode is the same.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Inodes’ cover?',
        'Inodes',
        ['Inodes', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'This lesson is ‘Inodes’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: df -i',
        ['df', '-i'],
        ['df', '-i', 'sudo', '-la'],
        'Type it exactly as shown: df -i. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Remember how our filesystem is comprised of all our actual files and a database that manages these files? The database is known as the inode table.” — which lesson is this?',
        'Inodes',
        ['Inodes', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'Those opening lines are from ‘Inodes’.'
      ),
      BUILD(
        'Assemble another command from this lesson: ls -li',
        ['ls', '-li'],
        ['ls', '-li', 'sudo', '-la'],
        'Type it exactly as shown: ls -li.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Inodes’ lesson?',
        'stat ~/Desktop/',
        ['stat ~/Desktop/', 'core', 'echo Hello World', 'pwd'],
        'The ‘Inodes’ lesson mentions “stat ~/Desktop/” — find it in the theory above.'
      ),
    ],
  },
  'linux-the-filesystem-12': {
    id: 'linux-the-filesystem-12',
    title: 'Symlinks',
    theory: [
      'Let\'s use a previous example of inode information: "ls -li" 140 drwxr-xr-x 2 pete pete 6 Jan 20 20:13 Desktop 141 drwxr-xr-x 2 pete pete 6 Jan 20 20:01 Documents',
      'You may have noticed that we\'ve been glossing over the third field in the ls command, that field is the link count. The link count is the total number of hard links a file has, well that doesn\'t mean anything to you right now. So let\'s discuss links first.',
      'Symlinks: In the Windows operating system, there are things known as shortcuts, shortcuts are just aliases to other files. If you do something to the original file, you could potentially break the shortcut. In Linux, the equivalent of shortcuts are symbolic links (or soft links or symlinks). Symlinks allow us to link to another file by its filename.',
      'Another type of links found in Linux are "Hardlinks" (we will take a look at them on the next lesson), these are actually another file with a link to an inode.',
      'Let\'s see what I mean in practice starting with symlinks.',
      '"echo \'myfile\' > myfile" "echo \'myfile2\' > myfile2" "echo \'myfile3\' > myfile3"',
      '"ln -s myfile myfilelink" "ls -li" total 12 151 -rw-rw-r-- 1 pete pete 7 Jan 21 21:36 myfile 93401 -rw-rw-r-- 1 pete pete 8 Jan 21 21:36 myfile2 93402 -rw-rw-r-- 1 pete pete 8 Jan 21 21:36 myfile3 93403 lrwxrwxrwx 1 pete pete 6 Jan 21 21:39 myfilelink -> myfile',
      'You can see that I\'ve made a symbolic link named myfilelink that points to myfile. Symbolic links are denoted by ->. Notice how I got a new inode number though, symlinks are just files that point to filenames.',
      'When you modify a symlink, the file also gets modified. Inode numbers are unique to filesystems, you can\'t have two of the same inode number in a single filesystem, meaning you can\'t reference a file in a different filesystem by its inode number. However, if you use symlinks they do not use inode numbers, they use filenames, so they can be referenced across different filesystems.',
      'Creating a symlink: "ln -s myfile mylink" To create a symbolic link, you use the ln command with -s for symbolic and you specific a target file and then a link name.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Symlinks’ cover?',
        'Symlinks',
        ['Symlinks', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'This lesson is ‘Symlinks’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ls -li',
        ['ls', '-li'],
        ['ls', '-li', 'sudo', '-la'],
        'Type it exactly as shown: ls -li. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Let\'s use a previous example of inode information: "ls -li" 140 drwxr-xr-x 2 pete pete 6 Jan 20 20:13 Desktop 141 drwxr-xr-x 2 pete pete 6 Jan 20 20:01 Documen…” — which lesson is this?',
        'Symlinks',
        ['Symlinks', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'Those opening lines are from ‘Symlinks’.'
      ),
      BUILD(
        'Assemble another command from this lesson: echo \'myfile\' > myfile',
        ['echo', '\'myfile\'', '>', 'myfile'],
        ['echo', '\'myfile\'', '>', 'myfile', 'sudo', '-la'],
        'Type it exactly as shown: echo \'myfile\' > myfile.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Symlinks’ lesson?',
        'echo \'myfile2\' > myfile2',
        ['echo \'myfile2\' > myfile2', 'core', 'echo Hello World', 'pwd'],
        'The ‘Symlinks’ lesson mentions “echo \'myfile2\' > myfile2” — find it in the theory above.'
      ),
    ],
  },
  'linux-the-filesystem-13': {
    id: 'linux-the-filesystem-13',
    title: 'Hardlinks',
    theory: [
      'Hardlinks: Hardlinks are actually another file with a link to an inode.',
      'Let\'s see an example of a hardlink:',
      '"ln myfile2 myhardlink" "ls -li" total 16 151 -rw-rw-r-- 1 pete pete 7 Jan 21 21:36 myfile 93401 -rw-rw-r-- 2 pete pete 8 Jan 21 21:36 myfile2 93402 -rw-rw-r-- 1 pete pete 8 Jan 21 21:36 myfile3 93403 lrwxrwxrwx 1 pete pete 6 Jan 21 21:39 myfilelink -> myfile 93401 -rw-rw-r-- 2 pete pete 8 Jan 21 21:36 myhardlink',
      'A hardlink just creates another file with a link to the same inode. So if I modified the contents of myfile2 or myhardlink, the change would be seen on both, but if I deleted myfile2, the file would still be accessible through myhardlink.',
      'Here is where our link count in the ls command comes into play. The link count is the number of hardlinks that an inode has, when you remove a file, it will decrease that link count.',
      'The inode only gets deleted when all hardlinks to the inode have been deleted. When you create a file, it\'s link count is 1 because it is the only file that is pointing to that inode. Unlike symlinks, hardlinks do not span filesystems because inodes are unique to the filesystem.',
      'Creating a hardlink: "ln somefile somelink"',
      'Similar to a symlink creation, except this time you leave out the -s.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Hardlinks’ cover?',
        'Hardlinks',
        ['Hardlinks', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'This lesson is ‘Hardlinks’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ln myfile2 myhardlink',
        ['ln', 'myfile2', 'myhardlink'],
        ['ln', 'myfile2', 'myhardlink', 'sudo', '-la'],
        'Type it exactly as shown: ln myfile2 myhardlink. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Hardlinks: Hardlinks are actually another file with a link to an inode.” — which lesson is this?',
        'Hardlinks',
        ['Hardlinks', 'FileSystem Hierarchy', 'FileSystem Types', 'Anatomy Of A Disk'],
        'Those opening lines are from ‘Hardlinks’.'
      ),
      BUILD(
        'Assemble another command from this lesson: ls -li',
        ['ls', '-li'],
        ['ls', '-li', 'sudo', '-la'],
        'Type it exactly as shown: ls -li.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Hardlinks’ lesson?',
        'ln somefile somelink',
        ['ln somefile somelink', 'core', 'echo Hello World', 'pwd'],
        'The ‘Hardlinks’ lesson mentions “ln somefile somelink” — find it in the theory above.'
      ),
    ],
  },
  'linux-boot-the-system-1': {
    id: 'linux-boot-the-system-1',
    title: 'Boot Process Overview',
    theory: [
      'Now that we\'ve gotten a pretty good grasp at some of the important components of Linux, let\'s piece them altogether by learning about how the system boots. When you turn on your machine, it does some neat things like show you the logo screen, run through some different messages and then at the end you\'re prompted with a login window.',
      'Well there is actually a ton of stuff happening between when you push the power button to when you login and we\'ll discuss those in this course.',
      'The Linux boot process can be broken down in 4 simple stages: 1- BIOS: The BIOS (stands for "Basic Input/Output System") initializes the hardware and makes sure with a Power-on self test (POST) that all the hardware is good to go. The main job of the BIOS is to load up the bootloader.',
      '2- Bootloader: The bootloader loads the kernel into memory and then starts the kernel with a set of kernel parameters. One of the most common bootloaders is GRUB, which is a universal Linux standard.',
      '3- Kernel: When the kernel is loaded, it immediately initializes devices and memory. The main job of the kernel is to load up the init process.',
      '4- Init: Remember the init process is the first process that gets started, init starts and stops essential service process on the system. There are three major implementations of init in Linux distributions. We will go over them briefly and then dive into them in another course.',
      'There it is, the (very) simple explanation of the Linux boot process. We will go into more detail about these stages in the next lessons.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Boot Process Overview’ cover?',
        'Boot Process Overview',
        ['Boot Process Overview', 'Boot Process Bios', 'Boot Process Bootloader', 'Boot Process Kernel'],
        'This lesson is ‘Boot Process Overview’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Now that we\'ve gotten a pretty good grasp at some of the important components of Linux, let\'s piece them altogether by learning about how the system boots. Whe…” — which lesson is this?',
        'Boot Process Overview',
        ['Boot Process Overview', 'Boot Process Bios', 'Boot Process Bootloader', 'Boot Process Kernel'],
        'Those opening lines are from ‘Boot Process Overview’.'
      ),
      MCQ(
        'The lesson continues with: “Well there is actually a ton of stuff happening between when you push the power button to when you login and we\'ll discuss those in this course.” — which lesson is this?',
        'Boot Process Overview',
        ['Boot Process Overview', 'Boot Process Bios', 'Boot Process Bootloader', 'Boot Process Kernel'],
        'Those lines are from ‘Boot Process Overview’.'
      ),
    ],
  },
  'linux-boot-the-system-2': {
    id: 'linux-boot-the-system-2',
    title: 'Boot Process Bios',
    theory: [
      'BIOS: The first step in the Linux boot process is the BIOS which performs system integrity checks. The BIOS is a firmware that comes most common in IBM PC compatible computers, the dominant type of computers out there today.',
      'You\'ve probably used the BIOS firmware to change the boot order of your harddisks, check system time, your machine\'s mac address, etc. The BIOS\'s main goal is to find the system bootloader.',
      'So once the BIOS boots up the hard drive, it searches for the boot block to figure out how to boot up the system. Depending on how you partition your disk, it will look to the master boot record (MBR) or GPT.',
      'The MBR is located in the first sector of the hard drive, the first 512 bytes. The MBR contains the code to load another program somewhere on the disk, this program in turn actually loads up our bootloader.',
      'Now if you partitioned your disk with GPT, the location of the bootloader changes a bit.',
      'UEFI: There is another way to boot up your system instead of using BIOS and that is with UEFI (stands for "Unified extensible firmware interface"). UEFI was designed to be successor to BIOS, most hardware out there today comes with UEFI firmware built in. Macintosh machines have been using EFI booting for years now and Windows has mostly moved all of their stuff over to UEFI booting. The GPT format was intended for use with EFI. You don\'t necessarily need EFI if you are booting a GPT disk.',
      'The first sector of a GPT disk is reserved for a "protective MBR" to make it possible to boot a BIOS-based machine.',
      'UEFI stores all the information about startup in an .efi file. This file is stored on a special partition called EFI system partition on the hardware. Inside this partition it will contain the bootloader.',
      'UEFI comes with many improvements from the traditional BIOS firmware. However, since we are using Linux, the majority of us are using BIOS. So all of these lessons will be going along with that pretense.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Boot Process Bios’ cover?',
        'Boot Process Bios',
        ['Boot Process Bios', 'Boot Process Overview', 'Boot Process Bootloader', 'Boot Process Kernel'],
        'This lesson is ‘Boot Process Bios’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: protective MBR',
        ['protective', 'MBR'],
        ['protective', 'MBR', 'sudo', '-la'],
        'Type it exactly as shown: protective MBR. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “BIOS: The first step in the Linux boot process is the BIOS which performs system integrity checks. The BIOS is a firmware that comes most common in IBM PC comp…” — which lesson is this?',
        'Boot Process Bios',
        ['Boot Process Bios', 'Boot Process Overview', 'Boot Process Bootloader', 'Boot Process Kernel'],
        'Those opening lines are from ‘Boot Process Bios’.'
      ),
      MCQ(
        'The lesson continues with: “You\'ve probably used the BIOS firmware to change the boot order of your harddisks, check system time, your machine\'s mac address, etc. The BIOS\'s main goal is…” — which lesson is this?',
        'Boot Process Bios',
        ['Boot Process Bios', 'Boot Process Overview', 'Boot Process Bootloader', 'Boot Process Kernel'],
        'Those lines are from ‘Boot Process Bios’.'
      ),
    ],
  },
  'linux-boot-the-system-3': {
    id: 'linux-boot-the-system-3',
    title: 'Boot Process Bootloader',
    theory: [
      'The bootloader\'s main responsibilities are:',
      '1- Booting into an operating system, it can also be used to boot to non-Linux operating systems 2- Select a kernel to use 3- Specify kernel parameters',
      'The most common bootloader for Linux is GRUB, you are most likely using it on your system. There are many other bootloaders that you can use such as LILO, efilinux, coreboot, SYSLINUX and more. However, we will just be working with GRUB as our bootloader.',
      'So we know that the bootloader\'s main goal is to load up the kernel, but where does it find the kernel? To find it, we will need to look at our kernel parameters.',
      'The parameters can be found by going into the GRUB menu on startup using the "e" key. If you don\'t have GRUB no worries, we\'ll go through the boot parameters that you will see:',
      '1- initrd - Specifies the location of initial RAM disk (we\'ll talk more about this in the next lesson). 2- BOOT_IMAGE - This is where the kernel image is located',
      '3- root - The location of the root filesystem, the kernel searches inside this location to find init. It is often represented by it\'s UUID or the device name such as /dev/sda1.',
      '4- ro - This parameter is pretty standard, it mounts the fileystem as read-only mode. 5- quiet - This is added so that you don\'t see display messages that are going on in the background during boot. 6- splash - This lets the splash screen be shown.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Boot Process Bootloader’ cover?',
        'Boot Process Bootloader',
        ['Boot Process Bootloader', 'Boot Process Overview', 'Boot Process Bios', 'Boot Process Kernel'],
        'This lesson is ‘Boot Process Bootloader’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “The bootloader\'s main responsibilities are:” — which lesson is this?',
        'Boot Process Bootloader',
        ['Boot Process Bootloader', 'Boot Process Overview', 'Boot Process Bios', 'Boot Process Kernel'],
        'Those opening lines are from ‘Boot Process Bootloader’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Boot Process Bootloader’ lesson?',
        'e',
        ['e', 'echo Hello World', 'pwd', 'cd /home/pete/Pictures'],
        'The ‘Boot Process Bootloader’ lesson mentions “e” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “1- Booting into an operating system, it can also be used to boot to non-Linux operating systems 2- Select a kernel to use 3- Specify kernel parameters” — which lesson is this?',
        'Boot Process Bootloader',
        ['Boot Process Bootloader', 'Boot Process Overview', 'Boot Process Bios', 'Boot Process Kernel'],
        'Those lines are from ‘Boot Process Bootloader’.'
      ),
    ],
  },
  'linux-boot-the-system-4': {
    id: 'linux-boot-the-system-4',
    title: 'Boot Process Kernel',
    theory: [
      'So now that our bootloader has passed on the necessary parameters, let\'s see how it get\'s started:',
      'Initrd vs Initramfs: There is a bit of a chicken and egg problem when we talk about the kernel bootup. The kernel manages our systems hardware, however not all drivers are available to the kernel during bootup.',
      'So we depend on a temporary root filesystem that contains just the essential modules that the kernel needs to get to the rest of the hardware. In older versions of Linux, this job was given to the initrd (initial ram disk). The kernel would mount the initrd, get the necessary bootup drivers, then when it was done loading everything it needed, it would replace the initrd with the actual root filesystem.',
      'These days, we have something called the initramfs, this is a temporary root filesystem that is built into the kernel itself to load all the necessary drivers for the real root filesystem, so no more locating the initrd file.',
      'Mounting the root filesystem: Now the kernel has all the modules it needs to create a root device and mount the root partition. Before you go any further though, the root partition is actually mounted in read-only mode first so that fsck can run safely and check for system integrity.',
      'Afterwards it remounts the root filesystem in read-write mode. Then the kernel locates the init program and executes it.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Boot Process Kernel’ cover?',
        'Boot Process Kernel',
        ['Boot Process Kernel', 'Boot Process Overview', 'Boot Process Bios', 'Boot Process Bootloader'],
        'This lesson is ‘Boot Process Kernel’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “So now that our bootloader has passed on the necessary parameters, let\'s see how it get\'s started:” — which lesson is this?',
        'Boot Process Kernel',
        ['Boot Process Kernel', 'Boot Process Overview', 'Boot Process Bios', 'Boot Process Bootloader'],
        'Those opening lines are from ‘Boot Process Kernel’.'
      ),
      MCQ(
        'The lesson continues with: “Initrd vs Initramfs: There is a bit of a chicken and egg problem when we talk about the kernel bootup. The kernel manages our systems hardware, however not all…” — which lesson is this?',
        'Boot Process Kernel',
        ['Boot Process Kernel', 'Boot Process Overview', 'Boot Process Bios', 'Boot Process Bootloader'],
        'Those lines are from ‘Boot Process Kernel’.'
      ),
    ],
  },
  'linux-boot-the-system-5': {
    id: 'linux-boot-the-system-5',
    title: 'Boot Process Init',
    theory: [
      'We\'ve discussed init in previous lessons and know that it is the first process that gets started, and it starts all the other essential services on our system. But how?',
      'There are actually three major implementations of init in Linux:',
      'System V init (sysv): This is the traditional init system. It sequentially starts and stops processes, based on startup scripts. The state of the machine is denoted by runlevels, each runlevel starts or stops a machine in a different way.',
      'Upstart: This is the init you\'ll find on older Ubuntu installations. Upstart uses the idea of jobs and events and works by starting jobs that performs certain actions in response to events.',
      'Systemd: This is the new standard for init, it is goal oriented. Basically you have a goal that you want to achieve and systemd tries to satisfy the goal\'s dependencies to complete the goal.',
      'We have an entire course on Init systems where we will dive into each of these systems in more detail.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Boot Process Init’ cover?',
        'Boot Process Init',
        ['Boot Process Init', 'Boot Process Overview', 'Boot Process Bios', 'Boot Process Bootloader'],
        'This lesson is ‘Boot Process Init’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “We\'ve discussed init in previous lessons and know that it is the first process that gets started, and it starts all the other essential services on our system.…” — which lesson is this?',
        'Boot Process Init',
        ['Boot Process Init', 'Boot Process Overview', 'Boot Process Bios', 'Boot Process Bootloader'],
        'Those opening lines are from ‘Boot Process Init’.'
      ),
      MCQ(
        'The lesson continues with: “There are actually three major implementations of init in Linux:” — which lesson is this?',
        'Boot Process Init',
        ['Boot Process Init', 'Boot Process Overview', 'Boot Process Bios', 'Boot Process Bootloader'],
        'Those lines are from ‘Boot Process Init’.'
      ),
    ],
  },
  'linux-kernel-1': {
    id: 'linux-kernel-1',
    title: 'Kernel Overview',
    theory: [
      'As you\'ve learned up to this point, the kernel is the core of the operating system. We\'ve talked about the other parts of the operating system but have yet to show how they all work together. The Linux operating system can be organized into 3 different levels of abstraction.',
      '1- The most basic level is hardware, this includes our CPU, memory, hard disks, networking ports, etc. The physical layer that actually computes what our machine is doing.',
      '2- The next level is the kernel, which handles process and memory management, device communication, system calls, sets up our filesystem, etc. The kernel\'s job is to talk to the hardware to make sure it does what we want our processes to do.',
      '3- And the level that you are familiar with is the user space, the user space includes the shell, the programs that you run, the graphics, etc.',
      'In this course, we\'ll be focusing on the kernel and learning its intricacies.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Kernel Overview’ cover?',
        'Kernel Overview',
        ['Kernel Overview', 'Kernel Privelege Levels', 'System Calls', 'Kernel Installation'],
        'This lesson is ‘Kernel Overview’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “As you\'ve learned up to this point, the kernel is the core of the operating system. We\'ve talked about the other parts of the operating system but have yet to…” — which lesson is this?',
        'Kernel Overview',
        ['Kernel Overview', 'Kernel Privelege Levels', 'System Calls', 'Kernel Installation'],
        'Those opening lines are from ‘Kernel Overview’.'
      ),
      MCQ(
        'The lesson continues with: “1- The most basic level is hardware, this includes our CPU, memory, hard disks, networking ports, etc. The physical layer that actually computes what our machi…” — which lesson is this?',
        'Kernel Overview',
        ['Kernel Overview', 'Kernel Privelege Levels', 'System Calls', 'Kernel Installation'],
        'Those lines are from ‘Kernel Overview’.'
      ),
    ],
  },
  'linux-kernel-2': {
    id: 'linux-kernel-2',
    title: 'Kernel Privelege Levels',
    theory: [
      'The next few lessons get pretty theoretical, so if you\'re looking for some practical stuff you can skip ahead and come back later.',
      'Why do we have different abstraction layers for user space and kernel? Why can\'t you combine both powers into one layer? Well there is a very good reason why these two layers exist separately! They both operate in different modes, the kernel operates in "kernel mode" and the user space operates in "user mode".',
      'In kernel mode, the kernel has complete access to the hardware, it controls everything. In user space mode, there is a very small amount of safe memory and CPU that you are allowed to access. Basically, when we want to do anything that involves hardware, reading data from our disks, writing data to our disks, controlling our network, etc, it is all done in kernel mode.',
      'Why is this necessary? Imagine if your machine was infected with spyware, you wouldn\'t want it to be able to have direct access to your system\'s hardware. It can access all your data, your webcam, etc. and that\'s no good!',
      'These different modes are called privilege levels (aptly named for the levels of privilege you get) and are often described as protection rings.',
      'To make this picture easier to paint, let\'s say you find out that Britney Spears is in town at your local klerb, she\'s protected by her groupies, then her personal bodyguards, then the bouncer outside the klerb. You want to get her autograph (because why not?), but you can\'t get to her because she is heavily protected. The rings work the same way, the innermost ring corresponds to the highest privilege level.',
      'There are two main levels or modes in an x86 computer architecture. Ring #3 is the privilege that user mode applications run in, Ring #0 is the privilege that the kernel runs in.',
      'Ring #0 can execute any system instruction and is given full trust.',
      'So now that we know how those privilege levels work, how are we able to write anything to our hardware? Won\'t we always be in a different mode than the kernel?',
      'The answer is with system calls, system calls allow us to perform a privileged instruction in kernel mode and then switch back to user mode.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Kernel Privelege Levels’ cover?',
        'Kernel Privelege Levels',
        ['Kernel Privelege Levels', 'Kernel Overview', 'System Calls', 'Kernel Installation'],
        'This lesson is ‘Kernel Privelege Levels’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: kernel mode',
        ['kernel', 'mode'],
        ['kernel', 'mode', 'sudo', '-la'],
        'Type it exactly as shown: kernel mode. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The next few lessons get pretty theoretical, so if you\'re looking for some practical stuff you can skip ahead and come back later.” — which lesson is this?',
        'Kernel Privelege Levels',
        ['Kernel Privelege Levels', 'Kernel Overview', 'System Calls', 'Kernel Installation'],
        'Those opening lines are from ‘Kernel Privelege Levels’.'
      ),
      BUILD(
        'Assemble another command from this lesson: user mode',
        ['user', 'mode'],
        ['user', 'mode', 'sudo', '-la'],
        'Type it exactly as shown: user mode.'
      ),
      MCQ(
        'The lesson continues with: “Why do we have different abstraction layers for user space and kernel? Why can\'t you combine both powers into one layer? Well there is a very good reason why t…” — which lesson is this?',
        'Kernel Privelege Levels',
        ['Kernel Privelege Levels', 'Kernel Overview', 'System Calls', 'Kernel Installation'],
        'Those lines are from ‘Kernel Privelege Levels’.'
      ),
    ],
  },
  'linux-kernel-3': {
    id: 'linux-kernel-3',
    title: 'System Calls',
    theory: [
      'Remember Britney in the previous lesson? Let\'s say we want to see her and get some drinks together. How do we get from standing outside in the crowds of people to inside her innermost circle? We would use system calls.',
      'System calls are like the VIP passes that get you to a secret side door that leads directly to Britney.',
      'System calls (syscall) provide user space processes a way to request the kernel to do something for us. The kernel makes certain services available through the system call API. These services allow us to read or write to a file, modify memory usage, modify our network, etc.',
      'The amount of services are fixed, so you can\'t be adding system calls nilly willy, your system already has a table of what system calls exist and each system call has a unique ID.',
      'I won\'t get into specifics of system calls, as that will require you to know a bit of C, but the basics is that when you call a program like ls, the code inside this program contains a system call wrapper (so not the actual system call yet). Inside this wrapper it invokes the system call which will execute a trap, this trap then gets caught by the system call handler and then references the system call in the system call table.',
      'Let\'s say we are trying to call the stat() system call, it\'s identified by a syscall ID and the purpose of the stat() system call is to query the status of a file. Now remember, you were running the ls program in non-privilege mode. So now it sees you\'re trying to make a syscall, it then switches you over to kernel mode, there it does lots of things but most importantly it looks up your syscall number, finds it in a table based on the syscall ID and then executes the function you wanted to run.',
      'Once it\'s done, it will return back to user mode and your process will receive a return status if it was successful or if it had an error. The inner workings of syscalls get really detailed, I would recommend looking at information online if you want to learn more!',
      'You can actually view the system calls that a process makes with the "strace" command. The strace command is useful for debugging how a program executed.',
      '"strace ls"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘System Calls’ cover?',
        'System Calls',
        ['System Calls', 'Kernel Overview', 'Kernel Privelege Levels', 'Kernel Installation'],
        'This lesson is ‘System Calls’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: strace ls',
        ['strace', 'ls'],
        ['strace', 'ls', 'sudo', '-la'],
        'Type it exactly as shown: strace ls. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Remember Britney in the previous lesson? Let\'s say we want to see her and get some drinks together. How do we get from standing outside in the crowds of people…” — which lesson is this?',
        'System Calls',
        ['System Calls', 'Kernel Overview', 'Kernel Privelege Levels', 'Kernel Installation'],
        'Those opening lines are from ‘System Calls’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘System Calls’ lesson?',
        'strace',
        ['strace', 'core', 'echo Hello World', 'pwd'],
        'The ‘System Calls’ lesson mentions “strace” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “System calls are like the VIP passes that get you to a secret side door that leads directly to Britney.” — which lesson is this?',
        'System Calls',
        ['System Calls', 'Kernel Overview', 'Kernel Privelege Levels', 'Kernel Installation'],
        'Those lines are from ‘System Calls’.'
      ),
    ],
  },
  'linux-kernel-4': {
    id: 'linux-kernel-4',
    title: 'Kernel Installation',
    theory: [
      'Ok, now that we\'ve got all that boring stuff out of the way, let\'s talk about actually installing and modifying kernels. You can install multiple kernels on your system, remember in our lesson on the boot process? In our GRUB menu we can choose which kernel to boot to.',
      'To see what kernel version you have on your system, use the following command: "uname -r" 3.19.0-43-generic',
      'The uname command prints system information, the -r command will print out all of the kernel release version.',
      'You can install the Linux kernel in different ways, you can download the source package and compile from source or you can install it using package management tools. "sudo apt install linux-generic-lts-vivid"',
      'and then just reboot into the kernel you installed. Simple right? Kind of, you\'ll need to also install other linux packages such as the linux-headers, linux-image-generic, etc). You can also specify the version number, so the above command can look like, "sudo apt install 3.19.0-43-generic"',
      'Alternatively, if you just want the updated kernel version, just use "dist-upgrade", it performs upgrades to all package on your system: "sudo apt dist-upgrade"',
      'There are many different kernel versions, some are used as LTS (long term support), some are the latest and greatest, the compatibility may be very different between kernel versions so you may want to try out different kernels.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Kernel Installation’ cover?',
        'Kernel Installation',
        ['Kernel Installation', 'Kernel Overview', 'Kernel Privelege Levels', 'System Calls'],
        'This lesson is ‘Kernel Installation’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: uname -r',
        ['uname', '-r'],
        ['uname', '-r', 'sudo', '-la'],
        'Type it exactly as shown: uname -r. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Ok, now that we\'ve got all that boring stuff out of the way, let\'s talk about actually installing and modifying kernels. You can install multiple kernels on yo…” — which lesson is this?',
        'Kernel Installation',
        ['Kernel Installation', 'Kernel Overview', 'Kernel Privelege Levels', 'System Calls'],
        'Those opening lines are from ‘Kernel Installation’.'
      ),
      BUILD(
        'Assemble another command from this lesson: sudo apt install linux-generic-lts-vivid',
        ['sudo', 'apt', 'install', 'linux-generic-lts-vivid'],
        ['sudo', 'apt', 'install', 'linux-generic-lts-vivid', '-la', '-r'],
        'Type it exactly as shown: sudo apt install linux-generic-lts-vivid.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Kernel Installation’ lesson?',
        'sudo apt install 3.19.0-43-generic',
        ['sudo apt install 3.19.0-43-generic', 'core', 'echo Hello World', 'pwd'],
        'The ‘Kernel Installation’ lesson mentions “sudo apt install 3.19.0-43-generic” — find it in the theory above.'
      ),
    ],
  },
  'linux-kernel-5': {
    id: 'linux-kernel-5',
    title: 'Kernel Location',
    theory: [
      'What happens when you install a new kernel? Well it actually adds a couple of files to your system, these files are usually added to the "/boot" directory.',
      'You will see multiple files for different kernel versions:',
      '1- vmlinuz - this is the actual linux kernel 2- initrd - as we\'ve discussed before, the initrd is used as a temporary file system, used before loading the kernel 3- System.map - symbolic lookup table 4- config - kernel configuration settings, if you are compiling your own kernel, you can set which modules can be loaded',
      'If your /boot directory runs out of space, you can always delete old versions of these files or just use a package manager, but be careful when doing maintenance in this directory and don\'t accidentally delete the kernel you are using.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Kernel Location’ cover?',
        'Kernel Location',
        ['Kernel Location', 'Kernel Overview', 'Kernel Privelege Levels', 'System Calls'],
        'This lesson is ‘Kernel Location’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “What happens when you install a new kernel? Well it actually adds a couple of files to your system, these files are usually added to the "/boot" directory.” — which lesson is this?',
        'Kernel Location',
        ['Kernel Location', 'Kernel Overview', 'Kernel Privelege Levels', 'System Calls'],
        'Those opening lines are from ‘Kernel Location’.'
      ),
      MCQ(
        'The lesson continues with: “You will see multiple files for different kernel versions:” — which lesson is this?',
        'Kernel Location',
        ['Kernel Location', 'Kernel Overview', 'Kernel Privelege Levels', 'System Calls'],
        'Those lines are from ‘Kernel Location’.'
      ),
    ],
  },
  'linux-kernel-6': {
    id: 'linux-kernel-6',
    title: 'Kernel Modules',
    theory: [
      'Let\'s say I have a sweet ride, I invest a lot of time and money into it. I add a spoiler, hitch, bike rack and other random things. These components don\'t actually change the core functionality of the car and I can remove and add them very easily. The kernel uses the same concept with kernel modules.',
      'The kernel in itself is a monolithic piece of software, when we want to add support for a new type of keyboard, we don\'t write this code directly into the kernel code. Just as we wouldn\'t meld a bike rack to our car (well maybe some people would do that). Kernel modules are pieces of code that can be loaded and unloaded into the kernel on demand. They allow us to extend the functionality of the kernel without actually adding to the core kernel code. We can also add modules and not have to reboot the system (in most cases).',
      'View a list of currently loaded modules: "lsmod"',
      'Load a module: "sudo modprobe bluetooth"',
      'Modprobe loads tries the module from "/lib/modules/(kernel version)/kernel/drivers. Kernel modules may also have dependencies, modprobe loads our module dependencies if they are not already loaded.',
      'Remove a module: "sudo modprobe -r bluetooth"',
      'Load on bootup: You can also load modules during system boot, instead of temporarily loading them with modprobe (which will be unloaded when you reboot). Just modify the "/etc/modprobe.d" directory and add a configuration file in it like so:',
      'pete@icebox:~$ /etc/modprobe.d/peanutbutter.conf options peanut_butter type=almond',
      'A bit of a outlandish example, but if you had a module named peanut_butter and you wanted to add a kernel parameter for type=almond, you can have it load on startup using this configuration file. Also note that kernel modules have their own kernel parameters so you\'ll want to read about the module specifically to find out more.',
      'Do not load on bootup: You can also make sure a module does not load on bootup by adding a configuration file like so:',
      'pete@icebox:~$ /etc/modprobe.d/peanutbutter.conf blacklist peanut_butter',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Kernel Modules’ cover?',
        'Kernel Modules',
        ['Kernel Modules', 'Kernel Overview', 'Kernel Privelege Levels', 'System Calls'],
        'This lesson is ‘Kernel Modules’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo modprobe bluetooth',
        ['sudo', 'modprobe', 'bluetooth'],
        ['sudo', 'modprobe', 'bluetooth', '-la', '-r'],
        'Type it exactly as shown: sudo modprobe bluetooth. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Let\'s say I have a sweet ride, I invest a lot of time and money into it. I add a spoiler, hitch, bike rack and other random things. These components don\'t actu…” — which lesson is this?',
        'Kernel Modules',
        ['Kernel Modules', 'Kernel Overview', 'Kernel Privelege Levels', 'System Calls'],
        'Those opening lines are from ‘Kernel Modules’.'
      ),
      BUILD(
        'Assemble another command from this lesson: sudo modprobe -r bluetooth',
        ['sudo', 'modprobe', '-r', 'bluetooth'],
        ['sudo', 'modprobe', '-r', 'bluetooth', '-la', '|'],
        'Type it exactly as shown: sudo modprobe -r bluetooth.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Kernel Modules’ lesson?',
        'lsmod',
        ['lsmod', 'echo Hello World', 'pwd', 'cd /home/pete/Pictures'],
        'The ‘Kernel Modules’ lesson mentions “lsmod” — find it in the theory above.'
      ),
    ],
  },
  'linux-init-1': {
    id: 'linux-init-1',
    title: 'Sysv Overview',
    theory: [
      'The main purpose of init is to start and stop essential processes on the system. There are three major implementations of init in Linux, System V, Upstart and systemd.',
      'In this lesson, we\'re going to go over the most traditional version of init, System V init or Sys V (pronounced as \'System Five\').',
      'To find out if you are using the Sys V init implementation, if you have an /etc/inittab file you are most likely running Sys V.',
      'Sys V starts and stops processes sequentially, so let\'s say if you wanted to start up a service named foo-a, well before foo-b can work, you have to make sure foo-a is already running. Sys V does that with scripts, these scripts start and stop services for us, we can write our own scripts or most of the time use the ones that are already built in the operating system and are used to load essential services.',
      'The pros of using this implementation of init, is that it\'s relatively easy to solve dependencies, since you know foo-a comes before foo-b, however performance isn\'t great because usually one thing is starting or stopping at a time.',
      'When using Sys V, the state of the machine is defined by runlevels which are set from 0 to 6. These different modes will vary depending on the distribution, but most of the time will look like the following:',
      '0: Shutdown 1: Single User Mode 2: Multiuser mode without networking 3: Multiuser mode with networking 4: Unused 5: Multiuser mode with networking and GUI 6: Reboot',
      'When your system starts up, it looks to see what runlevel you are in and executes scripts located inside that runlevel configuration. The scripts are located in "/etc/rc.d/rc[runlevel number].d/" or "/etc/init.d".',
      'Scripts that start with S(start) or K(kill) will run on startup and shutdown, respectively. The numbers next to these characters are the sequence they run in.',
      'For example: "pete@icebox:/etc/rc.d/rc0.d$ ls" K10updates K80openvpn',
      'We see when we switch to runlevel 0 or shutdown mode, our machine will try to run a script to kill the updates services and then openvpn. To find out what runlevel your machine is booting into, you can see the default runlevel in the /etc/inittab file. You can also change your default runlevel in this file as well.',
      'One thing to note, System V is slowly getting replaced, maybe not today, or even years from now. However, you may see runlevels come up in other init implementations, this is primarily to support those services that are only started or stopped using System V init scripts.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Sysv Overview’ cover?',
        'Sysv Overview',
        ['Sysv Overview', 'Sysv Services', 'Upstart Overview', 'Upstart Jobs'],
        'This lesson is ‘Sysv Overview’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “The main purpose of init is to start and stop essential processes on the system. There are three major implementations of init in Linux, System V, Upstart and…” — which lesson is this?',
        'Sysv Overview',
        ['Sysv Overview', 'Sysv Services', 'Upstart Overview', 'Upstart Jobs'],
        'Those opening lines are from ‘Sysv Overview’.'
      ),
      MCQ(
        'The lesson continues with: “In this lesson, we\'re going to go over the most traditional version of init, System V init or Sys V (pronounced as \'System Five\').” — which lesson is this?',
        'Sysv Overview',
        ['Sysv Overview', 'Sysv Services', 'Upstart Overview', 'Upstart Jobs'],
        'Those lines are from ‘Sysv Overview’.'
      ),
    ],
  },
  'linux-init-2': {
    id: 'linux-init-2',
    title: 'Sysv Services',
    theory: [
      'There are many command line tools you can use to manage Sys V services.',
      'List services: "service --status-all"',
      'Start a service: "sudo service networking start"',
      'Stop a service: "sudo service networking stop"',
      'Restart a service: "sudo service networking restart"',
      'These commands aren\'t specific to Sys V init systems, you can use these commands to manage Upstart services as well. Since Linux is trying to move away from the more traditional Sys V init scripts, there are still things in place to help that transition.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Sysv Services’ cover?',
        'Sysv Services',
        ['Sysv Services', 'Sysv Overview', 'Upstart Overview', 'Upstart Jobs'],
        'This lesson is ‘Sysv Services’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: service --status-all',
        ['service', '--status-all'],
        ['service', '--status-all', 'sudo', '-la'],
        'Type it exactly as shown: service --status-all. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “There are many command line tools you can use to manage Sys V services.” — which lesson is this?',
        'Sysv Services',
        ['Sysv Services', 'Sysv Overview', 'Upstart Overview', 'Upstart Jobs'],
        'Those opening lines are from ‘Sysv Services’.'
      ),
      BUILD(
        'Assemble another command from this lesson: sudo service networking start',
        ['sudo', 'service', 'networking', 'start'],
        ['sudo', 'service', 'networking', 'start', '-la', '-r'],
        'Type it exactly as shown: sudo service networking start.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Sysv Services’ lesson?',
        'sudo service networking stop',
        ['sudo service networking stop', 'core', 'echo Hello World', 'pwd'],
        'The ‘Sysv Services’ lesson mentions “sudo service networking stop” — find it in the theory above.'
      ),
    ],
  },
  'linux-init-3': {
    id: 'linux-init-3',
    title: 'Upstart Overview',
    theory: [
      'Upstart was developed by Canonical, so it was the init implementation on Ubuntu for a while.',
      'However on modern Ubuntu installations systemd is now used. Upstart was created to improve upon the issues with Sys V, such as the strict startup processes, blocking of tasks, etc. Upstart\'s event and job driven model allow it to respond to events as they happen.',
      'To find out if you are using Upstart, if you have a /usr/share/upstart directory that\'s a pretty good indicator.',
      'Jobs are the actions that Upstart performs and events are messages that are received from other processes to trigger jobs. To see a list of jobs and their configuration:',
      '"ls /etc/init" acpid.conf mountnfs.sh.conf alsa-restore.conf mtab.sh.conf alsa-state.conf networking.conf alsa-store.conf network-interface.conf anacron.conf network-interface-container.conf',
      'Inside these job configurations, it\'ll include information on how to start jobs and when to start jobs.',
      'For example, in the networking.conf file, it could say something as simple as: start on runlevel [235] stop on runlevel [0]',
      'This means that it will start setting up networking on runlevel 2, 3 or 5 and will stop networking on runlevel 0. There are many ways to write the configuration file and you\'ll discover that when you look at the different job configurations available.',
      'The way that Upstart works is that:',
      '1- First, it loads up the job configurations from /etc/init 2- Once a startup event occurs, it will run jobs triggered by that event. 3- These jobs will make new events and then those events will trigger more jobs 4- Upstart continues to do this until it completes all the necessary jobs',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Upstart Overview’ cover?',
        'Upstart Overview',
        ['Upstart Overview', 'Sysv Overview', 'Sysv Services', 'Upstart Jobs'],
        'This lesson is ‘Upstart Overview’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ls /etc/init',
        ['ls', '/etc/init'],
        ['ls', '/etc/init', 'sudo', '-la'],
        'Type it exactly as shown: ls /etc/init. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Upstart was developed by Canonical, so it was the init implementation on Ubuntu for a while.” — which lesson is this?',
        'Upstart Overview',
        ['Upstart Overview', 'Sysv Overview', 'Sysv Services', 'Upstart Jobs'],
        'Those opening lines are from ‘Upstart Overview’.'
      ),
      MCQ(
        'The lesson continues with: “However on modern Ubuntu installations systemd is now used. Upstart was created to improve upon the issues with Sys V, such as the strict startup processes, bl…” — which lesson is this?',
        'Upstart Overview',
        ['Upstart Overview', 'Sysv Overview', 'Sysv Services', 'Upstart Jobs'],
        'Those lines are from ‘Upstart Overview’.'
      ),
    ],
  },
  'linux-init-4': {
    id: 'linux-init-4',
    title: 'Upstart Jobs',
    theory: [
      'Upstart can trigger a lot of events and jobs to run, unfortunately there is no easy way to see where an event or job originated, so you\'ll have to poke around the job configurations in /etc/init.',
      'Most of the time, you won\'t ever need to look at the Upstart job configuration files, but you will want to control some specific jobs more easily. There are a lot of useful commands you can use in an Upstart system.',
      'View jobs: initctl list',
      'shutdown stop/waiting console stop/waiting ...',
      'You\'ll see a list of Upstart jobs with different statuses applied to them. In each line, the job name is the first value and the second field (before the /) is actually the goal of the job, the third value (after the /) is the current status. So we see that our shutdown job eventually wants to stop, but it is currently in a state of waiting. The job status and goals will change as you start or stop jobs.',
      'View specific job: initctl status networking networking start/running',
      'We won\'t get into the details of how to write an Upstart job configuration, however we already know that jobs are stopped, started and restarted in these configurations. These jobs also emit events, so they can start other jobs. We\'ll go through the manual commands of the Upstart operation, but if you are curious, you should dig into the .conf files in more depth.',
      'Manually start a job: sudo initctl start networking',
      'Manually stop a job: sudo initctl stop networking',
      'Manually restart a job: sudo initctl restart networking',
      'Manually emit an event: sudo initctl emit some_event',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Upstart Jobs’ cover?',
        'Upstart Jobs',
        ['Upstart Jobs', 'Sysv Overview', 'Sysv Services', 'Upstart Overview'],
        'This lesson is ‘Upstart Jobs’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Upstart can trigger a lot of events and jobs to run, unfortunately there is no easy way to see where an event or job originated, so you\'ll have to poke around…” — which lesson is this?',
        'Upstart Jobs',
        ['Upstart Jobs', 'Sysv Overview', 'Sysv Services', 'Upstart Overview'],
        'Those opening lines are from ‘Upstart Jobs’.'
      ),
      MCQ(
        'The lesson continues with: “Most of the time, you won\'t ever need to look at the Upstart job configuration files, but you will want to control some specific jobs more easily. There are a…” — which lesson is this?',
        'Upstart Jobs',
        ['Upstart Jobs', 'Sysv Overview', 'Sysv Services', 'Upstart Overview'],
        'Those lines are from ‘Upstart Jobs’.'
      ),
    ],
  },
  'linux-init-5': {
    id: 'linux-init-5',
    title: 'SystemD Overview',
    theory: [
      'Systemd is slowly becoming the emerging standard for init. If you have a /usr/lib/systemd directory, you\'re most likely using systemd.',
      'Systemd uses goals to get your system up and running. Basically you have a target that you want to achieve and this target also has dependencies that we need to achieve. Systemd is extremely flexible and robust, it does not follow a strict sequence to get processes started. Here\'s what happens during the typical systemd boot:',
      '1- First, systemd loads it\'s configuration files, usually located in /etc/systemd/system or /usr/lib/systemd/system 2- Then it determines its boot goal, which is usually default.target 3- Systemd figures out the dependencies of the boot target and activates them',
      'Similar to Sys V runlevels, systemd boots into different targets:',
      '1- poweroff.target - shutdown system 2- rescue.target - single user mode 3- multi-user.target - multiuser with networking 4- graphical.target - multiuser with networking and GUI 5- reboot.target - restart',
      'The default boot goal of default.target usually points to the graphical.target.',
      'The main object that systemd works with are known as units. Systemd doesn\'t just stop and start services, it can mount filesystems, monitor your network sockets, etc and because of that robustness it has different types of units it operates. The most common units are:',
      '1- Service units - these are the services we\'ve been starting and stopping, these unit files end in .service 2- Mount units - These mount filesystems, these unit files end in .mount 3- Target units - These group together other units, the files end in .target',
      'For example, let\'s say we boot into our default.target, well this target groups together the networking.service unit, crond.service unit, etc, so once we activate a single unit, everything below that unit gets activated as well.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘SystemD Overview’ cover?',
        'SystemD Overview',
        ['SystemD Overview', 'Sysv Overview', 'Sysv Services', 'Upstart Overview'],
        'This lesson is ‘SystemD Overview’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Systemd is slowly becoming the emerging standard for init. If you have a /usr/lib/systemd directory, you\'re most likely using systemd.” — which lesson is this?',
        'SystemD Overview',
        ['SystemD Overview', 'Sysv Overview', 'Sysv Services', 'Upstart Overview'],
        'Those opening lines are from ‘SystemD Overview’.'
      ),
      MCQ(
        'The lesson continues with: “Systemd uses goals to get your system up and running. Basically you have a target that you want to achieve and this target also has dependencies that we need t…” — which lesson is this?',
        'SystemD Overview',
        ['SystemD Overview', 'Sysv Overview', 'Sysv Services', 'Upstart Overview'],
        'Those lines are from ‘SystemD Overview’.'
      ),
    ],
  },
  'linux-init-6': {
    id: 'linux-init-6',
    title: 'SystemD Goals',
    theory: [
      'We won\'t get into the details of writing systemd unit files. We will however go over a brief overview of a unit file and how to manually control units.',
      'Here is a basic service unit file: foobar.service [Unit] Description=My Foobar Before=bar.target',
      '[Service] ExecStart=/usr/bin/foobar',
      '[Install] WantedBy=multi-user.target',
      'This is a simple service target, at the beginning of the file we see a section for [Unit], this allows us to give our unit file a description as well as control the ordering of when to activate the unit.',
      'The next portion is the [Service] section, under here we can start, stop or reload a service. And the [Install] section is used for dependency.',
      'This is only the tip of the iceberg for writing systemd files, so I implore you to read up on the subject if you want to know more.',
      'Now, let\'s get into some commands you can use with systemd units:',
      'List units: "systemctl list-units"',
      'View status of unit: "systemctl status networking.service"',
      'Start a service: "sudo systemctl start networking.service"',
      'Stop a service: "sudo systemctl stop networking.service"',
      'Restart a service: "sudo systemctl restart networking.service"',
      'Enable a unit: "sudo systemctl enable networking.service"',
      'Disable a unit: "sudo systemctl disable networking.service"',
      'Again, you have yet to see how much depth systemd gets into, so read up on it if you want to learn more.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘SystemD Goals’ cover?',
        'SystemD Goals',
        ['SystemD Goals', 'Sysv Overview', 'Sysv Services', 'Upstart Overview'],
        'This lesson is ‘SystemD Goals’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: systemctl list-units',
        ['systemctl', 'list-units'],
        ['systemctl', 'list-units', 'sudo', '-la'],
        'Type it exactly as shown: systemctl list-units. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “We won\'t get into the details of writing systemd unit files. We will however go over a brief overview of a unit file and how to manually control units.” — which lesson is this?',
        'SystemD Goals',
        ['SystemD Goals', 'Sysv Overview', 'Sysv Services', 'Upstart Overview'],
        'Those opening lines are from ‘SystemD Goals’.'
      ),
      BUILD(
        'Assemble another command from this lesson: systemctl status networking.service',
        ['systemctl', 'status', 'networking.service'],
        ['systemctl', 'status', 'networking.service', 'sudo', '-la'],
        'Type it exactly as shown: systemctl status networking.service.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘SystemD Goals’ lesson?',
        'sudo systemctl start networking.service',
        ['sudo systemctl start networking.service', 'core', 'echo Hello World', 'pwd'],
        'The ‘SystemD Goals’ lesson mentions “sudo systemctl start networking.service” — find it in the theory above.'
      ),
    ],
  },
  'linux-init-7': {
    id: 'linux-init-7',
    title: 'Power States',
    theory: [
      'Hard to believe we haven\'t actually discussed ways to control your system state through the command line, but when talking about init, we not only talk about the modes that get us starting our system, but also the ones that stop our system.',
      'To shutdown your system: "sudo shutdown -h now" This will halt the system (power it off), you must also specify a time when you want this to take place.',
      'You can add a time in minutes that will shutdown the system in that amount of time: "sudo shutdown -h +2" This will shutdown your system in two minutes.',
      'You can also restart with the shutdown command: "sudo shutdown -r now"',
      'Or just use the reboot command: "sudo reboot"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Power States’ cover?',
        'Power States',
        ['Power States', 'Sysv Overview', 'Sysv Services', 'Upstart Overview'],
        'This lesson is ‘Power States’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo shutdown -h now',
        ['sudo', 'shutdown', '-h', 'now'],
        ['sudo', 'shutdown', '-h', 'now', '-la', '-r'],
        'Type it exactly as shown: sudo shutdown -h now. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Hard to believe we haven\'t actually discussed ways to control your system state through the command line, but when talking about init, we not only talk about t…” — which lesson is this?',
        'Power States',
        ['Power States', 'Sysv Overview', 'Sysv Services', 'Upstart Overview'],
        'Those opening lines are from ‘Power States’.'
      ),
      BUILD(
        'Assemble another command from this lesson: sudo shutdown -h +2',
        ['sudo', 'shutdown', '-h', '+2'],
        ['sudo', 'shutdown', '-h', '+2', '-la', '-r'],
        'Type it exactly as shown: sudo shutdown -h +2.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Power States’ lesson?',
        'sudo shutdown -r now',
        ['sudo shutdown -r now', 'core', 'echo Hello World', 'pwd'],
        'The ‘Power States’ lesson mentions “sudo shutdown -r now” — find it in the theory above.'
      ),
    ],
  },
  'linux-process-utilization-1': {
    id: 'linux-process-utilization-1',
    title: 'Top',
    theory: [
      'In this course, we\'ll go over how to read and analyze the resource utilization on your system, this lesson shows some great tools to use when you need to track what a process is doing.',
      'top: We\'ve discussed top before, but we\'re going to dig into the specifics of what it\'s actually displaying. Remember top is the tool we used to get a real time view of the system utilization by our processes:',
      'top - 18:06:26 up 6 days, 4:07, 2 users, load average: 0.92, 0.62, 0.59 Tasks: 389 total, 1 running, 387 sleeping, 0 stopped, 1 zombie %Cpu(s): 1.8 us, 0.4 sy, 0.0 ni, 97.6 id, 0.1 wa, 0.0 hi, 0.0 si, 0.0 st KiB Mem: 32870888 total, 27467976 used, 5402912 free, 518808 buffers KiB Swap: 33480700 total, 39892 used, 33440808 free. 19454152 cached Mem',
      'PID USER PR NI VIRT RES SHR S %CPU %MEM TIME+ COMMAND 6675 patty 20 0 1731472 520960 30876 S 8.3 1.6 160:24.79 chrome 6926 patty 20 0 935888 163456 25576 S 4.3 0.5 5:28.13 chrome',
      'Let\'s go over what this output means, you don\'t have to memorize this, but come back to this when you need a reference.',
      '1st line: This is the same information you would see if you ran the uptime command (more to come)',
      'The fields are from left to right: 1- Current time 2- How long the system has been running 3- How many users are currently logged on 4- System load average (more to come)',
      '2nd line: Tasks that are running, sleeping, stopped and zombied',
      '3rd line: Cpu information:',
      '1- us: user CPU time - Percentage of CPU time spent running users’ processes that aren’t niced. 2- sy: system CPU time - Percentage of CPU time spent running the kernel and kernel processes 3- ni: nice CPU time - Percentage of CPU time spent running niced processes 4- id: CPU idle time - Percentage of CPU time that is spent idle 5- wa: I/O wait - Percentage of CPU time that is spent waiting for I/O. If this value is low, the problem probably isn’t disk or network I/O 6- hi: hardware interrupts - Percentage of CPU time spent serving hardware interrupts 7- si: software interrupts - Percentage of CPU time spent serving software interrupts 8- st: steal time - If you are running virtual machines, this is the percentage of CPU time that was stolen from you for other tasks',
      '4th and 5th line: Memory Usage and Swap Usage',
      'Processes List that are Currently in Use:',
      '1- PID: Id of the process 2- USER: user that is the owner of the process 3- PR: Priority of process 4- NI: The nice value 5- VIRT: Virtual memory used by the process 6- RES: Physical memory used from the process 7- SHR: Shared memory of the process 8- S: Indicates the status of the process: S=sleep, R=running, Z=zombie,D=uninterruptible,T=stopped 9- %CPU - this is the percent of CPU used by this process 10- %MEM - percentage of RAM used by this process 11- TIME+ - total time of activity of this process 12- COMMAND - name of the process',
      'You can also specify a process ID if you just want to track certain processes: "top -p 1"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Top’ cover?',
        'Top',
        ['Top', 'Lsof/Fuser', 'Threads', 'Cpu Monitoring'],
        'This lesson is ‘Top’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: top -p 1',
        ['top', '-p', '1'],
        ['top', '-p', '1', 'sudo', '-la'],
        'Type it exactly as shown: top -p 1. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “In this course, we\'ll go over how to read and analyze the resource utilization on your system, this lesson shows some great tools to use when you need to track…” — which lesson is this?',
        'Top',
        ['Top', 'Lsof/Fuser', 'Threads', 'Cpu Monitoring'],
        'Those opening lines are from ‘Top’.'
      ),
      MCQ(
        'The lesson continues with: “top: We\'ve discussed top before, but we\'re going to dig into the specifics of what it\'s actually displaying. Remember top is the tool we used to get a real tim…” — which lesson is this?',
        'Top',
        ['Top', 'Lsof/Fuser', 'Threads', 'Cpu Monitoring'],
        'Those lines are from ‘Top’.'
      ),
    ],
  },
  'linux-process-utilization-2': {
    id: 'linux-process-utilization-2',
    title: 'Lsof/Fuser',
    theory: [
      'Let\'s say you plugged in a USB drive and starting working on some files, once you were done, you go and unmount the USB device and you\'re getting an error "Device or Resource Busy". How would you find out which files in the USB drive are still in use? There are actually two tools you can use for this:',
      'lsof: Remember files aren\'t just text files, images, etc, they are everything on the system, disks, pipes, network sockets, devices, etc. To see what is in use by a process, you can use the lsof command (short for "list open files") this will show you a list of all the open files and their associated process.',
      '"lsof" COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME lxsession 1491 pete cwd DIR 8,6 4096 131 . update-no 1796 pete cwd DIR 8,6 4096 131 . nm-applet 1804 pete cwd DIR 8,6 4096 131 . indicator 1809 pete cwd DIR 8,6 4096 131 . xterm 2205 pete cwd DIR 8,6 4096 131 . bash 2207 pete cwd DIR 8,6 4096 131 . lsof 5914 pete cwd DIR 8,6 4096 131 . lsof 5915 pete cwd DIR 8,6 4096 131 .',
      'Now I can see what processes are currently holding the device/file open. In our USB example, you can also kill these processes so we can unmount this pesky drive.',
      'fuser: Another way to track a process is the fuser command (short for "file user"), this will show you information about the process that is using the file or the file user.',
      '"fuser -v" USER PID ACCESS COMMAND /home/pete: pete 1491 ..c.. lxsession pete 1796 ..c.. update-notifier pete 1804 ..c.. nm-applet pete 1809 ..c.. indicator-power pete 2205 ..c.. xterm pete 2207 ..c.. bash',
      'We can see which processes are currently using our /home/pete directory. The lsof and fuser tools are very similar, familiarize yourself with these tools and try using them next time you need to track a file or process down.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Lsof/Fuser’ cover?',
        'Lsof/Fuser',
        ['Lsof/Fuser', 'Top', 'Threads', 'Cpu Monitoring'],
        'This lesson is ‘Lsof/Fuser’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: list open files',
        ['list', 'open', 'files'],
        ['list', 'open', 'files', 'sudo', '-la'],
        'Type it exactly as shown: list open files. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Let\'s say you plugged in a USB drive and starting working on some files, once you were done, you go and unmount the USB device and you\'re getting an error "Dev…” — which lesson is this?',
        'Lsof/Fuser',
        ['Lsof/Fuser', 'Top', 'Threads', 'Cpu Monitoring'],
        'Those opening lines are from ‘Lsof/Fuser’.'
      ),
      BUILD(
        'Assemble another command from this lesson: file user',
        ['file', 'user'],
        ['file', 'user', 'sudo', '-la'],
        'Type it exactly as shown: file user.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Lsof/Fuser’ lesson?',
        'fuser -v',
        ['fuser -v', 'core', 'echo Hello World', 'pwd'],
        'The ‘Lsof/Fuser’ lesson mentions “fuser -v” — find it in the theory above.'
      ),
    ],
  },
  'linux-process-utilization-3': {
    id: 'linux-process-utilization-3',
    title: 'Threads',
    theory: [
      'You may have heard of the terms single-threaded and multi-threaded processes. Threads are very similar to processes, in that they are used to execute the same program, they are often referred to as lightweight processes. If a process has one thread it is single-threaded and if a process has more than one thread it is multi-threaded. However, all processes have at least one thread.',
      'Processes operate with their own isolated system resources, however threads can share these resources among each other easily, making it easier for them to communicate among each other and at times it is more efficient to have a multi-threaded application than a multi-process application.',
      'Basically, let\'s say you open up LibreOffice Writer and Chrome, each is it\'s own separate process. Now you go inside Writer and start editing text, when you edit the text it gets automatically saved. These two parallel "lightweight processes" of saving and editing are threads.',
      'To view process threads, you can use:',
      '"ps m" PID TTY STAT TIME COMMAND 2207 pts/2 - 0:01 bash - - Ss 0:01 - 5252 pts/2 - 0:00 ps m - - R+ 0:00 -',
      'The processes are denoted with each PID and underneath the processes are their threads (denoted by a --). So you can see that the processes above are both single-threaded.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Threads’ cover?',
        'Threads',
        ['Threads', 'Top', 'Lsof/Fuser', 'Cpu Monitoring'],
        'This lesson is ‘Threads’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: lightweight processes',
        ['lightweight', 'processes'],
        ['lightweight', 'processes', 'sudo', '-la'],
        'Type it exactly as shown: lightweight processes. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “You may have heard of the terms single-threaded and multi-threaded processes. Threads are very similar to processes, in that they are used to execute the same…” — which lesson is this?',
        'Threads',
        ['Threads', 'Top', 'Lsof/Fuser', 'Cpu Monitoring'],
        'Those opening lines are from ‘Threads’.'
      ),
      BUILD(
        'Assemble another command from this lesson: ps m',
        ['ps', 'm'],
        ['ps', 'm', 'sudo', '-la'],
        'Type it exactly as shown: ps m.'
      ),
      MCQ(
        'The lesson continues with: “Processes operate with their own isolated system resources, however threads can share these resources among each other easily, making it easier for them to com…” — which lesson is this?',
        'Threads',
        ['Threads', 'Top', 'Lsof/Fuser', 'Cpu Monitoring'],
        'Those lines are from ‘Threads’.'
      ),
    ],
  },
  'linux-process-utilization-4': {
    id: 'linux-process-utilization-4',
    title: 'Cpu Monitoring',
    theory: [
      'Let\'s go over a useful command, "uptime".',
      '"uptime" 17:23:35 up 1 day, 5:59, 2 users, load average: 0.00, 0.02, 0.05',
      'We talked about uptime in the first lesson of this course, but we haven\'t gone over the load average field.',
      'Load averages are good way to see the CPU load on your system. These numbers represent the average CPU load in 1, 5, and 15 minute intervals. What do I mean by CPU load, the CPU load is the average number of processes that are waiting to be executed by the CPU.',
      'Let\'s say you have a single-core CPU, think of this core as a single lane in traffic. If it\'s rush hour on the freeway, this lane is gonna be really busy and traffic is gonna be at 100% or a load of 1. Now the traffic has become so bad, it\'s backing up the freeway and getting the regular roads busy by twice the amount of cars, we can say that your load is 200% or a load of 2.',
      'Now let\'s say it clears up a bit and there are only half as many cars on the freeway lane, we can say the load of the lane is 0.5. When traffic is non-existent and we can get home quicker, the load should ideally be very low, like 2am traffic low. The cars in this case are processes and these processes are just waiting to get off the freeway and get home.',
      'Now just because you have a load average of 1 doesn\'t mean your computer is slogging around. Most modern machines these days have multiple cores. If you had a quad core processor (4 cores) and your load average is 1, it\'s really just affecting 25% of your CPU. Think of each core as a lane in traffic. You can view the amount of cores you have on your system with "cat /proc/cpuinfo".',
      'When observing load average, you have to take the number of cores into account, if you find that your machine is always using an above average load, there could something wrong going on.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Cpu Monitoring’ cover?',
        'Cpu Monitoring',
        ['Cpu Monitoring', 'Top', 'Lsof/Fuser', 'Threads'],
        'This lesson is ‘Cpu Monitoring’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: cat /proc/cpuinfo',
        ['cat', '/proc/cpuinfo'],
        ['cat', '/proc/cpuinfo', 'sudo', '-la'],
        'Type it exactly as shown: cat /proc/cpuinfo. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Let\'s go over a useful command, "uptime".” — which lesson is this?',
        'Cpu Monitoring',
        ['Cpu Monitoring', 'Top', 'Lsof/Fuser', 'Threads'],
        'Those opening lines are from ‘Cpu Monitoring’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Cpu Monitoring’ lesson?',
        'uptime',
        ['uptime', 'echo Hello World', 'pwd', 'cd /home/pete/Pictures'],
        'The ‘Cpu Monitoring’ lesson mentions “uptime” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “"uptime" 17:23:35 up 1 day, 5:59, 2 users, load average: 0.00, 0.02, 0.05” — which lesson is this?',
        'Cpu Monitoring',
        ['Cpu Monitoring', 'Top', 'Lsof/Fuser', 'Threads'],
        'Those lines are from ‘Cpu Monitoring’.'
      ),
    ],
  },
  'linux-process-utilization-5': {
    id: 'linux-process-utilization-5',
    title: 'IO Monitoring',
    theory: [
      'We can also monitor CPU usage as well as monitor disk usage with a handy tool known as "iostat"',
      '"iostat" Linux 3.13.0-39-lowlatency (icebox) 01/28/2016 _i686_ (1 CPU)',
      'avg-cpu: %user %nice %system %iowait %steal %idle 0.13 0.03 0.50 0.01 0.00 99.33',
      'Device: tps kB_read/s kB_wrtn/s kB_read kB_wrtn sda 0.17 3.49 1.92 385106 212417',
      'The first part is the CPU information:',
      '1- %user - Show the percentage of CPU utilization that occurred while executing at the user level (application) 2- %nice - Show the percentage of CPU utilization that occurred while executing at the user level with nice priority.user CPU utilization with nice priorities 3- %system - Show the percentage of CPU utilization that occurred while executing at the system level (kernel). 4- %iowait - Show the percentage of time that the CPU or CPUs were idle during which the system had an outstanding disk I/O request. 5- %steal - Show the percentage of time spent in involuntary wait by the virtual CPU or CPUs while the hypervisor was servicing another virtual processor. 6- %idle - Show the percentage of time that the CPU or CPUs were idle and the system did not have an outstanding disk I/O request.',
      'The second part is the disk utilization:',
      '1- tps - Indicate the number of transfers per second that were issued to the device. A transfer is an I/O request to the device. Multiple logical requests can be combined into a single I/O request to the device. A transfer is of indeterminate size.',
      '2- kB_read/s - Indicate the amount of data read from the device expressed in kilobytes per second. 3- kB_wrtn/s - Indicate the amount of data written to the device expressed in kilobytes per second. 4- kB_read - The total number of kilobytes read. 5- kB_wrtn - The total number of kilobytes written.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘IO Monitoring’ cover?',
        'IO Monitoring',
        ['IO Monitoring', 'Top', 'Lsof/Fuser', 'Threads'],
        'This lesson is ‘IO Monitoring’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “We can also monitor CPU usage as well as monitor disk usage with a handy tool known as "iostat"” — which lesson is this?',
        'IO Monitoring',
        ['IO Monitoring', 'Top', 'Lsof/Fuser', 'Threads'],
        'Those opening lines are from ‘IO Monitoring’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘IO Monitoring’ lesson?',
        'iostat',
        ['iostat', 'core', 'echo Hello World', 'pwd'],
        'The ‘IO Monitoring’ lesson mentions “iostat” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “"iostat" Linux 3.13.0-39-lowlatency (icebox) 01/28/2016 _i686_ (1 CPU)” — which lesson is this?',
        'IO Monitoring',
        ['IO Monitoring', 'Top', 'Lsof/Fuser', 'Threads'],
        'Those lines are from ‘IO Monitoring’.'
      ),
    ],
  },
  'linux-process-utilization-6': {
    id: 'linux-process-utilization-6',
    title: 'Memory Monitoring',
    theory: [
      'In addition to CPU monitoring and I/O monitoring you can monitor your memory usage with "vmstat"',
      '"vmstat" procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu----- r b swpd free buff cache si so bi bo in cs us sy id wa st 1 0 0 396528 38816 384036 0 0 4 2 38 79 0 0 99 0 0',
      'The fields are as follows: procs: 1- r - Number of processes for run time 2- b - Number of processes in uninterruptible sleep',
      'memory: 1- swpd - Amount of virtual memory used 2- free - Amount of free memory 3- buff - Amount of memory used as buffers 4- cache - Amount of memory used as cache',
      'swap: 1- si - Amount of memory swapped in from disk 2- so - Amount of memory swapped out to disk',
      'io: 1- bi - Amount of blocks received in from a block device 2- bo - Amount of blocks sent out to a block device',
      'system: 1- in - Number of interrupts per second 2- cs - Number of context switches per second',
      'cpu: 1- us - Time spent in user time 2- sy - Time spent in kernel time 3- id - Time spent idle 4- wa - Time spent waiting for IO',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Memory Monitoring’ cover?',
        'Memory Monitoring',
        ['Memory Monitoring', 'Top', 'Lsof/Fuser', 'Threads'],
        'This lesson is ‘Memory Monitoring’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “In addition to CPU monitoring and I/O monitoring you can monitor your memory usage with "vmstat"” — which lesson is this?',
        'Memory Monitoring',
        ['Memory Monitoring', 'Top', 'Lsof/Fuser', 'Threads'],
        'Those opening lines are from ‘Memory Monitoring’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Memory Monitoring’ lesson?',
        'vmstat',
        ['vmstat', 'core', 'echo Hello World', 'pwd'],
        'The ‘Memory Monitoring’ lesson mentions “vmstat” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “"vmstat" procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu----- r b swpd free buff cache si so bi bo in cs us sy id wa st 1 0 0 39652…” — which lesson is this?',
        'Memory Monitoring',
        ['Memory Monitoring', 'Top', 'Lsof/Fuser', 'Threads'],
        'Those lines are from ‘Memory Monitoring’.'
      ),
    ],
  },
  'linux-process-utilization-7': {
    id: 'linux-process-utilization-7',
    title: 'Continous Monitoring',
    theory: [
      'These monitoring tools are good to look at when your machine is having issues, but what about machines that are having issues when you aren\'t looking.',
      'For those, you\'ll need to use a continuous monitoring tool, something that will collect, report and save your system activity information. In this lesson we will go over a great tool to use "sar"',
      'Installing sar: Sar is a tool that is used to do historical analysis on your system, first make sure you have it installed by installing the sysstat package "sudo apt install sysstat".',
      'Setting up data collection: Usually once you install sysstat, your system will automatically start collecting data, if it doesn\'t you can enable it by modifying the ENABLED field in /etc/default/sysstat.',
      'Using sar: "sudo sar -q" This command will list the details from the start of the day.',
      '"sudo sar -r" This will list the details of memory usage from the start of the day.',
      '"sudo sar -P" This will list the details of CPU usage.',
      'To see a view of a different day, you can go into /var/log/sysstat/saXX where XX is the day you want to view. "sar -q /var/log/sysstat/sa02"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Continous Monitoring’ cover?',
        'Continous Monitoring',
        ['Continous Monitoring', 'Top', 'Lsof/Fuser', 'Threads'],
        'This lesson is ‘Continous Monitoring’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo apt install sysstat',
        ['sudo', 'apt', 'install', 'sysstat'],
        ['sudo', 'apt', 'install', 'sysstat', '-la', '-r'],
        'Type it exactly as shown: sudo apt install sysstat. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “These monitoring tools are good to look at when your machine is having issues, but what about machines that are having issues when you aren\'t looking.” — which lesson is this?',
        'Continous Monitoring',
        ['Continous Monitoring', 'Top', 'Lsof/Fuser', 'Threads'],
        'Those opening lines are from ‘Continous Monitoring’.'
      ),
      BUILD(
        'Assemble another command from this lesson: sudo sar -q',
        ['sudo', 'sar', '-q'],
        ['sudo', 'sar', '-q', '-la', '-r'],
        'Type it exactly as shown: sudo sar -q.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Continous Monitoring’ lesson?',
        'sudo sar -r',
        ['sudo sar -r', 'core', 'echo Hello World', 'pwd'],
        'The ‘Continous Monitoring’ lesson mentions “sudo sar -r” — find it in the theory above.'
      ),
    ],
  },
  'linux-process-utilization-8': {
    id: 'linux-process-utilization-8',
    title: 'Cron Jobs',
    theory: [
      'Although we have been talking about resource utilization, I think this would be a good point to mention a neat tool in Linux that is used to schedule tasks using cron. There is a service that runs programs for you at whatever time you schedule. This is a really useful if you have a script you want to run once a day that needs to execute something for you.',
      'For example, let\'s say I have a script located in /home/pete/scripts/change_wallpaper. I use this script every morning to change the picture I use for my wallpaper, but each morning I have to manually execute this script. Instead what I can do is create a cron job that executes my script through cron. I can specify the time I want this cron job to run and execute my script.',
      '"30 08 * * * /home/pete/scripts/change_wallpaper"',
      'The fields are as follows from left to right: 1- Minute - (0-59) 2- Hour - (0-23) 3- Day of the month - (1-31) 4- Month - (1-12) 5- Day of the week - (0-7). 0 and 7 are denoted as Sunday',
      'The asterisk in the field means to match every value. So in my above example, I want this to run every day in every month at 8:30am.',
      'To create a cronjob, just edit the crontab file: "crontab -e"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Cron Jobs’ cover?',
        'Cron Jobs',
        ['Cron Jobs', 'Top', 'Lsof/Fuser', 'Threads'],
        'This lesson is ‘Cron Jobs’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: crontab -e',
        ['crontab', '-e'],
        ['crontab', '-e', 'sudo', '-la'],
        'Type it exactly as shown: crontab -e. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Although we have been talking about resource utilization, I think this would be a good point to mention a neat tool in Linux that is used to schedule tasks usi…” — which lesson is this?',
        'Cron Jobs',
        ['Cron Jobs', 'Top', 'Lsof/Fuser', 'Threads'],
        'Those opening lines are from ‘Cron Jobs’.'
      ),
      MCQ(
        'The lesson continues with: “For example, let\'s say I have a script located in /home/pete/scripts/change_wallpaper. I use this script every morning to change the picture I use for my wallp…” — which lesson is this?',
        'Cron Jobs',
        ['Cron Jobs', 'Top', 'Lsof/Fuser', 'Threads'],
        'Those lines are from ‘Cron Jobs’.'
      ),
    ],
  },
  'linux-logging-1': {
    id: 'linux-logging-1',
    title: 'System Logging',
    theory: [
      'The services, kernel, daemons, etc on your system are constantly doing something, this data is actually sent to be saved on your system in the form of logs.',
      'This allows us to have a human readable journal of the events that are happening on our system. This data is usually kept in the /var directory, the /var directory is where we keep our variable data, such as logs!',
      'How are these messages even getting received on your system? There is a service called syslog that sends this information to the system logger.',
      'Syslog actually contains many components, one of the important ones is a daemon running called syslogd (newer Linux distributions use rsyslogd), that waits for event messages to occur and filter the ones it wants to know about, and depending on what it\'s supposed to do with that message, it will send it to a file, your console or do nothing with it.',
      'You would think that this system logger is the centralized place to manage logs, but unfortunately it\'s not. You\'ll see many applications that write their own logging rules and generate different log files, however in general the format of logs should include a timestamp and the event details.',
      'Here is an example of a line from syslog: "less /var/log/syslog" Jan 27 07:41:32 icebox anacron[4650]: Job `cron.weekly\' started',
      'Here we can see that at Jan 27 07:41:32 our cron service ran the cron.weekly job. You can view all the event messages that syslog collects with in the /var/log/syslog file.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘System Logging’ cover?',
        'System Logging',
        ['System Logging', 'Syslog', 'General Logging', 'Kernel Logging'],
        'This lesson is ‘System Logging’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: less /var/log/syslog',
        ['less', '/var/log/syslog'],
        ['less', '/var/log/syslog', 'sudo', '-la'],
        'Type it exactly as shown: less /var/log/syslog. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The services, kernel, daemons, etc on your system are constantly doing something, this data is actually sent to be saved on your system in the form of logs.” — which lesson is this?',
        'System Logging',
        ['System Logging', 'Syslog', 'General Logging', 'Kernel Logging'],
        'Those opening lines are from ‘System Logging’.'
      ),
      MCQ(
        'The lesson continues with: “This allows us to have a human readable journal of the events that are happening on our system. This data is usually kept in the /var directory, the /var direc…” — which lesson is this?',
        'System Logging',
        ['System Logging', 'Syslog', 'General Logging', 'Kernel Logging'],
        'Those lines are from ‘System Logging’.'
      ),
    ],
  },
  'linux-logging-2': {
    id: 'linux-logging-2',
    title: 'Syslog',
    theory: [
      'The syslog service manages and sends logs to the system logger. Rsyslog is an advanced version of syslog, most Linux distributions should be using this new version. The output of all the logs the syslog service collects can be found at /var/log/syslog (every message except auth messages).',
      'To find out what files are maintained by our system logger, look at the configuration files in /etc/rsyslog.d: "less /etc/rsyslog.d/50-default.conf" # First some standard log files. Log by facility. # auth,authpriv.* /var/log/auth.log *.*;auth,authpriv.none -/var/log/syslog #cron.* /var/log/cron.log #daemon.* -/var/log/daemon.log kern.* -/var/log/kern.log #lpr.* -/var/log/lpr.log mail.* -/var/log/mail.log #user.* -/var/log/user.log',
      'These rules to log files are denoted by the selector on the left column and the action on the right column. The action tells us where to send the log information, in a file, console, etc.',
      'Remember not every application and service uses rsyslog to manage their logs, so if you want to know specifically what is logged you\'ll have to look inside this directory.',
      'Let\'s actually see logging in action, you can manually send a log with the logger command: "logger -s Hello"',
      'Now look inside your /var/log/syslog and you should see this entry in your logs!',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Syslog’ cover?',
        'Syslog',
        ['Syslog', 'System Logging', 'General Logging', 'Kernel Logging'],
        'This lesson is ‘Syslog’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: less /etc/rsyslog.d/50-default.conf',
        ['less', '/etc/rsyslog.d/50-default.conf'],
        ['less', '/etc/rsyslog.d/50-default.conf', 'sudo', '-la'],
        'Type it exactly as shown: less /etc/rsyslog.d/50-default.conf. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The syslog service manages and sends logs to the system logger. Rsyslog is an advanced version of syslog, most Linux distributions should be using this new ver…” — which lesson is this?',
        'Syslog',
        ['Syslog', 'System Logging', 'General Logging', 'Kernel Logging'],
        'Those opening lines are from ‘Syslog’.'
      ),
      BUILD(
        'Assemble another command from this lesson: logger -s Hello',
        ['logger', '-s', 'Hello'],
        ['logger', '-s', 'Hello', 'sudo', '-la'],
        'Type it exactly as shown: logger -s Hello.'
      ),
      MCQ(
        'The lesson continues with: “To find out what files are maintained by our system logger, look at the configuration files in /etc/rsyslog.d: "less /etc/rsyslog.d/50-default.conf" # First so…” — which lesson is this?',
        'Syslog',
        ['Syslog', 'System Logging', 'General Logging', 'Kernel Logging'],
        'Those lines are from ‘Syslog’.'
      ),
    ],
  },
  'linux-logging-3': {
    id: 'linux-logging-3',
    title: 'General Logging',
    theory: [
      'There are many log files you can view on your system, many important ones can be found under /var/log. We won\'t go through them all, but we\'ll discuss a couple of the major ones.',
      'There are two general log files you can view to get a glimpse of what your system is doing: "/var/log/messages"',
      'This log contains all non-critical and non-debug messages, includes messages logged during bootup (dmesg), auth, cron, daemon, etc. Very useful to get a glimpse of how your machine is acting.',
      '"/var/log/syslog"',
      'This logs everything except auth messages, it\'s extremely useful for debugging errors on your machine.',
      'These two logs should be more than enough when troubleshooting issues with your system, However, if you just want to view a specific log component, there are also separate logs for those as well.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘General Logging’ cover?',
        'General Logging',
        ['General Logging', 'System Logging', 'Syslog', 'Kernel Logging'],
        'This lesson is ‘General Logging’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “There are many log files you can view on your system, many important ones can be found under /var/log. We won\'t go through them all, but we\'ll discuss a couple…” — which lesson is this?',
        'General Logging',
        ['General Logging', 'System Logging', 'Syslog', 'Kernel Logging'],
        'Those opening lines are from ‘General Logging’.'
      ),
      MCQ(
        'The lesson continues with: “There are two general log files you can view to get a glimpse of what your system is doing: "/var/log/messages"” — which lesson is this?',
        'General Logging',
        ['General Logging', 'System Logging', 'Syslog', 'Kernel Logging'],
        'Those lines are from ‘General Logging’.'
      ),
    ],
  },
  'linux-logging-4': {
    id: 'linux-logging-4',
    title: 'Kernel Logging',
    theory: [
      '"/var/log/dmesg" On boot-time your system logs information about the kernel ring buffer. This shows us information about hardware drivers, kernel information and status during bootup and more.',
      'This log file can be found at /var/log/dmesg and gets reset on every boot, you may not actually see any use in it now, but if you were to ever have issues with something during bootup or a hardware issue, dmesg is the best place to look. You can also view this log using the dmesg command.',
      '"/var/log/kern.log" Another log you can use to view kernel information is the /var/log/kern.log file, this logs the kernel information and events on your system, it also logs dmesg output.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Kernel Logging’ cover?',
        'Kernel Logging',
        ['Kernel Logging', 'System Logging', 'Syslog', 'General Logging'],
        'This lesson is ‘Kernel Logging’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “"/var/log/dmesg" On boot-time your system logs information about the kernel ring buffer. This shows us information about hardware drivers, kernel information a…” — which lesson is this?',
        'Kernel Logging',
        ['Kernel Logging', 'System Logging', 'Syslog', 'General Logging'],
        'Those opening lines are from ‘Kernel Logging’.'
      ),
      MCQ(
        'The lesson continues with: “This log file can be found at /var/log/dmesg and gets reset on every boot, you may not actually see any use in it now, but if you were to ever have issues with…” — which lesson is this?',
        'Kernel Logging',
        ['Kernel Logging', 'System Logging', 'Syslog', 'General Logging'],
        'Those lines are from ‘Kernel Logging’.'
      ),
    ],
  },
  'linux-logging-5': {
    id: 'linux-logging-5',
    title: 'Authentication Logging',
    theory: [
      'Authentication logging can be very useful to look at if you are having issues logging in.',
      '"/var/log/auth.log" This contains system authorization logs, such as user login and the authentication method used.',
      'Sample snippet: Jan 31 10:37:50 icebox pkexec: pam_unix(polkit-1:session): session opened for user root by (uid=1000)',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Authentication Logging’ cover?',
        'Authentication Logging',
        ['Authentication Logging', 'System Logging', 'Syslog', 'General Logging'],
        'This lesson is ‘Authentication Logging’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Authentication logging can be very useful to look at if you are having issues logging in.” — which lesson is this?',
        'Authentication Logging',
        ['Authentication Logging', 'System Logging', 'Syslog', 'General Logging'],
        'Those opening lines are from ‘Authentication Logging’.'
      ),
      MCQ(
        'The lesson continues with: “"/var/log/auth.log" This contains system authorization logs, such as user login and the authentication method used.” — which lesson is this?',
        'Authentication Logging',
        ['Authentication Logging', 'System Logging', 'Syslog', 'General Logging'],
        'Those lines are from ‘Authentication Logging’.'
      ),
    ],
  },
  'linux-logging-6': {
    id: 'linux-logging-6',
    title: 'Managing Log Files',
    theory: [
      'Log files generate lots of data and they store this data on your hard disks, however there are lots of issues with this, for the most part we just want to be able to see newer logs, we also want to manage our disk space efficiently, so how do we do all of this? The answer is with logrotate.',
      'The logrotate utility does log management for us. It has a configuration file that allows us to specify how many and what logs to keep, how to compress our logs to save space and more. The logrotate tool is usually run out of cron once a day and the configuration files can be found in /etc/logrotate.d.',
      'There are other logrotating tools you can use to manage your logs, but logrotate is the most common one.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Managing Log Files’ cover?',
        'Managing Log Files',
        ['Managing Log Files', 'System Logging', 'Syslog', 'General Logging'],
        'This lesson is ‘Managing Log Files’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Log files generate lots of data and they store this data on your hard disks, however there are lots of issues with this, for the most part we just want to be a…” — which lesson is this?',
        'Managing Log Files',
        ['Managing Log Files', 'System Logging', 'Syslog', 'General Logging'],
        'Those opening lines are from ‘Managing Log Files’.'
      ),
      MCQ(
        'The lesson continues with: “The logrotate utility does log management for us. It has a configuration file that allows us to specify how many and what logs to keep, how to compress our log…” — which lesson is this?',
        'Managing Log Files',
        ['Managing Log Files', 'System Logging', 'Syslog', 'General Logging'],
        'Those lines are from ‘Managing Log Files’.'
      ),
    ],
  },
};
