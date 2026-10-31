/**
 * Track Linux · Grasshopper — Linux Journey course bank.
 *
 * Lesson theory verbatim from linuxjourney-desktop (GPL-3.0):
 * https://github.com/Sempiternal-Futility/linuxjourney-desktop
 * (fork of LinuxJourney.com). Quiz questions are original, derived from
 * each lesson's own text so every answer is provable from the theory.
 * SPDX-License-Identifier: GPL-3.0-only (this file).
 */

import { MCQ, BUILD, TEXT, type CourseLesson } from '../quizBank';

export const TRACK_LINUX_GRASSHOPPER: Record<string, CourseLesson> = {
  'linux-getting-started-1': {
    id: 'linux-getting-started-1',
    title: 'Linux History',
    theory: [
      'Hey rookie! So you decided to dive into this wonderful world known as Linux? Well you better strap in, because it’s gonna be a long and hard road. My name is Penguin Pete and I’m here to guide you through this journey. Let’s get started with a little bit of backstory about Linux.',
      'To learn about how Linux came to be, let’s go back to the beginning to 1969 where Ken Thompson and Dennis Ritchie of Bell Laboratories developed the UNIX operating system. It was later rewritten in C to make it more portable and eventually became a widely used operating system. A decade or so later, Richard Stallman started working on the GNU (GNU is Not UNIX) project, the GNU kernel called Hurd, which unfortunately never came to completion. The GNU General Public License (GPL), a free software license, was also created as a result of this.',
      'The kernel is the most important piece in the operating system. It allows the hardware to talk to the software. It also does a whole lot of other things, but we’ll dig into that in a different course. For now, just know that the kernel controls pretty much everything that happens on your system.',
      'During this time other efforts such as BSD, MINIX, etc were developed to be UNIX like-systems. However, one thing that all these UNIX like-systems had in common was the lack of a unified kernel.',
      'Then in 1991, a young fellow named Linus Torvalds started developing what we now know today as the Linux kernel.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Linux History’ cover?',
        'Linux History',
        ['Linux History', 'Choosing A Distro', 'Debian', 'Red Hat EnterPrise'],
        'This lesson is ‘Linux History’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Hey rookie! So you decided to dive into this wonderful world known as Linux? Well you better strap in, because it’s gonna be a long and hard road. My name is P…” — which lesson is this?',
        'Linux History',
        ['Linux History', 'Choosing A Distro', 'Debian', 'Red Hat EnterPrise'],
        'Those opening lines are from ‘Linux History’.'
      ),
      MCQ(
        'The lesson continues with: “To learn about how Linux came to be, let’s go back to the beginning to 1969 where Ken Thompson and Dennis Ritchie of Bell Laboratories developed the UNIX opera…” — which lesson is this?',
        'Linux History',
        ['Linux History', 'Choosing A Distro', 'Debian', 'Red Hat EnterPrise'],
        'Those lines are from ‘Linux History’.'
      ),
    ],
  },
  'linux-getting-started-2': {
    id: 'linux-getting-started-2',
    title: 'Choosing A Distro',
    theory: [
      'In the previous lesson, we learned about the Linux kernel which powers millions of devices a day. One thing before we move forward, the term Linux is actually quite a misnomer, since it actually refers to the Linux kernel. However, many distributions use the Linux kernel so therefore are commonly known as Linux operating systems.',
      'A Linux system is divided into three main parts:',
      'Hardware - This includes all the hardware that your system runs on as well as memory, CPU, disks, etc. Linux Kernel - As we discussed above, the kernel is the core of the operating system. It manages the hardware and tells it how to interact with the system. User Space - This is where users like yourself will be directly interacting with the system.',
      'So the first step we’ll need to take is to install Linux on your machine. You have many options to choose from and this course will help inform you and get you started on choosing a Linux distribution.',
      'There are many Linux distributions to choose from, we’ll just go over the most popular options.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Choosing A Distro’ cover?',
        'Choosing A Distro',
        ['Choosing A Distro', 'Linux History', 'Debian', 'Red Hat EnterPrise'],
        'This lesson is ‘Choosing A Distro’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “In the previous lesson, we learned about the Linux kernel which powers millions of devices a day. One thing before we move forward, the term Linux is actually…” — which lesson is this?',
        'Choosing A Distro',
        ['Choosing A Distro', 'Linux History', 'Debian', 'Red Hat EnterPrise'],
        'Those opening lines are from ‘Choosing A Distro’.'
      ),
      MCQ(
        'The lesson continues with: “A Linux system is divided into three main parts:” — which lesson is this?',
        'Choosing A Distro',
        ['Choosing A Distro', 'Linux History', 'Debian', 'Red Hat EnterPrise'],
        'Those lines are from ‘Choosing A Distro’.'
      ),
    ],
  },
  'linux-getting-started-3': {
    id: 'linux-getting-started-3',
    title: 'Debian',
    theory: [
      'Debian is an operating system composed entirely of free and open-source software. It’s widely known and has been in development for over 20 years. There are three branches that you can use, Stable, Testing and Unstable.',
      'Stable is an overall good branch to be on. Testing and Unstable are rolling releases. This means that any incremental changes in those branches will eventually become Stable. For example, if you wanted to get to the next update from Windows 8 to Windows 10, you’ll have to do a complete Windows 10 installation. However being on the Testing release, you’ll automatically get updates until it becomes the next operating system release without having to do a full installation.',
      'Package Management: Debian also uses Debian package management tools. Every Linux distribution installs and manages packages differently and they use different package management tools. We’ll get more into this in a later course.',
      'Configurability: Debian may not get the latest updates, but it\'s extremely stable. If you want a good "core" operating system, this is the one for you.',
      'Debian is an overall great operating system for any platform.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Debian’ cover?',
        'Debian',
        ['Debian', 'Linux History', 'Choosing A Distro', 'Red Hat EnterPrise'],
        'This lesson is ‘Debian’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Debian is an operating system composed entirely of free and open-source software. It’s widely known and has been in development for over 20 years. There are th…” — which lesson is this?',
        'Debian',
        ['Debian', 'Linux History', 'Choosing A Distro', 'Red Hat EnterPrise'],
        'Those opening lines are from ‘Debian’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Debian’ lesson?',
        'core',
        ['core', 'echo Hello World', 'pwd', 'cd /home/pete/Pictures'],
        'The ‘Debian’ lesson mentions “core” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “Stable is an overall good branch to be on. Testing and Unstable are rolling releases. This means that any incremental changes in those branches will eventually…” — which lesson is this?',
        'Debian',
        ['Debian', 'Linux History', 'Choosing A Distro', 'Red Hat EnterPrise'],
        'Those lines are from ‘Debian’.'
      ),
    ],
  },
  'linux-getting-started-4': {
    id: 'linux-getting-started-4',
    title: 'Red Hat EnterPrise',
    theory: [
      'Red Hat Enterprise Linux commonly referred to as RHEL is developed by Red Hat. RHEL has strict rules to restrict free re-distribution although it still provides source code for free.',
      'Package Management: RHEL uses a different package manager than Debian, RPM package manager, which we will eventually learn about as well.',
      'Configurability: RHEL-based operating systems will differ slightly from the Debian-based operating systems, most noticeably in package management. If you decide to go with RHEL it’s probably best if you know you’ll be working with it.',
      'Uses: As described by the name it\'s mostly used in enterprise, so if you need a solid server OS this would be a good one.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Red Hat EnterPrise’ cover?',
        'Red Hat EnterPrise',
        ['Red Hat EnterPrise', 'Linux History', 'Choosing A Distro', 'Debian'],
        'This lesson is ‘Red Hat EnterPrise’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Red Hat Enterprise Linux commonly referred to as RHEL is developed by Red Hat. RHEL has strict rules to restrict free re-distribution although it still provide…” — which lesson is this?',
        'Red Hat EnterPrise',
        ['Red Hat EnterPrise', 'Linux History', 'Choosing A Distro', 'Debian'],
        'Those opening lines are from ‘Red Hat EnterPrise’.'
      ),
      MCQ(
        'The lesson continues with: “Package Management: RHEL uses a different package manager than Debian, RPM package manager, which we will eventually learn about as well.” — which lesson is this?',
        'Red Hat EnterPrise',
        ['Red Hat EnterPrise', 'Linux History', 'Choosing A Distro', 'Debian'],
        'Those lines are from ‘Red Hat EnterPrise’.'
      ),
    ],
  },
  'linux-getting-started-5': {
    id: 'linux-getting-started-5',
    title: 'Ubuntu',
    theory: [
      'One of the most popular Linux distributions for personal machines is Ubuntu. Ubuntu also releases its own desktop environment manager Unity by default.',
      'Package Management: Ubuntu is a Debian-based operating system developed by Canonical. So it uses a core Debian package management system.',
      'Configurability: Ubuntu is a great choice for a beginner who wants to get into Linux. Ubuntu offers ease of use and a great user interface experience that has led to its wide adoption. It’s widely used and supported and is most like other operating systems like OSX and Windows in terms of usability.',
      'Uses: Great for any platform, desktop, laptop and server.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Ubuntu’ cover?',
        'Ubuntu',
        ['Ubuntu', 'Linux History', 'Choosing A Distro', 'Debian'],
        'This lesson is ‘Ubuntu’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “One of the most popular Linux distributions for personal machines is Ubuntu. Ubuntu also releases its own desktop environment manager Unity by default.” — which lesson is this?',
        'Ubuntu',
        ['Ubuntu', 'Linux History', 'Choosing A Distro', 'Debian'],
        'Those opening lines are from ‘Ubuntu’.'
      ),
      MCQ(
        'The lesson continues with: “Package Management: Ubuntu is a Debian-based operating system developed by Canonical. So it uses a core Debian package management system.” — which lesson is this?',
        'Ubuntu',
        ['Ubuntu', 'Linux History', 'Choosing A Distro', 'Debian'],
        'Those lines are from ‘Ubuntu’.'
      ),
    ],
  },
  'linux-getting-started-6': {
    id: 'linux-getting-started-6',
    title: 'Fedora',
    theory: [
      'Backed by Red Hat, the Fedora Project is community driven containing open-source and free software. Red Hat Enterprise Linux branches off Fedora, so think of Fedora as an upstream RHEL operating system. Eventually RHEL will get updates from Fedora after thorough testing and quality assurance. Think of Fedora as an Ubuntu equivalent that uses a Red Hat backend instead of Debian.',
      'Package Management: Uses Red Hat package manager.',
      'Configurability: If you want to use a Red Hat based operating system, this is a user friendly version.',
      'Uses: Fedora is great if you want a Red Hat based operating system without the price tag. Recommended for desktop and laptop.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Fedora’ cover?',
        'Fedora',
        ['Fedora', 'Linux History', 'Choosing A Distro', 'Debian'],
        'This lesson is ‘Fedora’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Backed by Red Hat, the Fedora Project is community driven containing open-source and free software. Red Hat Enterprise Linux branches off Fedora, so think of F…” — which lesson is this?',
        'Fedora',
        ['Fedora', 'Linux History', 'Choosing A Distro', 'Debian'],
        'Those opening lines are from ‘Fedora’.'
      ),
      MCQ(
        'The lesson continues with: “Package Management: Uses Red Hat package manager.” — which lesson is this?',
        'Fedora',
        ['Fedora', 'Linux History', 'Choosing A Distro', 'Debian'],
        'Those lines are from ‘Fedora’.'
      ),
    ],
  },
  'linux-getting-started-7': {
    id: 'linux-getting-started-7',
    title: 'Linux Mint',
    theory: [
      'Linux Mint is based off of Ubuntu. It uses Ubuntu’s software repositories so the same packages are available on both distributions. Linux Mint is preferred by others over Ubuntu because it doesn’t come with some of the proprietary software that Ubuntu includes such as Unity.',
      'Package Management: Since Linux Mint is Ubuntu based, it uses the Debian package manager.',
      'Configurability: Great user interface, great for beginners and less bloated than Ubuntu. In this course, I’ll be using Linux Mint, but any other distribution can be used.',
      'Uses: Great for desktop and laptop.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Linux Mint’ cover?',
        'Linux Mint',
        ['Linux Mint', 'Linux History', 'Choosing A Distro', 'Debian'],
        'This lesson is ‘Linux Mint’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Linux Mint is based off of Ubuntu. It uses Ubuntu’s software repositories so the same packages are available on both distributions. Linux Mint is preferred by…” — which lesson is this?',
        'Linux Mint',
        ['Linux Mint', 'Linux History', 'Choosing A Distro', 'Debian'],
        'Those opening lines are from ‘Linux Mint’.'
      ),
      MCQ(
        'The lesson continues with: “Package Management: Since Linux Mint is Ubuntu based, it uses the Debian package manager.” — which lesson is this?',
        'Linux Mint',
        ['Linux Mint', 'Linux History', 'Choosing A Distro', 'Debian'],
        'Those lines are from ‘Linux Mint’.'
      ),
    ],
  },
  'linux-getting-started-8': {
    id: 'linux-getting-started-8',
    title: 'Gentoo',
    theory: [
      'Gentoo offers ridiculous flexibility with the operating system at a price. It’s made for advanced users who don’t mind getting their hands dirty with the system.',
      'Package Management: Gentoo uses its own package management, Portage. The Portage package management is very modular and easy to maintain, which plays a big part in the operating system as a whole being very flexible.',
      'Configurability: If you’re just getting started with Linux and want to take a more difficult path, I’d choose Gentoo or Arch Linux as your distribution.',
      'Uses: Great for desktop and laptop.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Gentoo’ cover?',
        'Gentoo',
        ['Gentoo', 'Linux History', 'Choosing A Distro', 'Debian'],
        'This lesson is ‘Gentoo’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Gentoo offers ridiculous flexibility with the operating system at a price. It’s made for advanced users who don’t mind getting their hands dirty with the syste…” — which lesson is this?',
        'Gentoo',
        ['Gentoo', 'Linux History', 'Choosing A Distro', 'Debian'],
        'Those opening lines are from ‘Gentoo’.'
      ),
      MCQ(
        'The lesson continues with: “Package Management: Gentoo uses its own package management, Portage. The Portage package management is very modular and easy to maintain, which plays a big par…” — which lesson is this?',
        'Gentoo',
        ['Gentoo', 'Linux History', 'Choosing A Distro', 'Debian'],
        'Those lines are from ‘Gentoo’.'
      ),
    ],
  },
  'linux-getting-started-9': {
    id: 'linux-getting-started-9',
    title: 'Arch Linux',
    theory: [
      'Arch is a lightweight and flexible Linux distribution driven 100% by the community. Similar to Debian, Arch uses a rolling release model so incremental updates eventually become the Stable release. You really need to get your hands dirty to understand the system and its functions, but in turn you get complete and total control of your system.',
      'Package Management: It uses its own package manager, Pacman, to install, update and manage packages.',
      'Configurability: If you want a lightweight operating system and really want to understand Linux use Arch! There’s a bit of a learning curve, but for the hardcore Linux users, this is a great choice.',
      'Uses: Great for desktop and laptop. If you also have a small device such as a Raspberry Pi and need to stick a lightweight OS on it, you can’t go wrong with Arch.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Arch Linux’ cover?',
        'Arch Linux',
        ['Arch Linux', 'Linux History', 'Choosing A Distro', 'Debian'],
        'This lesson is ‘Arch Linux’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Arch is a lightweight and flexible Linux distribution driven 100% by the community. Similar to Debian, Arch uses a rolling release model so incremental updates…” — which lesson is this?',
        'Arch Linux',
        ['Arch Linux', 'Linux History', 'Choosing A Distro', 'Debian'],
        'Those opening lines are from ‘Arch Linux’.'
      ),
      MCQ(
        'The lesson continues with: “Package Management: It uses its own package manager, Pacman, to install, update and manage packages.” — which lesson is this?',
        'Arch Linux',
        ['Arch Linux', 'Linux History', 'Choosing A Distro', 'Debian'],
        'Those lines are from ‘Arch Linux’.'
      ),
    ],
  },
  'linux-getting-started-10': {
    id: 'linux-getting-started-10',
    title: 'OpenSuse',
    theory: [
      'openSUSE Linux is created by the openSUSE Project. A community that promotes the use of Linux everywhere, working together in an open, transparent and friendly manner as part of the worldwide Free and Open Source Software community. openSUSE is the second oldest still running Linux Distributions and shares the base system with SUSE\'s award-winning SUSE Linux Enterprise products.',
      'Package Management: Uses RPM package manager.',
      'Configurability: openSUSE is a great choice for a new Linux user. It offers an easy to use graphical installer/administration application and a tiday base system, easy to tinker with. openSUSE includes everything you need to enjoy the Internet worry free of viruses/spy-ware and to live out your creativity, be it with your photos, videos, music or code.',
      'Uses: openSUSE Leap is fully capable of being used on a desktop PC and laptop.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘OpenSuse’ cover?',
        'OpenSuse',
        ['OpenSuse', 'Linux History', 'Choosing A Distro', 'Debian'],
        'This lesson is ‘OpenSuse’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “openSUSE Linux is created by the openSUSE Project. A community that promotes the use of Linux everywhere, working together in an open, transparent and friendly…” — which lesson is this?',
        'OpenSuse',
        ['OpenSuse', 'Linux History', 'Choosing A Distro', 'Debian'],
        'Those opening lines are from ‘OpenSuse’.'
      ),
      MCQ(
        'The lesson continues with: “Package Management: Uses RPM package manager.” — which lesson is this?',
        'OpenSuse',
        ['OpenSuse', 'Linux History', 'Choosing A Distro', 'Debian'],
        'Those lines are from ‘OpenSuse’.'
      ),
    ],
  },
  'linux-command-line-1': {
    id: 'linux-command-line-1',
    title: 'The Shell',
    theory: [
      'The world is your oyster, or really the shell is your oyster. What is the shell? The shell is basically a program that takes your commands from the keyboard and sends them to the operating system to perform. If you’ve ever used a GUI, you’ve probably seen programs such as “Terminal” or “Console” these are just programs that launch a shell for you. Throughout this entire course we will be learning about the wonders of the shell.',
      'In this course we will use the shell program bash (Bourne Again shell). Almost all Linux distributions will default to the bash shell. There are other shells available such as ksh, zsh, tsch, but we won’t get into any of those.',
      'Let’s jump right in! Depending on the distribution your shell prompt might change, but for the most part it should adhere to the following format: username@hostname:current_directory pete@icebox:/home/pete $',
      'Notice the $ at the end of the prompt? Different shells will have different prompts, in our case the $ is for a normal user using Bash, Bourne or Korn shell. You don\'t add the prompt symbol when you type the command, just know that it\'s there.',
      'Let’s start with a simple command, echo. The echo command just prints out the text arguments to the display.',
      '"echo Hello World"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘The Shell’ cover?',
        'The Shell',
        ['The Shell', 'Pwd Command', 'Cd Command', 'Ls Command'],
        'This lesson is ‘The Shell’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: echo Hello World',
        ['echo', 'Hello', 'World'],
        ['echo', 'Hello', 'World', 'sudo', '-la'],
        'Type it exactly as shown: echo Hello World. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The world is your oyster, or really the shell is your oyster. What is the shell? The shell is basically a program that takes your commands from the keyboard an…” — which lesson is this?',
        'The Shell',
        ['The Shell', 'Pwd Command', 'Cd Command', 'Ls Command'],
        'Those opening lines are from ‘The Shell’.'
      ),
      MCQ(
        'The lesson continues with: “In this course we will use the shell program bash (Bourne Again shell). Almost all Linux distributions will default to the bash shell. There are other shells a…” — which lesson is this?',
        'The Shell',
        ['The Shell', 'Pwd Command', 'Cd Command', 'Ls Command'],
        'Those lines are from ‘The Shell’.'
      ),
    ],
  },
  'linux-command-line-2': {
    id: 'linux-command-line-2',
    title: 'Pwd Command',
    theory: [
      'Everything in Linux is a file, as you journey deeper into Linux you’ll understand this, but for now just keep that in mind. Every file is organized in a hierarchical directory tree. The first directory in the filesystem is aptly named the root directory. The root directory has many folders and files which you can store more folders and files, etc. Here is an example of what the directory tree looks like:',
      '|-- bin | |-- file1 | |-- file2 |-- etc | |-- file3 | `-- directory1 | |-- file4 | `-- file5 |-- home |-- var',
      'The location of these files and directories are referred to as paths. If you had a folder named home with a folder inside of it named pete and another folder in that folder called Movies, that path would look like this: /home/pete/Movies, pretty simple huh?',
      'Navigation of the filesystem, much like real life is helpful if you know where you are and where you are going. To see where you are, you can use the pwd command, this command means “print working directory” and it just shows you which directory you are in, note the path stems from the root directory.',
      '"pwd"',
      'Where are you? Where am I? Give it a try!',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘Pwd Command’?',
        'pwd',
        ['pwd', 'cd', 'ls', 'touch'],
        'As the lesson puts it: “To see where you are, you can use the pwd command, this command means “print working directory” and it just shows you which directory you are in, note the path stems fro…”'
      ),
      TEXT(
        'Type the exact command that prints the current working directory.',
        ['pwd'],
        'pwd means print working directory — it prints the full path of where you are, starting at the root.',
        {
          placeholder: 'Type the command…',
          misconceptions: {
            'print working directory': 'That is what the command means — type the command itself.',
            ls: 'ls lists what is here; you need the command that reports where “here” is.',
            cd: 'cd changes directory — this command only reports the current one.',
            whereami: 'Close in spirit — the real command is three letters.',
            'pwd -l': 'Just the command on its own — pwd needs no arguments.',
          },
        }
      ),
      MCQ(
        'The lesson says: “To see where you are, you can use the pwd command, this command means “print working directory” and it just shows you which directory you are in, note the path stems fro…” — which command is being described?',
        'pwd',
        ['pwd', 'cd', 'ls', 'touch'],
        'The quoted sentence describes pwd.'
      ),
      MCQ(
        'The lesson continues with: “|-- bin | |-- file1 | |-- file2 |-- etc | |-- file3 | `-- directory1 | |-- file4 | `-- file5 |-- home |-- var” — which lesson is this?',
        'Pwd Command',
        ['Pwd Command', 'The Shell', 'Cd Command', 'Ls Command'],
        'Those lines are from ‘Pwd Command’.'
      ),
    ],
  },
  'linux-command-line-3': {
    id: 'linux-command-line-3',
    title: 'Cd Command',
    theory: [
      'Now that you know where you are, let’s see if we can move around the filesystem a bit. Remember we’ll need to navigate our way using paths. There are two different ways to specify a path, with absolute and relative paths.',
      'Absolute path: This is the path from the root directory. The root is the head honcho. The root directory is commonly shown as a slash. Every time your path starts with / it means you are starting from the root directory. For example, /home/pete/Desktop.',
      'Relative path: This is the path from where you are currently in filesystem. If I was in location /home/pete/Documents and wanted to get to a directory inside Documents called taxes, I don’t have to specify the whole path from root like /home/pete/Documents/taxes, I can just go to taxes/ instead.',
      'Now that you know how paths work, we just need something to help us change to the directory we want to. Luckily, we have cd or “change directory” to do that.',
      '"cd /home/pete/Pictures"',
      'So now I\'ve changed my directory location to /home/pete/Pictures.',
      'Now from this directory I have a folder inside called Hawaii, I can navigate to that folder with:',
      '"cd Hawaii"',
      'Notice how I just used the name of the folder? It’s because I was already in /home/pete/Pictures.',
      'It can get pretty tiring navigating with absolute and relative paths all the time, luckily there are some shortcuts to help you out.',
      '. (current directory). This is the directory you are currently in. </li> .. (previous directory). Takes you to the directory above your current.</li> ~ (home directory). This directory defaults to your “home directory”. Such as /home/pete.</li> - (previous directory). This will take you to the previous directory you were just at.</li>',
      '"cd ." "cd .." "cd ~" "cd -" Give them a try!',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘Cd Command’?',
        'cd',
        ['cd', 'pwd', 'ls', 'touch'],
        'As the lesson puts it: “Luckily, we have cd or “change directory” to do that.”'
      ),
      BUILD(
        'Assemble the command from this lesson: cd /home/pete/Pictures',
        ['cd', '/home/pete/Pictures'],
        ['cd', '/home/pete/Pictures', 'sudo', '-la'],
        'Type it exactly as shown: cd /home/pete/Pictures. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson says: “Luckily, we have cd or “change directory” to do that.” — which command is being described?',
        'cd',
        ['cd', 'pwd', 'ls', 'touch'],
        'The quoted sentence describes cd.'
      ),
      BUILD(
        'Assemble another command from this lesson: cd Hawaii',
        ['cd', 'Hawaii'],
        ['cd', 'Hawaii', 'sudo', '-la'],
        'Type it exactly as shown: cd Hawaii.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Cd Command’ lesson?',
        'cd .',
        ['cd .', 'core', 'echo Hello World', 'pwd'],
        'The ‘Cd Command’ lesson mentions “cd .” — find it in the theory above.'
      ),
    ],
  },
  'linux-command-line-4': {
    id: 'linux-command-line-4',
    title: 'Ls Command',
    theory: [
      'Now that we know how to move around the system, how do we figure out what is available to us? Right now it’s like we are moving around in the dark. Well, we can use the wonderful ls command to list directory contents. The ls command will list directories and files in the current directory by default, however you can specify which path you want to list the directories of.',
      '"ls" "ls /home/pete"',
      'ls is a quite useful tool, it also shows you detailed information about the files and directories you are looking at. Also note that not all files in a directory will be visible. Filenames that start with "." are hidden, you can view them however with the ls command and pass the -a flag to it (a for all).',
      '"ls -a"',
      'There is also one more useful ls flag, -l for long. This shows a detailed list of files in a long format. This will show you detailed information, starting from the left: file permissions, number of links, owner name, owner group, file size, timestamp of last modification, and file/directory name.',
      '"ls -l"',
      'pete@icebox:~$ ls -l total 80 drwxr-x--- 7 pete penguingroup 4096 Nov 20 16:37 Desktop drwxr-x--- 2 pete penguingroup 4096 Oct 19 10:46 Documents drwxr-x--- 4 pete penguingroup 4096 Nov 20 09:30 Downloads drwxr-x--- 2 pete penguingroup 4096 Oct 7 13:13 Music drwxr-x--- 2 pete penguingroup 4096 Sep 21 14:02 Pictures drwxr-x--- 2 pete penguingroup 4096 Jul 27 12:41 Public drwxr-x--- 2 pete penguingroup 4096 Jul 27 12:41 Templates drwxr-x--- 2 pete penguingroup 4096 Jul 27 12:41 Videos',
      'Commands have things called flags (or arguments or options, whatever you want to call it) to add more functionality. See how we added -a and -l, well you can add them both together with -la. The order of the flags determines which order it goes in, most of the time this doesn’t really matter so you can also do ls -al and it would still work.',
      '"ls -la"',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘Ls Command’?',
        'ls',
        ['ls', 'pwd', 'cd', 'touch'],
        'As the lesson puts it: “Well, we can use the wonderful ls command to list directory contents.”'
      ),
      BUILD(
        'Assemble the command from this lesson: ls /home/pete',
        ['ls', '/home/pete'],
        ['ls', '/home/pete', 'sudo', '-la'],
        'Type it exactly as shown: ls /home/pete. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson says: “Well, we can use the wonderful ls command to list directory contents.” — which command is being described?',
        'ls',
        ['ls', 'pwd', 'cd', 'touch'],
        'The quoted sentence describes ls.'
      ),
      BUILD(
        'Assemble another command from this lesson: ls -a',
        ['ls', '-a'],
        ['ls', '-a', 'sudo', '-la'],
        'Type it exactly as shown: ls -a.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Ls Command’ lesson?',
        'ls -l',
        ['ls -l', 'core', 'echo Hello World', 'pwd'],
        'The ‘Ls Command’ lesson mentions “ls -l” — find it in the theory above.'
      ),
    ],
  },
  'linux-command-line-5': {
    id: 'linux-command-line-5',
    title: 'Touch Command',
    theory: [
      'Let’s learn how to make some files. A very simple way is to use the touch command. Touch allows you to the create new empty files.',
      '"touch mysuperduperfile"',
      'And boom, new file!',
      'Touch is also used to change timestamps on existing files and directories. Give it a try, do an ls -l on a file and note the timestamp, then touch that file and it will update the timestamp.',
      'There are many other ways to create files that involve other things like redirection and text editors, but we’ll get to that in the Text Manipulation course.',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘Touch Command’?',
        'touch',
        ['touch', 'pwd', 'cd', 'ls'],
        'As the lesson puts it: “A very simple way is to use the touch command.”'
      ),
      BUILD(
        'Assemble the command from this lesson: touch mysuperduperfile',
        ['touch', 'mysuperduperfile'],
        ['touch', 'mysuperduperfile', 'sudo', '-la'],
        'Type it exactly as shown: touch mysuperduperfile. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson says: “A very simple way is to use the touch command.” — which command is being described?',
        'touch',
        ['touch', 'pwd', 'cd', 'ls'],
        'The quoted sentence describes touch.'
      ),
      MCQ(
        'The lesson continues with: “"touch mysuperduperfile"” — which lesson is this?',
        'Touch Command',
        ['Touch Command', 'The Shell', 'Pwd Command', 'Cd Command'],
        'Those lines are from ‘Touch Command’.'
      ),
      BUILD(
        'Type the command taught in ‘Touch Command’',
        ['touch'],
        ['touch', 'pwd', 'cd', 'ls'],
        'Just touch — the whole command is its name.'
      ),
    ],
  },
  'linux-command-line-6': {
    id: 'linux-command-line-6',
    title: 'File Command',
    theory: [
      'In the previous lesson we learned about touch, let’s go back to that for a bit. Did you notice that the filename didn’t conform to standard naming like you’ve probably seen with other operating systems like Windows? Normally you would expect a file called banana.jpeg and expect a JPEG picture file.',
      'In Linux, filenames aren’t required to represent the contents of the file. You can create a file called funny.gif that isn’t actually a GIF.',
      'To find out what kind of file a file is, you can use the file command. It will show you a description of the file’s contents.',
      '"file banana.jpg"',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘File Command’?',
        'file',
        ['file', 'pwd', 'cd', 'ls'],
        'As the lesson puts it: “Did you notice that the filename didn’t conform to standard naming like you’ve probably seen with other operating systems like Windows?”'
      ),
      BUILD(
        'Assemble the command from this lesson: file banana.jpg',
        ['file', 'banana.jpg'],
        ['file', 'banana.jpg', 'sudo', '-la'],
        'Type it exactly as shown: file banana.jpg. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson says: “Did you notice that the filename didn’t conform to standard naming like you’ve probably seen with other operating systems like Windows?” — which command is being described?',
        'file',
        ['file', 'pwd', 'cd', 'ls'],
        'The quoted sentence describes file.'
      ),
      MCQ(
        'The lesson continues with: “In Linux, filenames aren’t required to represent the contents of the file. You can create a file called funny.gif that isn’t actually a GIF.” — which lesson is this?',
        'File Command',
        ['File Command', 'The Shell', 'Pwd Command', 'Cd Command'],
        'Those lines are from ‘File Command’.'
      ),
      BUILD(
        'Type the command taught in ‘File Command’',
        ['file'],
        ['file', 'pwd', 'cd', 'ls'],
        'Just file — the whole command is its name.'
      ),
    ],
  },
  'linux-command-line-7': {
    id: 'linux-command-line-7',
    title: 'Cat Command',
    theory: [
      'We’re almost done navigating files, but first let’s learn how to read a file. A simple command to use is the cat command, short for concatenate. It not only displays file contents but it can combine multiple files and show you the output of them.',
      '"cat dogfile birdfile"',
      'It’s not great for viewing large files and it’s only meant for short content. There are many other tools that we use to view larger text files that we’ll discuss in the next lesson.',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘Cat Command’?',
        'cat',
        ['cat', 'pwd', 'cd', 'ls'],
        'As the lesson puts it: “A simple command to use is the cat command, short for concatenate.”'
      ),
      BUILD(
        'Assemble the command from this lesson: cat dogfile birdfile',
        ['cat', 'dogfile', 'birdfile'],
        ['cat', 'dogfile', 'birdfile', 'sudo', '-la'],
        'Type it exactly as shown: cat dogfile birdfile. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson says: “A simple command to use is the cat command, short for concatenate.” — which command is being described?',
        'cat',
        ['cat', 'pwd', 'cd', 'ls'],
        'The quoted sentence describes cat.'
      ),
      MCQ(
        'The lesson continues with: “"cat dogfile birdfile"” — which lesson is this?',
        'Cat Command',
        ['Cat Command', 'The Shell', 'Pwd Command', 'Cd Command'],
        'Those lines are from ‘Cat Command’.'
      ),
      BUILD(
        'Type the command taught in ‘Cat Command’',
        ['cat'],
        ['cat', 'pwd', 'cd', 'ls'],
        'Just cat — the whole command is its name.'
      ),
    ],
  },
  'linux-command-line-8': {
    id: 'linux-command-line-8',
    title: 'Less Command',
    theory: [
      'If you are viewing text files larger than a simple output, less is more. (There is actually a command called more that does something similar, so this is ironic.) The text is displayed in a paged manner, so you can navigate through a text file page by page.',
      'Go ahead and look at the contents of a file with less. Once you’re in the less command, you can actually use other keyboard commands to navigate in the file.',
      '"less /home/pete/Documents/text1"',
      'Use the following command to navigate through less:',
      'q - Used to quit out of less and go back to your shell. Page up, Page down, Up and Down - Navigate using the arrow keys and page keys. g - Moves to beginning of the text file. G - Moves to the end of the text file. /search - You can search for specific text inside the text document. Prefacing the words you want to search with / h - If you need a little help about how to use less while you’re in less, use help.',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘Less Command’?',
        'less',
        ['less', 'pwd', 'cd', 'ls'],
        'As the lesson puts it: “If you are viewing text files larger than a simple output, less is more.”'
      ),
      BUILD(
        'Assemble the command from this lesson: less /home/pete/Documents/text1',
        ['less', '/home/pete/Documents/text1'],
        ['less', '/home/pete/Documents/text1', 'sudo', '-la'],
        'Type it exactly as shown: less /home/pete/Documents/text1. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson says: “If you are viewing text files larger than a simple output, less is more.” — which command is being described?',
        'less',
        ['less', 'pwd', 'cd', 'ls'],
        'The quoted sentence describes less.'
      ),
      MCQ(
        'The lesson continues with: “Go ahead and look at the contents of a file with less. Once you’re in the less command, you can actually use other keyboard commands to navigate in the file.” — which lesson is this?',
        'Less Command',
        ['Less Command', 'The Shell', 'Pwd Command', 'Cd Command'],
        'Those lines are from ‘Less Command’.'
      ),
      BUILD(
        'Type the command taught in ‘Less Command’',
        ['less'],
        ['less', 'pwd', 'cd', 'ls'],
        'Just less — the whole command is its name.'
      ),
    ],
  },
  'linux-command-line-9': {
    id: 'linux-command-line-9',
    title: 'History Command',
    theory: [
      'In your shell, there is a history of the commands that you previously entered, you can actually look through these commands. This is quite useful when you want to find and run a command you used previously without actually typing it again.',
      '"history"',
      'Want to run the same command you did before, just hit the up arrow. Want to run the previous command without typing it again? Use "!!". If you typed cat file1 and want to run it again, you can actually just go !! and it will run the last command you ran.',
      'Another history shortcut is ctrl-R, this is the reverse search command, if you hit ctrl-R and you start typing parts of the command you want it will show you matches and you can just navigate through them by hitting the ctrl-R key again. Once you found the command you want to use again, just hit the Enter key.',
      'Our terminal is getting a little cluttered no? Let’s do a little cleanup, use the clear command to clear up your display.',
      '"clear"',
      'There that looks better doesn’t it?',
      'While we are talking about useful things, one of the most useful features in any command-line environment is tab completion. If you start typing the beginning of a command, file, directory, etc and hit the Tab key, it will autocomplete based on what it finds in the directory you are searching as long as you don’t have any other files that start with those letters. For example if you were trying to run the command chrome, you can type chr and press Tab and it will autocomplete chrome.',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘History Command’?',
        'history',
        ['history', 'pwd', 'cd', 'ls'],
        'As the lesson puts it: “In your shell, there is a history of the commands that you previously entered, you can actually look through these commands.”'
      ),
      BUILD(
        'Type the command taught in ‘History Command’',
        ['history'],
        ['history', 'pwd', 'cd', 'ls'],
        'Just history — the whole command is its name.'
      ),
      MCQ(
        'The lesson says: “In your shell, there is a history of the commands that you previously entered, you can actually look through these commands.” — which command is being described?',
        'history',
        ['history', 'pwd', 'cd', 'ls'],
        'The quoted sentence describes history.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘History Command’ lesson?',
        'clear',
        ['clear', 'core', 'echo Hello World', 'pwd'],
        'The ‘History Command’ lesson mentions “clear” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “"history"” — which lesson is this?',
        'History Command',
        ['History Command', 'The Shell', 'Pwd Command', 'Cd Command'],
        'Those lines are from ‘History Command’.'
      ),
    ],
  },
  'linux-command-line-10': {
    id: 'linux-command-line-10',
    title: 'Cp Command',
    theory: [
      'Let’s start making some copies of these files. Much like copy and pasting files in other operating systems, the shell gives us an even simpler way of doing that.',
      '"cp mycoolfile /home/pete/Documents/cooldocs"',
      '"mycoolfile" is the file you want to copy and "/home/pete/Documents/cooldocs" is where you are copying the file to.',
      'You can copy multiple files and directories as well as use wildcards. A wildcard is a character that can be substituted for a pattern based selection, giving you more flexibility with searches. You can use wildcards in every command for more flexibility.',
      '* the wildcard of wildcards, it\'s used to represent all single characters or any string. ? used to represent one character [] used to represent any character within the brackets',
      '"cp *.jpg /home/pete/Pictures"',
      'This will copy all files with the .jpg extension in your current directory to the Pictures directory.',
      'A useful command is to use the -r flag, this will recursively copy the files and directories within a directory.',
      'Try to do a cp on a directory that contains a couple of files to your Documents directory. Didn’t work did it? Well that’s because you’ll need to copy over the files and directories inside as well with -r command.',
      '"cp -r Pumpkin/ /home/pete/Documents"',
      'One thing to note, if you copy a file over to a directory that has the same filename, the file will be overwritten with whatever you are copying over. This is no bueno if you have a file that you don’t want to get accidentally overwritten. You can use the -i flag (interactive) to prompt you before overwriting a file.',
      '"cp -i mycoolfile /home/pete/Pictures"',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘Cp Command’?',
        'cp',
        ['cp', 'pwd', 'cd', 'ls'],
        'As the lesson puts it: “"cp mycoolfile /home/pete/Documents/cooldocs" "mycoolfile" is the file you want to copy and "/home/pete/Documents/cooldocs" is where you are copying the file to.”'
      ),
      BUILD(
        'Assemble the command from this lesson: cp mycoolfile /home/pete/Documents/cooldocs',
        ['cp', 'mycoolfile', '/home/pete/Documents/cooldocs'],
        ['cp', 'mycoolfile', '/home/pete/Documents/cooldocs', 'sudo', '-la'],
        'Type it exactly as shown: cp mycoolfile /home/pete/Documents/cooldocs. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson says: “"cp mycoolfile /home/pete/Documents/cooldocs" "mycoolfile" is the file you want to copy and "/home/pete/Documents/cooldocs" is where you are copying the file to.” — which command is being described?',
        'cp',
        ['cp', 'pwd', 'cd', 'ls'],
        'The quoted sentence describes cp.'
      ),
      BUILD(
        'Assemble another command from this lesson: cp *.jpg /home/pete/Pictures',
        ['cp', '*.jpg', '/home/pete/Pictures'],
        ['cp', '*.jpg', '/home/pete/Pictures', 'sudo', '-la'],
        'Type it exactly as shown: cp *.jpg /home/pete/Pictures.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Cp Command’ lesson?',
        'cp -r Pumpkin/ /home/pete/Documents',
        ['cp -r Pumpkin/ /home/pete/Documents', 'core', 'echo Hello World', 'pwd'],
        'The ‘Cp Command’ lesson mentions “cp -r Pumpkin/ /home/pete/Documents” — find it in the theory above.'
      ),
    ],
  },
  'linux-command-line-11': {
    id: 'linux-command-line-11',
    title: 'Mv Command',
    theory: [
      'Used for moving files and also renaming them. Quite similar to the cp command in terms of flags and functionality.',
      'You can rename files like this:',
      '"mv oldfile newfile"',
      'Or you can actually move a file to a different directory:',
      '"mv file2 /home/pete/Documents"',
      'And move more than one file:',
      '"mv file_1 file_2 /somedirectory"',
      'You can rename directories as well:',
      '"mv directory1 directory2"',
      'Like cp, if you mv a file or directory it will overwrite anything in the same directory. So you can use the -i flag to prompt you before overwriting anything.',
      '"mv -i directory1 directory2"',
      'Let’s say you did want to mv a file to overwrite the previous one. You can also make a backup of that file and it will just rename the old version with a ~.',
      '"mv -b directory1 directory2"',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘Mv Command’?',
        'mv',
        ['mv', 'pwd', 'cd', 'ls'],
        'As the lesson puts it: “You can rename files like this: "mv oldfile newfile" Or you can actually move a file to a different directory: "mv file2 /home/pete/Documents" And move more than one fil…”'
      ),
      BUILD(
        'Assemble the command from this lesson: mv oldfile newfile',
        ['mv', 'oldfile', 'newfile'],
        ['mv', 'oldfile', 'newfile', 'sudo', '-la'],
        'Type it exactly as shown: mv oldfile newfile. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson says: “You can rename files like this: "mv oldfile newfile" Or you can actually move a file to a different directory: "mv file2 /home/pete/Documents" And move more than one fil…” — which command is being described?',
        'mv',
        ['mv', 'pwd', 'cd', 'ls'],
        'The quoted sentence describes mv.'
      ),
      BUILD(
        'Assemble another command from this lesson: mv file2 /home/pete/Documents',
        ['mv', 'file2', '/home/pete/Documents'],
        ['mv', 'file2', '/home/pete/Documents', 'sudo', '-la'],
        'Type it exactly as shown: mv file2 /home/pete/Documents.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Mv Command’ lesson?',
        'mv file_1 file_2 /somedirectory',
        ['mv file_1 file_2 /somedirectory', 'core', 'echo Hello World', 'pwd'],
        'The ‘Mv Command’ lesson mentions “mv file_1 file_2 /somedirectory” — find it in the theory above.'
      ),
    ],
  },
  'linux-command-line-12': {
    id: 'linux-command-line-12',
    title: 'Mkdir Command',
    theory: [
      'We’re gonna need some directories to store all these files we’ve been working on. The mkdir command (Make Directory) is useful for that, it will create a directory if it doesn’t already exist. You can even make multiple directories at the same time.',
      '"mkdir books paintings"',
      'You can also create subdirectories at the same time with the -p (parent flag).',
      '"mkdir -p books/hemmingway/favorites"',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘Mkdir Command’?',
        'mkdir',
        ['mkdir', 'pwd', 'cd', 'ls'],
        'As the lesson puts it: “The mkdir command (Make Directory) is useful for that, it will create a directory if it doesn’t already exist.”'
      ),
      BUILD(
        'Assemble the command from this lesson: mkdir books paintings',
        ['mkdir', 'books', 'paintings'],
        ['mkdir', 'books', 'paintings', 'sudo', '-la'],
        'Type it exactly as shown: mkdir books paintings. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson says: “The mkdir command (Make Directory) is useful for that, it will create a directory if it doesn’t already exist.” — which command is being described?',
        'mkdir',
        ['mkdir', 'pwd', 'cd', 'ls'],
        'The quoted sentence describes mkdir.'
      ),
      BUILD(
        'Assemble another command from this lesson: mkdir -p books/hemmingway/favorites',
        ['mkdir', '-p', 'books/hemmingway/favorites'],
        ['mkdir', '-p', 'books/hemmingway/favorites', 'sudo', '-la'],
        'Type it exactly as shown: mkdir -p books/hemmingway/favorites.'
      ),
      MCQ(
        'The lesson continues with: “"mkdir books paintings"” — which lesson is this?',
        'Mkdir Command',
        ['Mkdir Command', 'The Shell', 'Pwd Command', 'Cd Command'],
        'Those lines are from ‘Mkdir Command’.'
      ),
    ],
  },
  'linux-command-line-13': {
    id: 'linux-command-line-13',
    title: 'Rm Command',
    theory: [
      'Now I think we have too many files, let’s remove some files. To remove files you can use the rm command. The rm (remove) command is used to delete files and directories.',
      '"rm file1"',
      'Take caution when using rm, there is no magical trash can that you can fish out removed files. Once they are gone, they are gone for good, so be careful.',
      'Fortunately there are some safety measures put into place, so the average joe can’t just remove a bunch of important files. Write-protected files will prompt you for confirmation before deleting them. If a directory is write-protected it will also not be easily removed.',
      'Now if you don’t care about any of that, you can absolutely remove a bunch of files.',
      '"rm -f file1" -f or force option tells rm to remove all files, whether they are write protected or not, without prompting the user (as long as you have the appropriate permissions).',
      '"rm -i file" Adding the -i flag like many of the other commands, will give you a prompt on whether you want to actually remove the files or directories.',
      '"rm -r directory" You can’t just rm a directory by default, you’ll need to add the -r flag (recursive) to remove all the files and any subdirectories it may have.',
      'You can remove a directory with the rmdir command. "rmdir directory"',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘Rm Command’?',
        'rm',
        ['rm', 'pwd', 'cd', 'ls'],
        'As the lesson puts it: “To remove files you can use the rm command.”'
      ),
      BUILD(
        'Assemble the command from this lesson: rm file1',
        ['rm', 'file1'],
        ['rm', 'file1', 'sudo', '-la'],
        'Type it exactly as shown: rm file1. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson says: “To remove files you can use the rm command.” — which command is being described?',
        'rm',
        ['rm', 'pwd', 'cd', 'ls'],
        'The quoted sentence describes rm.'
      ),
      BUILD(
        'Assemble another command from this lesson: rm -f file1',
        ['rm', '-f', 'file1'],
        ['rm', '-f', 'file1', 'sudo', '-la'],
        'Type it exactly as shown: rm -f file1.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Rm Command’ lesson?',
        'rm -i file',
        ['rm -i file', 'core', 'echo Hello World', 'pwd'],
        'The ‘Rm Command’ lesson mentions “rm -i file” — find it in the theory above.'
      ),
    ],
  },
  'linux-command-line-14': {
    id: 'linux-command-line-14',
    title: 'Find Command',
    theory: [
      'With all these files we have on the system it can get a little hectic trying to find a specific one. Well there’s a command we can use for that, find!',
      '"find /home -name puppies.jpg"',
      'With find you’ll have to specify the directory you’ll be searching it, what you’re searching for. In this case we are trying to find a file by the name of puppies.jpg.',
      'You can specify what type of file you are trying to find.',
      '"find /home -type d -name MyFolder"',
      'You can see that I set the type of file I’m trying to find as (d) for directory and I’m still searching by the name of MyFolder.',
      'One cool thing to note is that find doesn’t stop at the directory you are searching. It will look inside any subdirectories that directory may have as well.',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘Find Command’?',
        'find',
        ['find', 'pwd', 'cd', 'ls'],
        'As the lesson puts it: “With all these files we have on the system it can get a little hectic trying to find a specific one.”'
      ),
      BUILD(
        'Assemble the command from this lesson: find /home -name puppies.jpg',
        ['find', '/home', '-name', 'puppies.jpg'],
        ['find', '/home', '-name', 'puppies.jpg', 'sudo', '-la'],
        'Type it exactly as shown: find /home -name puppies.jpg. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson says: “With all these files we have on the system it can get a little hectic trying to find a specific one.” — which command is being described?',
        'find',
        ['find', 'pwd', 'cd', 'ls'],
        'The quoted sentence describes find.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Find Command’ lesson?',
        'find /home -type d -name MyFolder',
        ['find /home -type d -name MyFolder', 'core', 'echo Hello World', 'pwd'],
        'The ‘Find Command’ lesson mentions “find /home -type d -name MyFolder” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “"find /home -name puppies.jpg"” — which lesson is this?',
        'Find Command',
        ['Find Command', 'The Shell', 'Pwd Command', 'Cd Command'],
        'Those lines are from ‘Find Command’.'
      ),
    ],
  },
  'linux-command-line-15': {
    id: 'linux-command-line-15',
    title: 'Help Command',
    theory: [
      'Linux has some great built-in tools to help you how to use a command or check what flags are available for a command. One tool, help, is a built-in bash command that provides help for other bash commands (echo, logout, pwd, etc).',
      '"help echo"',
      'This will give you a description and the options you can use when you want to run echo. For other executable programs, it’s convention to have an option called --help or something similar.',
      '"echo --help"',
      'Not all developers who ship out executables will conform to this standard, but it’s probably your best shot to find some help on a program.',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘Help Command’?',
        'help',
        ['help', 'pwd', 'cd', 'ls'],
        'As the lesson puts it: “Linux has some great built-in tools to help you how to use a command or check what flags are available for a command.”'
      ),
      BUILD(
        'Assemble the command from this lesson: help echo',
        ['help', 'echo'],
        ['help', 'echo', 'sudo', '-la'],
        'Type it exactly as shown: help echo. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson says: “Linux has some great built-in tools to help you how to use a command or check what flags are available for a command.” — which command is being described?',
        'help',
        ['help', 'pwd', 'cd', 'ls'],
        'The quoted sentence describes help.'
      ),
      BUILD(
        'Assemble another command from this lesson: echo --help',
        ['echo', '--help'],
        ['echo', '--help', 'sudo', '-la'],
        'Type it exactly as shown: echo --help.'
      ),
      MCQ(
        'The lesson continues with: “"help echo"” — which lesson is this?',
        'Help Command',
        ['Help Command', 'The Shell', 'Pwd Command', 'Cd Command'],
        'Those lines are from ‘Help Command’.'
      ),
    ],
  },
  'linux-command-line-16': {
    id: 'linux-command-line-16',
    title: 'Man Command',
    theory: [
      'Gee I wish some of these programs had a manual so we can see some more information about them. Well luckily they do! Aptly named man pages, you can see the manuals for a command with the man command.',
      '"man ls"',
      'Man pages are manuals that are by default built into most Linux operating systems. They provide documentation about commands and other aspects of the system.',
      'Try it out on a few commands to get more information about them.',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘Man Command’?',
        'man',
        ['man', 'pwd', 'cd', 'ls'],
        'As the lesson puts it: “Gee I wish some of these programs had a manual so we can see some more information about them.”'
      ),
      BUILD(
        'Assemble the command from this lesson: man ls',
        ['man', 'ls'],
        ['man', 'ls', 'sudo', '-la'],
        'Type it exactly as shown: man ls. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson says: “Gee I wish some of these programs had a manual so we can see some more information about them.” — which command is being described?',
        'man',
        ['man', 'pwd', 'cd', 'ls'],
        'The quoted sentence describes man.'
      ),
      MCQ(
        'The lesson continues with: “"man ls"” — which lesson is this?',
        'Man Command',
        ['Man Command', 'The Shell', 'Pwd Command', 'Cd Command'],
        'Those lines are from ‘Man Command’.'
      ),
      BUILD(
        'Type the command taught in ‘Man Command’',
        ['man'],
        ['man', 'pwd', 'cd', 'ls'],
        'Just man — the whole command is its name.'
      ),
    ],
  },
  'linux-command-line-17': {
    id: 'linux-command-line-17',
    title: 'Whatis Command',
    theory: [
      'Whew, we’ve learned quite a bit of commands so far, if you are ever feeling doubtful about what a command does, you can use the whatis command. The whatis command provides a brief description of command line programs.',
      '"whatis cat"',
      'The description gets sourced from the manual page of each command. If you ran whatis cat, you’d see there is a small blurb with a short description.',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘Whatis Command’?',
        'whatis',
        ['whatis', 'pwd', 'cd', 'ls'],
        'As the lesson puts it: “Whew, we’ve learned quite a bit of commands so far, if you are ever feeling doubtful about what a command does, you can use the whatis command.”'
      ),
      BUILD(
        'Assemble the command from this lesson: whatis cat',
        ['whatis', 'cat'],
        ['whatis', 'cat', 'sudo', '-la'],
        'Type it exactly as shown: whatis cat. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson says: “Whew, we’ve learned quite a bit of commands so far, if you are ever feeling doubtful about what a command does, you can use the whatis command.” — which command is being described?',
        'whatis',
        ['whatis', 'pwd', 'cd', 'ls'],
        'The quoted sentence describes whatis.'
      ),
      MCQ(
        'The lesson continues with: “"whatis cat"” — which lesson is this?',
        'Whatis Command',
        ['Whatis Command', 'The Shell', 'Pwd Command', 'Cd Command'],
        'Those lines are from ‘Whatis Command’.'
      ),
      BUILD(
        'Type the command taught in ‘Whatis Command’',
        ['whatis'],
        ['whatis', 'pwd', 'cd', 'ls'],
        'Just whatis — the whole command is its name.'
      ),
    ],
  },
  'linux-command-line-18': {
    id: 'linux-command-line-18',
    title: 'Alias Command',
    theory: [
      'Sometimes typing commands can get really repetitive, or if you need to type a long command many times, it’s best to have an alias you can use for that. To create an alias for a command you simply specify an alias name and set it to the command.',
      '"alias foobar=\'ls -la\'"',
      'Now instead of typing ls -la, you can type foobar and it will execute that command, pretty neat stuff. Keep in mind that this command won\'t save your alias after reboot, so you\'ll need to add a permanent alias in:',
      '"~/.bashrc"',
      'or similar files if you want to have it persist after reboot.',
      'You can remove aliases with the unalias command:',
      '"unalias foobar"',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘Alias Command’?',
        'alias',
        ['alias', 'pwd', 'cd', 'ls'],
        'As the lesson puts it: “Sometimes typing commands can get really repetitive, or if you need to type a long command many times, it’s best to have an alias you can use for that.”'
      ),
      BUILD(
        'Assemble the command from this lesson: alias foobar=\'ls -la\'',
        ['alias', 'foobar=\'ls', '-la\''],
        ['alias', 'foobar=\'ls', '-la\'', 'sudo', '-la'],
        'Type it exactly as shown: alias foobar=\'ls -la\'. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson says: “Sometimes typing commands can get really repetitive, or if you need to type a long command many times, it’s best to have an alias you can use for that.” — which command is being described?',
        'alias',
        ['alias', 'pwd', 'cd', 'ls'],
        'The quoted sentence describes alias.'
      ),
      BUILD(
        'Assemble another command from this lesson: unalias foobar',
        ['unalias', 'foobar'],
        ['unalias', 'foobar', 'sudo', '-la'],
        'Type it exactly as shown: unalias foobar.'
      ),
      MCQ(
        'The lesson continues with: “"alias foobar=\'ls -la\'"” — which lesson is this?',
        'Alias Command',
        ['Alias Command', 'The Shell', 'Pwd Command', 'Cd Command'],
        'Those lines are from ‘Alias Command’.'
      ),
    ],
  },
  'linux-command-line-19': {
    id: 'linux-command-line-19',
    title: 'Exit Command',
    theory: [
      'Well, you sure did a good job getting through the basics. We’ve only scratched the surface, now that you’ve learned to crawl, in the next set of courses, I’m gonna teach how to walk.',
      'For now, you can pat yourself on the back and take a break. To exit from the shell, you can use the exit command',
      '"exit"',
      'Or the logout command:',
      '"logout"',
      'Or if you are working out of a terminal GUI, you can just close the terminal, see you in the next course!',
    ],
    questions: [
      MCQ(
        'Which command is the focus of ‘Exit Command’?',
        'exit',
        ['exit', 'pwd', 'cd', 'ls'],
        'As the lesson puts it: “To exit from the shell, you can use the exit command "exit" Or the logout command: "logout" Or if you are working out of a terminal GUI, you can just close the terminal,…”'
      ),
      BUILD(
        'Type the command taught in ‘Exit Command’',
        ['exit'],
        ['exit', 'pwd', 'cd', 'ls'],
        'Just exit — the whole command is its name.'
      ),
      MCQ(
        'The lesson says: “To exit from the shell, you can use the exit command "exit" Or the logout command: "logout" Or if you are working out of a terminal GUI, you can just close the terminal,…” — which command is being described?',
        'exit',
        ['exit', 'pwd', 'cd', 'ls'],
        'The quoted sentence describes exit.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Exit Command’ lesson?',
        'logout',
        ['logout', 'core', 'echo Hello World', 'pwd'],
        'The ‘Exit Command’ lesson mentions “logout” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “For now, you can pat yourself on the back and take a break. To exit from the shell, you can use the exit command” — which lesson is this?',
        'Exit Command',
        ['Exit Command', 'The Shell', 'Pwd Command', 'Cd Command'],
        'Those lines are from ‘Exit Command’.'
      ),
    ],
  },
  'linux-text-fu-1': {
    id: 'linux-text-fu-1',
    title: 'Stdout',
    theory: [
      'By now, we\'ve become familiar with many commands and their output and that brings us to our next subject I/O (input/output) streams. Let\'s run the following command and we\'ll discuss how this works.',
      '"echo Hello World > peanuts.txt"',
      'What just happened? Well check the directory where you ran that command and lo and behold you should see a file called peanuts.txt. Look inside that file and you should see the text Hello World. Lots of things just happened in one command so let\'s break it down.',
      'First let\'s break down the first part:',
      '"echo Hello World"',
      'We know this prints out Hello World to the screen, but how? Processes use I/O streams to receive input and return output. By default the echo command takes the input (standard input or stdin) from the keyboard and returns the output (standard output or stdout) to the screen. So that\'s why when you type echo Hello World in your shell, you get Hello World on the screen. However, I/O redirection allows us to change this default behavior giving us greater file flexibility.',
      'Let\'s proceed to the next part of the command:',
      '">"',
      'The ">" is a redirection operator that allows us the change where standard output goes. It allows us to send the output of echo Hello World to a file instead of the screen. If the file does not already exist it will create it for us. However, if it does exist it will overwrite it (you can add a shell flag to prevent this depending on what shell you are using).',
      'And that\'s basically how stdout redirection works!',
      'Well let\'s say I didn\'t want to overwrite my peanuts.txt, luckily there is a redirection operator for that as well, >>:',
      '"echo Hello World >> peanuts.txt"',
      'This will append Hello World to the end of the peanuts.txt file, if the file doesn\'t already exist it will create it for us like it did with the ">" redirector!',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Stdout’ cover?',
        'Stdout',
        ['Stdout', 'Stdin', 'Stderr', 'Pipe/Tee'],
        'This lesson is ‘Stdout’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: echo Hello World > peanuts.txt',
        ['echo', 'Hello', 'World', '>', 'peanuts.txt'],
        ['echo', 'Hello', 'World', '>', 'peanuts.txt', 'sudo', '-la'],
        'Type it exactly as shown: echo Hello World > peanuts.txt. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “By now, we\'ve become familiar with many commands and their output and that brings us to our next subject I/O (input/output) streams. Let\'s run the following co…” — which lesson is this?',
        'Stdout',
        ['Stdout', 'Stdin', 'Stderr', 'Pipe/Tee'],
        'Those opening lines are from ‘Stdout’.'
      ),
      BUILD(
        'Assemble another command from this lesson: echo Hello World',
        ['echo', 'Hello', 'World'],
        ['echo', 'Hello', 'World', 'sudo', '-la'],
        'Type it exactly as shown: echo Hello World.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Stdout’ lesson?',
        'echo Hello World >> peanuts.txt',
        ['echo Hello World >> peanuts.txt', 'core', 'pwd', 'cd /home/pete/Pictures'],
        'The ‘Stdout’ lesson mentions “echo Hello World >> peanuts.txt” — find it in the theory above.'
      ),
    ],
  },
  'linux-text-fu-2': {
    id: 'linux-text-fu-2',
    title: 'Stdin',
    theory: [
      'In our previous lesson we learned that we have different stdout streams we can use, such as a file or the screen. Well there are also different standard input (stdin) streams we can use as well. We know that we have stdin from devices like the keyboard, but we can use files, output from other processes and the terminal as well, let\'s see an example.',
      'Let\'s use the peanuts.txt file in the previous lesson for this example, remember it had the text Hello World in it.',
      '"cat < peanuts.txt > banana.txt"',
      'Just like we had ">" for stdout redirection, we can use "<" for stdin redirection.',
      'Normally in the cat command, you send a file to it and that file becomes the stdin, in this case, we redirected peanuts.txt to be our stdin. Then the output of cat peanuts.txt which would be Hello World gets redirected to another file called banana.txt.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Stdin’ cover?',
        'Stdin',
        ['Stdin', 'Stdout', 'Stderr', 'Pipe/Tee'],
        'This lesson is ‘Stdin’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: cat < peanuts.txt > banana.txt',
        ['cat', '<', 'peanuts.txt', '>', 'banana.txt'],
        ['cat', '<', 'peanuts.txt', '>', 'banana.txt', 'sudo', '-la'],
        'Type it exactly as shown: cat < peanuts.txt > banana.txt. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “In our previous lesson we learned that we have different stdout streams we can use, such as a file or the screen. Well there are also different standard input…” — which lesson is this?',
        'Stdin',
        ['Stdin', 'Stdout', 'Stderr', 'Pipe/Tee'],
        'Those opening lines are from ‘Stdin’.'
      ),
      MCQ(
        'The lesson continues with: “Let\'s use the peanuts.txt file in the previous lesson for this example, remember it had the text Hello World in it.” — which lesson is this?',
        'Stdin',
        ['Stdin', 'Stdout', 'Stderr', 'Pipe/Tee'],
        'Those lines are from ‘Stdin’.'
      ),
    ],
  },
  'linux-text-fu-3': {
    id: 'linux-text-fu-3',
    title: 'Stderr',
    theory: [
      'Let\'s try something a little different now, let\'s try to list the contents of a directory that doesn\'t exist on your system and redirect the output to the peanuts.txt file again.',
      '"ls /fake/directory > peanuts.txt"',
      'What you should see is: "ls: cannot access /fake/directory: No such file or directory"',
      'Now you\'re probably thinking, shouldn\'t that message have been sent to the file? There is actually another I/O stream in play here called standard error (stderr). By default, stderr sends its output to the screen as well, it\'s a completely different stream than stdout. So you\'ll need to redirect its output a different way.',
      'Unfortunately the redirector is not as nice as using "<" or ">" but it\'s pretty close. We will have to use file descriptors. A file descriptor is a non-negative number that is used to access a file or stream. We will go in depth about this later, but for now know that the file descriptor for stdin, stdout and stderr is 0, 1, and 2 respectively.',
      'So now if we want to redirect our stderr to the file we can do this: "ls /fake/directory 2> peanuts.txt"',
      'You should see just the stderr messages in peanuts.txt.',
      'Now what if I wanted to see both stderr and stdout in the peanuts.txt file? It\'s possible to do this with file descriptors as well:',
      '"ls /fake/directory > peanuts.txt 2>&1"',
      'This sends the results of ls /fake/directory to the peanuts.txt file and then it redirects stderr to the stdout via 2>&1. The order of operations here matters, "2>&1" sends stderr to whatever stdout is pointing to. In this case stdout is pointing to a file, so "2>&1" also sends stderr to a file. So if you open up that peanuts.txt file you should see both stderr and stdout. In our case, the above command only outputs stderr.',
      'There is a shorter way to redirect both stdout and stderr to a file:',
      '"ls /fake/directory &> peanuts.txt"',
      'Now what if I don\'t want any of that cruft and want to get rid of stderr messages completely? Well you can also redirect output to a special file call /dev/null and it will discard any input.',
      '"ls /fake/directory 2> /dev/null"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Stderr’ cover?',
        'Stderr',
        ['Stderr', 'Stdout', 'Stdin', 'Pipe/Tee'],
        'This lesson is ‘Stderr’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ls /fake/directory > peanuts.txt',
        ['ls', '/fake/directory', '>', 'peanuts.txt'],
        ['ls', '/fake/directory', '>', 'peanuts.txt', 'sudo', '-la'],
        'Type it exactly as shown: ls /fake/directory > peanuts.txt. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Let\'s try something a little different now, let\'s try to list the contents of a directory that doesn\'t exist on your system and redirect the output to the pean…” — which lesson is this?',
        'Stderr',
        ['Stderr', 'Stdout', 'Stdin', 'Pipe/Tee'],
        'Those opening lines are from ‘Stderr’.'
      ),
      BUILD(
        'Assemble another command from this lesson: ls /fake/directory 2> peanuts.txt',
        ['ls', '/fake/directory', '2>', 'peanuts.txt'],
        ['ls', '/fake/directory', '2>', 'peanuts.txt', 'sudo', '-la'],
        'Type it exactly as shown: ls /fake/directory 2> peanuts.txt.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Stderr’ lesson?',
        'ls /fake/directory > peanuts.txt 2>&1',
        ['ls /fake/directory > peanuts.txt 2>&1', 'core', 'echo Hello World', 'pwd'],
        'The ‘Stderr’ lesson mentions “ls /fake/directory > peanuts.txt 2>&1” — find it in the theory above.'
      ),
    ],
  },
  'linux-text-fu-4': {
    id: 'linux-text-fu-4',
    title: 'Pipe/Tee',
    theory: [
      'Let\'s get into some plumbing now, not really but kinda. Let\'s try a command:',
      '"ls -la /etc"',
      'You should see a very long list of items, it\'s a little hard to read actually. Instead of redirecting this output to a file, wouldn\'t it be nice if we could just see the output in another command like less? Well we can!!!',
      '"ls -la /etc | less"',
      'The pipe operator |, represented by a vertical bar, allows us to get the stdout of a command and make that the stdin to another process. In this case, we took the stdout of ls -la /etc and then piped it to the less command. The pipe command is extremely useful and we will continue to use it for all eternity.',
      'Well what if I wanted to write the output of my command to two different streams? That\'s possible with the tee command:',
      '"ls | tee peanuts.txt"',
      'You should see the output of ls on your screen and if you open up the peanuts.txt file you should see the same information!',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Pipe/Tee’ cover?',
        'Pipe/Tee',
        ['Pipe/Tee', 'Stdout', 'Stdin', 'Stderr'],
        'This lesson is ‘Pipe/Tee’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ls -la /etc',
        ['ls', '-la', '/etc'],
        ['ls', '-la', '/etc', 'sudo', '-r'],
        'Type it exactly as shown: ls -la /etc. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Let\'s get into some plumbing now, not really but kinda. Let\'s try a command:” — which lesson is this?',
        'Pipe/Tee',
        ['Pipe/Tee', 'Stdout', 'Stdin', 'Stderr'],
        'Those opening lines are from ‘Pipe/Tee’.'
      ),
      BUILD(
        'Assemble another command from this lesson: ls -la /etc | less',
        ['ls', '-la', '/etc', '|', 'less'],
        ['ls', '-la', '/etc', '|', 'less', 'sudo', '-r'],
        'Type it exactly as shown: ls -la /etc | less.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Pipe/Tee’ lesson?',
        'ls | tee peanuts.txt',
        ['ls | tee peanuts.txt', 'core', 'echo Hello World', 'pwd'],
        'The ‘Pipe/Tee’ lesson mentions “ls | tee peanuts.txt” — find it in the theory above.'
      ),
    ],
  },
  'linux-text-fu-5': {
    id: 'linux-text-fu-5',
    title: 'Env',
    theory: [
      'Run the following command:',
      '"echo $HOME"',
      'You should see the path to your home directory, mine looks like /home/pete.',
      'What about this command?',
      '"echo $USER"',
      'You should see your username!',
      'Where is this information coming from? It\'s coming from your environment variables. You can view these by typing:',
      '"env"',
      'This outputs a whole lot of information about the environment variables you currently have set. These variables contain useful information that the shell and other processes can use.',
      'Here is a short example:',
      'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/bin PWD=/home/user USER=pete',
      'One particularly important variable is the PATH Variable. You can access these variables by sticking a $ infront of the variable name like so:',
      '$ echo $PATH /usr/local/sbin:/usr/local/bin:/usr/sbin:/bin',
      'This returns a list of paths separated by a colon that your system searches when it runs a command. Let\'s say you manually download and install a package from the internet and put it in to a non standard directory and want to run that command, you type $ coolcommand and the prompt says command not found. Well that\'s silly you are looking at the binary in a folder and know it exists. What is happening is that $PATH variable doesn\'t check that directory for this binary so it\'s throwing an error.',
      'Let\'s say you had tons of binaries you wanted to run out of that directory, you can just modify the PATH variable to include that directory in your PATH environment variable.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Env’ cover?',
        'Env',
        ['Env', 'Stdout', 'Stdin', 'Stderr'],
        'This lesson is ‘Env’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: echo $HOME',
        ['echo', '$HOME'],
        ['echo', '$HOME', 'sudo', '-la'],
        'Type it exactly as shown: echo $HOME. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Run the following command:” — which lesson is this?',
        'Env',
        ['Env', 'Stdout', 'Stdin', 'Stderr'],
        'Those opening lines are from ‘Env’.'
      ),
      BUILD(
        'Assemble another command from this lesson: echo $USER',
        ['echo', '$USER'],
        ['echo', '$USER', 'sudo', '-la'],
        'Type it exactly as shown: echo $USER.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Env’ lesson?',
        'env',
        ['env', 'core', 'echo Hello World', 'cd /home/pete/Pictures'],
        'The ‘Env’ lesson mentions “env” — find it in the theory above.'
      ),
    ],
  },
  'linux-text-fu-6': {
    id: 'linux-text-fu-6',
    title: 'Cut',
    theory: [
      'We\'re gonna learn a couple of useful commands that you can use to process text. Before we get started, let\'s create a file that we\'ll be working with. Copy and paste the following command, once you do that add a TAB in between lazy and dog (hold down Ctrl-v + TAB).',
      '"echo \'The quick brown; fox jumps over the lazy dog\' > sample.txt"',
      'First command we\'ll be learning about is the cut command. It extracts portions of text from a file.',
      'To extract contents by a list of characters:',
      '"cut -c 5 sample.txt"',
      'This outputs the 5th character in each line of the file. In this case it is "q", note that the space also counts as a character.',
      'To extract the contents by a field, we\'ll need to do a little modification:',
      '"cut -f 2 sample.txt"',
      'The -f or field flag cuts text based off of fields, by default it uses TABs as delimiters, so everything separated by a TAB is considered a field. You should see "dog" as your output.',
      'You can combine the field flag with the delimiter flag to extract the contents by a custom delimiter:',
      '"cut -f 1 -d "',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Cut’ cover?',
        'Cut',
        ['Cut', 'Stdout', 'Stdin', 'Stderr'],
        'This lesson is ‘Cut’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: cut -c 5 sample.txt',
        ['cut', '-c', '5', 'sample.txt'],
        ['cut', '-c', '5', 'sample.txt', 'sudo', '-la'],
        'Type it exactly as shown: cut -c 5 sample.txt. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “We\'re gonna learn a couple of useful commands that you can use to process text. Before we get started, let\'s create a file that we\'ll be working with. Copy and…” — which lesson is this?',
        'Cut',
        ['Cut', 'Stdout', 'Stdin', 'Stderr'],
        'Those opening lines are from ‘Cut’.'
      ),
      BUILD(
        'Assemble another command from this lesson: cut -f 2 sample.txt',
        ['cut', '-f', '2', 'sample.txt'],
        ['cut', '-f', '2', 'sample.txt', 'sudo', '-la'],
        'Type it exactly as shown: cut -f 2 sample.txt.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Cut’ lesson?',
        'cut -f 1 -d',
        ['cut -f 1 -d', 'core', 'echo Hello World', 'pwd'],
        'The ‘Cut’ lesson mentions “cut -f 1 -d” — find it in the theory above.'
      ),
    ],
  },
  'linux-text-fu-7': {
    id: 'linux-text-fu-7',
    title: 'Paste',
    theory: [
      'The paste command is similar to the cat command, it merges lines together in a file. Let\'s create a new file with the following contents:',
      'sample2.txt The quick brown fox',
      'Let\'s combine all these lines into one line:',
      '"paste -s sample2.txt"',
      'The default delimiter for paste is TAB, so now there is one line with TABs separating each word.',
      'Let\'s change this delimiter (-d) to something a little more readable:',
      '"paste -d \' \' -s sample2.txt"',
      'Now everything should be on one line delimited by spaces.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Paste’ cover?',
        'Paste',
        ['Paste', 'Stdout', 'Stdin', 'Stderr'],
        'This lesson is ‘Paste’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: paste -s sample2.txt',
        ['paste', '-s', 'sample2.txt'],
        ['paste', '-s', 'sample2.txt', 'sudo', '-la'],
        'Type it exactly as shown: paste -s sample2.txt. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The paste command is similar to the cat command, it merges lines together in a file. Let\'s create a new file with the following contents:” — which lesson is this?',
        'Paste',
        ['Paste', 'Stdout', 'Stdin', 'Stderr'],
        'Those opening lines are from ‘Paste’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Paste’ lesson?',
        'paste -d \' \' -s sample2.txt',
        ['paste -d \' \' -s sample2.txt', 'core', 'echo Hello World', 'pwd'],
        'The ‘Paste’ lesson mentions “paste -d \' \' -s sample2.txt” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “sample2.txt The quick brown fox” — which lesson is this?',
        'Paste',
        ['Paste', 'Stdout', 'Stdin', 'Stderr'],
        'Those lines are from ‘Paste’.'
      ),
    ],
  },
  'linux-text-fu-8': {
    id: 'linux-text-fu-8',
    title: 'Head',
    theory: [
      'Let\'s say we have a very long file, in fact we have many to choose from, go ahead and cat /var/log/syslog. You should see pages upon pages of text. What if I just wanted to see the first couple of lines in this text file? Well we can do that with the head command, by default the head command will show you the first 10 lines in a file.',
      '"head /var/log/syslog"',
      'You can also modify the line count to whatever you choose, let\'s say I wanted to see the first 15 lines instead.',
      '"head -n 15 /var/log/syslog"',
      'The -n flag stands for number of lines.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Head’ cover?',
        'Head',
        ['Head', 'Stdout', 'Stdin', 'Stderr'],
        'This lesson is ‘Head’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: head /var/log/syslog',
        ['head', '/var/log/syslog'],
        ['head', '/var/log/syslog', 'sudo', '-la'],
        'Type it exactly as shown: head /var/log/syslog. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Let\'s say we have a very long file, in fact we have many to choose from, go ahead and cat /var/log/syslog. You should see pages upon pages of text. What if I j…” — which lesson is this?',
        'Head',
        ['Head', 'Stdout', 'Stdin', 'Stderr'],
        'Those opening lines are from ‘Head’.'
      ),
      BUILD(
        'Assemble another command from this lesson: head -n 15 /var/log/syslog',
        ['head', '-n', '15', '/var/log/syslog'],
        ['head', '-n', '15', '/var/log/syslog', 'sudo', '-la'],
        'Type it exactly as shown: head -n 15 /var/log/syslog.'
      ),
      MCQ(
        'The lesson continues with: “"head /var/log/syslog"” — which lesson is this?',
        'Head',
        ['Head', 'Stdout', 'Stdin', 'Stderr'],
        'Those lines are from ‘Head’.'
      ),
    ],
  },
  'linux-text-fu-9': {
    id: 'linux-text-fu-9',
    title: 'Tail',
    theory: [
      'Similar to the head command, the tail command lets you see the last 10 lines of a file by default.',
      '"tail /var/log/syslog"',
      'Along with head you can change the number of lines you want to see.',
      '"tail -n 10 /var/log/syslog"',
      'Another great option you can use is the -f (follow) flag, this will follow the file as it grows. Give it a try and see what happens.',
      '"tail -f /var/log/syslog"',
      'Your syslog file will be continually changing while you interact with your system and using tail -f you can see everything that is getting added to that file.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Tail’ cover?',
        'Tail',
        ['Tail', 'Stdout', 'Stdin', 'Stderr'],
        'This lesson is ‘Tail’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: tail /var/log/syslog',
        ['tail', '/var/log/syslog'],
        ['tail', '/var/log/syslog', 'sudo', '-la'],
        'Type it exactly as shown: tail /var/log/syslog. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Similar to the head command, the tail command lets you see the last 10 lines of a file by default.” — which lesson is this?',
        'Tail',
        ['Tail', 'Stdout', 'Stdin', 'Stderr'],
        'Those opening lines are from ‘Tail’.'
      ),
      BUILD(
        'Assemble another command from this lesson: tail -n 10 /var/log/syslog',
        ['tail', '-n', '10', '/var/log/syslog'],
        ['tail', '-n', '10', '/var/log/syslog', 'sudo', '-la'],
        'Type it exactly as shown: tail -n 10 /var/log/syslog.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Tail’ lesson?',
        'tail -f /var/log/syslog',
        ['tail -f /var/log/syslog', 'core', 'echo Hello World', 'pwd'],
        'The ‘Tail’ lesson mentions “tail -f /var/log/syslog” — find it in the theory above.'
      ),
    ],
  },
  'linux-text-fu-10': {
    id: 'linux-text-fu-10',
    title: 'Expand/Unexpand',
    theory: [
      'In our lesson on the cut command, we had our sample.txt file that contained a tab. Normally TABs would usually show a noticeable difference but some text files don\'t show that well enough. Having TABs in a text file may not be the desired spacing you want. To change your TABs to spaces, use the expand command.',
      '"expand sample.txt"',
      'The command above will print output with each TAB converted into a group of spaces. To save this output in a file, use output redirection like below.',
      '"expand sample.txt > result.txt"',
      'Opposite to expand, we can convert back each group of spaces to a TAB with the unexpand command:',
      '"unexpand -a result.txt"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Expand/Unexpand’ cover?',
        'Expand/Unexpand',
        ['Expand/Unexpand', 'Stdout', 'Stdin', 'Stderr'],
        'This lesson is ‘Expand/Unexpand’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: expand sample.txt',
        ['expand', 'sample.txt'],
        ['expand', 'sample.txt', 'sudo', '-la'],
        'Type it exactly as shown: expand sample.txt. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “In our lesson on the cut command, we had our sample.txt file that contained a tab. Normally TABs would usually show a noticeable difference but some text files…” — which lesson is this?',
        'Expand/Unexpand',
        ['Expand/Unexpand', 'Stdout', 'Stdin', 'Stderr'],
        'Those opening lines are from ‘Expand/Unexpand’.'
      ),
      BUILD(
        'Assemble another command from this lesson: expand sample.txt > result.txt',
        ['expand', 'sample.txt', '>', 'result.txt'],
        ['expand', 'sample.txt', '>', 'result.txt', 'sudo', '-la'],
        'Type it exactly as shown: expand sample.txt > result.txt.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Expand/Unexpand’ lesson?',
        'unexpand -a result.txt',
        ['unexpand -a result.txt', 'core', 'echo Hello World', 'pwd'],
        'The ‘Expand/Unexpand’ lesson mentions “unexpand -a result.txt” — find it in the theory above.'
      ),
    ],
  },
  'linux-text-fu-11': {
    id: 'linux-text-fu-11',
    title: 'Join/Split',
    theory: [
      'The join command allows you to join multiple files together by a common field:',
      'Let\'s say I had two files that I wanted to join together: file1.txt = 1 Jhon 2 Jane 3 Mary file2.txt = 1 Doe 2 Doe 3 Sue',
      '"join file1.txt file2.txt" 1 Jhon Doe 2 Jane Doe 3 Mary Sue',
      'See how it joined together my files? They are joined together by the first field by default and the fields have to be identical. If they are not you can sort them, so in this case the files are joined via 1, 2, 3.',
      'How would we join the following files?',
      'file1.txt John 1 Jane 2 Mary 3',
      'file2.txt 1 Doe 2 Doe 3 Sue',
      'To join this file you need to specify which fields you are joining. In this case we want field 2 on file1.txt and field 1 on file2.txt, so the command would look like this:',
      '"join -1 2 -2 1 file1.txt file2.txt" 1 John Doe 2 Jane Doe 3 Mary Sue',
      '-1 refers to file1.txt and -2 refers to file2.txt. Pretty neat. You can also split a file up into different files with the split command:',
      '"split somefile"',
      'This will split it into different files, by default it will split them once they reach a 1000 line limit. The files are named x** by default.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Join/Split’ cover?',
        'Join/Split',
        ['Join/Split', 'Stdout', 'Stdin', 'Stderr'],
        'This lesson is ‘Join/Split’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: join file1.txt file2.txt',
        ['join', 'file1.txt', 'file2.txt'],
        ['join', 'file1.txt', 'file2.txt', 'sudo', '-la'],
        'Type it exactly as shown: join file1.txt file2.txt. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The join command allows you to join multiple files together by a common field:” — which lesson is this?',
        'Join/Split',
        ['Join/Split', 'Stdout', 'Stdin', 'Stderr'],
        'Those opening lines are from ‘Join/Split’.'
      ),
      BUILD(
        'Assemble another command from this lesson: split somefile',
        ['split', 'somefile'],
        ['split', 'somefile', 'sudo', '-la'],
        'Type it exactly as shown: split somefile.'
      ),
      MCQ(
        'The lesson continues with: “Let\'s say I had two files that I wanted to join together: file1.txt = 1 Jhon 2 Jane 3 Mary file2.txt = 1 Doe 2 Doe 3 Sue” — which lesson is this?',
        'Join/Split',
        ['Join/Split', 'Stdout', 'Stdin', 'Stderr'],
        'Those lines are from ‘Join/Split’.'
      ),
    ],
  },
  'linux-text-fu-12': {
    id: 'linux-text-fu-12',
    title: 'Sort',
    theory: [
      'The sort command is useful for sorting lines.',
      'file1.txt= dog cow cat elephant bird',
      '"sort file1.txt" bird cat cow dog elephant',
      'You can also do a reverse sort:',
      '"sort -r file1.txt" elephant dog cow cat bird',
      'And also sort via numerical value:',
      '"sort -n file1.txt" bird cat cow elephant dog',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Sort’ cover?',
        'Sort',
        ['Sort', 'Stdout', 'Stdin', 'Stderr'],
        'This lesson is ‘Sort’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sort file1.txt',
        ['sort', 'file1.txt'],
        ['sort', 'file1.txt', 'sudo', '-la'],
        'Type it exactly as shown: sort file1.txt. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The sort command is useful for sorting lines.” — which lesson is this?',
        'Sort',
        ['Sort', 'Stdout', 'Stdin', 'Stderr'],
        'Those opening lines are from ‘Sort’.'
      ),
      BUILD(
        'Assemble another command from this lesson: sort -r file1.txt',
        ['sort', '-r', 'file1.txt'],
        ['sort', '-r', 'file1.txt', 'sudo', '-la'],
        'Type it exactly as shown: sort -r file1.txt.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Sort’ lesson?',
        'sort -n file1.txt',
        ['sort -n file1.txt', 'core', 'echo Hello World', 'pwd'],
        'The ‘Sort’ lesson mentions “sort -n file1.txt” — find it in the theory above.'
      ),
    ],
  },
  'linux-text-fu-13': {
    id: 'linux-text-fu-13',
    title: 'Tr',
    theory: [
      'The tr (translate) command allows you to translate a set of characters into another set of characters. Let\'s try an example of translating all lower case characters to uppercase characters.',
      '"tr a-z A-Z" hello HELLO',
      'As you can see we made the ranges of a-z into A-Z and all text we type that is lowercase gets uppercased.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Tr’ cover?',
        'Tr',
        ['Tr', 'Stdout', 'Stdin', 'Stderr'],
        'This lesson is ‘Tr’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: tr a-z A-Z',
        ['tr', 'a-z', 'A-Z'],
        ['tr', 'a-z', 'A-Z', 'sudo', '-la'],
        'Type it exactly as shown: tr a-z A-Z. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The tr (translate) command allows you to translate a set of characters into another set of characters. Let\'s try an example of translating all lower case chara…” — which lesson is this?',
        'Tr',
        ['Tr', 'Stdout', 'Stdin', 'Stderr'],
        'Those opening lines are from ‘Tr’.'
      ),
      MCQ(
        'The lesson continues with: “"tr a-z A-Z" hello HELLO” — which lesson is this?',
        'Tr',
        ['Tr', 'Stdout', 'Stdin', 'Stderr'],
        'Those lines are from ‘Tr’.'
      ),
    ],
  },
  'linux-text-fu-14': {
    id: 'linux-text-fu-14',
    title: 'Uniq',
    theory: [
      'The uniq (unique) command is another useful tool for parsing text.',
      'Let\'s say you had a file with lots of duplicates: reading.txt = book book paper paper article article magazine',
      'And you wanted to remove the duplicates, well you can use the uniq command: "uniq reading.txt" = book paper article magazine',
      'Let\'s get the count of how many occurrences of a line:',
      '"uniq -c reading.txt" 2 book 2 paper 2 article 1 magazine',
      'Let\'s just get unique values:',
      '"uniq -u reading.txt" = magazine',
      'Let\'s just get duplicate values:',
      '"uniq -d reading.txt" = book paper article',
      'Note: uniq does not detect duplicate lines unless they are adjacent. For eg: Let\'s say you had a file with duplicates which are not adjacent:',
      'reading.txt = book paper book paper article magazine article',
      '"uniq reading.txt" reading.txt = book paper book paper article magazine article',
      'The result returned by uniq will contain all the entries unlike the very first example.',
      'To overcome this limitation of uniq we can use sort in combination with uniq:',
      '"sort reading.txt | uniq" article book magazine paper',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Uniq’ cover?',
        'Uniq',
        ['Uniq', 'Stdout', 'Stdin', 'Stderr'],
        'This lesson is ‘Uniq’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: uniq reading.txt',
        ['uniq', 'reading.txt'],
        ['uniq', 'reading.txt', 'sudo', '-la'],
        'Type it exactly as shown: uniq reading.txt. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The uniq (unique) command is another useful tool for parsing text.” — which lesson is this?',
        'Uniq',
        ['Uniq', 'Stdout', 'Stdin', 'Stderr'],
        'Those opening lines are from ‘Uniq’.'
      ),
      BUILD(
        'Assemble another command from this lesson: uniq -c reading.txt',
        ['uniq', '-c', 'reading.txt'],
        ['uniq', '-c', 'reading.txt', 'sudo', '-la'],
        'Type it exactly as shown: uniq -c reading.txt.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Uniq’ lesson?',
        'uniq -u reading.txt',
        ['uniq -u reading.txt', 'core', 'echo Hello World', 'pwd'],
        'The ‘Uniq’ lesson mentions “uniq -u reading.txt” — find it in the theory above.'
      ),
    ],
  },
  'linux-text-fu-15': {
    id: 'linux-text-fu-15',
    title: 'Wc',
    theory: [
      'The wc (word count) command shows the total count of words in a file.',
      '"wc /etc/passwd" 96 265 5925 /etc/passwd',
      'It display the number of lines, number of words and number of bytes, respectively.',
      'To just see just the count of a certain field, use the -l, -w, or -c respectively.',
      '"wc -l /etc/passwd" 96',
      'Another command you can use to check the count of lines on a file is the nl (number lines) command.',
      'file1.txt= i like turtles',
      '"nl file1.txt" 1. i 2. like 3. turtles',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Wc’ cover?',
        'Wc',
        ['Wc', 'Stdout', 'Stdin', 'Stderr'],
        'This lesson is ‘Wc’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: wc /etc/passwd',
        ['wc', '/etc/passwd'],
        ['wc', '/etc/passwd', 'sudo', '-la'],
        'Type it exactly as shown: wc /etc/passwd. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The wc (word count) command shows the total count of words in a file.” — which lesson is this?',
        'Wc',
        ['Wc', 'Stdout', 'Stdin', 'Stderr'],
        'Those opening lines are from ‘Wc’.'
      ),
      BUILD(
        'Assemble another command from this lesson: wc -l /etc/passwd',
        ['wc', '-l', '/etc/passwd'],
        ['wc', '-l', '/etc/passwd', 'sudo', '-la'],
        'Type it exactly as shown: wc -l /etc/passwd.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Wc’ lesson?',
        'nl file1.txt',
        ['nl file1.txt', 'core', 'echo Hello World', 'pwd'],
        'The ‘Wc’ lesson mentions “nl file1.txt” — find it in the theory above.'
      ),
    ],
  },
  'linux-text-fu-16': {
    id: 'linux-text-fu-16',
    title: 'Grep',
    theory: [
      'The grep command is quite possibly the most common text processing command you will use. It allows you to search files for characters that match a certain pattern. What if you wanted to know if a file existed in a certain directory or if you wanted to see if a string was found in a file? You certainly wouldn\'t dig through every line of text, you would use grep!',
      'Let\'s use our sample.txt file as an example: "grep fox sample.txt"',
      'You should see that grep found fox in the sample.txt file.',
      'You can also grep patterns that are case insensitive with the -i flag: "grep -i somepattern somefile"',
      'To get even more flexible with grep you can combine it with other commands with |. "env | grep -i User"',
      'As you can see grep is pretty versatile.',
      'You can even use regular expressions in your pattern: "ls /somedir | grep \'.txt$\'"',
      'Should return all files ending with .txt in somedir.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Grep’ cover?',
        'Grep',
        ['Grep', 'Stdout', 'Stdin', 'Stderr'],
        'This lesson is ‘Grep’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: grep fox sample.txt',
        ['grep', 'fox', 'sample.txt'],
        ['grep', 'fox', 'sample.txt', 'sudo', '-la'],
        'Type it exactly as shown: grep fox sample.txt. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The grep command is quite possibly the most common text processing command you will use. It allows you to search files for characters that match a certain patt…” — which lesson is this?',
        'Grep',
        ['Grep', 'Stdout', 'Stdin', 'Stderr'],
        'Those opening lines are from ‘Grep’.'
      ),
      BUILD(
        'Assemble another command from this lesson: grep -i somepattern somefile',
        ['grep', '-i', 'somepattern', 'somefile'],
        ['grep', '-i', 'somepattern', 'somefile', 'sudo', '-la'],
        'Type it exactly as shown: grep -i somepattern somefile.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Grep’ lesson?',
        'env | grep -i User',
        ['env | grep -i User', 'core', 'echo Hello World', 'pwd'],
        'The ‘Grep’ lesson mentions “env | grep -i User” — find it in the theory above.'
      ),
    ],
  },
  'linux-advanced-text-fu-1': {
    id: 'linux-advanced-text-fu-1',
    title: 'Regex',
    theory: [
      'Regular expressions are a powerful tool to do pattern based selection. It uses special notations similar to those we\'ve encountered already such as the * wildcard.',
      'We\'ll go through a couple of the most common regular expressions, these are almost universal with any programming language.',
      'Well use this phrase as our test string: sally sells seashells by the seashore',
      'Beginning of a line with "^"',
      '^by would match the line "by the seashore"',
      'End of a line with "$"',
      'seashore$ would match the line "by the seashore"',
      'Matching any single character with "."',
      'b. would match by',
      'Bracket notation with [] and ()',
      'This can be a little tricky, brackets allow us to specify characters found within the bracket.',
      'd[iou]g would match: dig, dog, dug',
      'The previous anchor tag ^ when used in a bracket means anything except the characters within the bracket.',
      'd[^i]g would match: dog and dug but not dig',
      'Brackets can also use ranges to increase the amount of characters you want to use.',
      'd[a-c]g will match patterns like dag, dbg, and dcg',
      'Be careful though as brackets are case sensitive: d[A-C]g will match dAg, dBg and dCg but not dag, dbg and dcg. And those are some basic regular expressoins',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Regex’ cover?',
        'Regex',
        ['Regex', 'Vim Or Emacs', 'Vim', 'Vim Search'],
        'This lesson is ‘Regex’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: by the seashore',
        ['by', 'the', 'seashore'],
        ['by', 'the', 'seashore', 'sudo', '-la'],
        'Type it exactly as shown: by the seashore. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Regular expressions are a powerful tool to do pattern based selection. It uses special notations similar to those we\'ve encountered already such as the * wildc…” — which lesson is this?',
        'Regex',
        ['Regex', 'Vim Or Emacs', 'Vim', 'Vim Search'],
        'Those opening lines are from ‘Regex’.'
      ),
      MCQ(
        'The lesson continues with: “We\'ll go through a couple of the most common regular expressions, these are almost universal with any programming language.” — which lesson is this?',
        'Regex',
        ['Regex', 'Vim Or Emacs', 'Vim', 'Vim Search'],
        'Those lines are from ‘Regex’.'
      ),
    ],
  },
  'linux-advanced-text-fu-2': {
    id: 'linux-advanced-text-fu-2',
    title: 'Vim Or Emacs',
    theory: [
      'If you get a couple of diehard Linux users in a room and ask them what is the best text editor to use, you\'ll hear a never ending banter about the godliness of either vim or emacs. Don\'t even try to bring up using a GUI editor if you value your life.',
      'Vim and emacs are popular text editors that are installed by default on most Linux distributions and they both have their pros and cons. If you want to get around your system like a ninja, you\'ll need to pick up one of these text editors to use. They are essentially coding, word document processing and basically all in one editors.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Vim Or Emacs’ cover?',
        'Vim Or Emacs',
        ['Vim Or Emacs', 'Regex', 'Vim', 'Vim Search'],
        'This lesson is ‘Vim Or Emacs’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “If you get a couple of diehard Linux users in a room and ask them what is the best text editor to use, you\'ll hear a never ending banter about the godliness of…” — which lesson is this?',
        'Vim Or Emacs',
        ['Vim Or Emacs', 'Regex', 'Vim', 'Vim Search'],
        'Those opening lines are from ‘Vim Or Emacs’.'
      ),
      MCQ(
        'The lesson continues with: “Vim and emacs are popular text editors that are installed by default on most Linux distributions and they both have their pros and cons. If you want to get aro…” — which lesson is this?',
        'Vim Or Emacs',
        ['Vim Or Emacs', 'Regex', 'Vim', 'Vim Search'],
        'Those lines are from ‘Vim Or Emacs’.'
      ),
    ],
  },
  'linux-advanced-text-fu-3': {
    id: 'linux-advanced-text-fu-3',
    title: 'Vim',
    theory: [
      'Vim stands for vi (Improved) just like its name it stands for an improved version of the vi text editor command.',
      'It\'s super lightweight, opening and editing a file with vim is quick and easy. It\'s also almost always available, if you booted up a random Linux distribution, chances are vim is installed by default.',
      'To fire up vim just type: "vim"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Vim’ cover?',
        'Vim',
        ['Vim', 'Regex', 'Vim Or Emacs', 'Vim Search'],
        'This lesson is ‘Vim’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Vim stands for vi (Improved) just like its name it stands for an improved version of the vi text editor command.” — which lesson is this?',
        'Vim',
        ['Vim', 'Regex', 'Vim Or Emacs', 'Vim Search'],
        'Those opening lines are from ‘Vim’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Vim’ lesson?',
        'vim',
        ['vim', 'core', 'echo Hello World', 'pwd'],
        'The ‘Vim’ lesson mentions “vim” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “It\'s super lightweight, opening and editing a file with vim is quick and easy. It\'s also almost always available, if you booted up a random Linux distribution,…” — which lesson is this?',
        'Vim',
        ['Vim', 'Regex', 'Vim Or Emacs', 'Vim Search'],
        'Those lines are from ‘Vim’.'
      ),
    ],
  },
  'linux-advanced-text-fu-4': {
    id: 'linux-advanced-text-fu-4',
    title: 'Vim Search',
    theory: [
      'To search for an expression just type the / key and then your search result while you are in a vim session. Once you hit enter, you can press "n" to go forward or "N" to go backward in your search results.',
      'My pretty file is very pretty.',
      '"/pretty"',
      'will find the pretty words in the text file.',
      'The ? search command will search the text file backwards, so in the previous example, the last pretty would come up first. My pretty file is very pretty.',
      '"?pretty"',
      'will find the pretty words in the text file.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Vim Search’ cover?',
        'Vim Search',
        ['Vim Search', 'Regex', 'Vim Or Emacs', 'Vim'],
        'This lesson is ‘Vim Search’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “To search for an expression just type the / key and then your search result while you are in a vim session. Once you hit enter, you can press "n" to go forward…” — which lesson is this?',
        'Vim Search',
        ['Vim Search', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those opening lines are from ‘Vim Search’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Vim Search’ lesson?',
        'n',
        ['n', 'core', 'echo Hello World', 'pwd'],
        'The ‘Vim Search’ lesson mentions “n” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “My pretty file is very pretty.” — which lesson is this?',
        'Vim Search',
        ['Vim Search', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those lines are from ‘Vim Search’.'
      ),
    ],
  },
  'linux-advanced-text-fu-5': {
    id: 'linux-advanced-text-fu-5',
    title: 'Vim Navigation',
    theory: [
      'Now you may notice, the mouse is nowhere is use here. To navigate a text document in vim, use the following keys:',
      'h or the left arrow - will move you left one character j or the up arrow - will move you up one line k or the down arrow - will move you down one line l or the right arrow - will move you right one character',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Vim Navigation’ cover?',
        'Vim Navigation',
        ['Vim Navigation', 'Regex', 'Vim Or Emacs', 'Vim'],
        'This lesson is ‘Vim Navigation’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Now you may notice, the mouse is nowhere is use here. To navigate a text document in vim, use the following keys:” — which lesson is this?',
        'Vim Navigation',
        ['Vim Navigation', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those opening lines are from ‘Vim Navigation’.'
      ),
      MCQ(
        'The lesson continues with: “h or the left arrow - will move you left one character j or the up arrow - will move you up one line k or the down arrow - will move you down one line l or the…” — which lesson is this?',
        'Vim Navigation',
        ['Vim Navigation', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those lines are from ‘Vim Navigation’.'
      ),
    ],
  },
  'linux-advanced-text-fu-7': {
    id: 'linux-advanced-text-fu-7',
    title: 'Vim Editing',
    theory: [
      'To edit text with vim, press "i" or "a" to enter in the "INSERT" mode. In "INSERT" mode is where you use vim as your regular, day-to-day text editor(e.g MS Notepad)',
      'The difference between "i" and "a" is that with "i", your cursor is behind the current position, and with "a" your cursor is ahead the current position.',
      'To go back to "NORMAL" mode (aka "SHORTCUTS" mode) press ESC.',
      '(dev note: For some reason this lesson is not availabe in the linuxjourney repository, so i wrote this lesson this myself *.^)',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Vim Editing’ cover?',
        'Vim Editing',
        ['Vim Editing', 'Regex', 'Vim Or Emacs', 'Vim'],
        'This lesson is ‘Vim Editing’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “To edit text with vim, press "i" or "a" to enter in the "INSERT" mode. In "INSERT" mode is where you use vim as your regular, day-to-day text editor(e.g MS Not…” — which lesson is this?',
        'Vim Editing',
        ['Vim Editing', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those opening lines are from ‘Vim Editing’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Vim Editing’ lesson?',
        'i',
        ['i', 'core', 'echo Hello World', 'pwd'],
        'The ‘Vim Editing’ lesson mentions “i” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “The difference between "i" and "a" is that with "i", your cursor is behind the current position, and with "a" your cursor is ahead the current position.” — which lesson is this?',
        'Vim Editing',
        ['Vim Editing', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those lines are from ‘Vim Editing’.'
      ),
    ],
  },
  'linux-advanced-text-fu-8': {
    id: 'linux-advanced-text-fu-8',
    title: 'Vim Save/Exit',
    theory: [
      'Now that you\'ve done your editing it\'s time to actually save and quit out of vim:',
      ':w - writes or saves the file :q - quit out of vim :wq - write and then quit :q! - quit out of vim without saving the file ZZ - equivalent of :wq, but one character faster',
      'u - undo your last action Ctrl-r - redo your last action',
      'You may not think ZZ is necessary, but you\'ll eventually see that your fingers may tend to lean towards this rather than :wq.',
      'Whew that was a lot of information to take about Vim. Now that you know some basic commands and navigation, you can start editing some text files. There are many more options you can use in vim to increase your ability to master this text editor, head on to Vim\'s online guide to take a look.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Vim Save/Exit’ cover?',
        'Vim Save/Exit',
        ['Vim Save/Exit', 'Regex', 'Vim Or Emacs', 'Vim'],
        'This lesson is ‘Vim Save/Exit’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Now that you\'ve done your editing it\'s time to actually save and quit out of vim:” — which lesson is this?',
        'Vim Save/Exit',
        ['Vim Save/Exit', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those opening lines are from ‘Vim Save/Exit’.'
      ),
      MCQ(
        'The lesson continues with: “:w - writes or saves the file :q - quit out of vim :wq - write and then quit :q! - quit out of vim without saving the file ZZ - equivalent of :wq, but one char…” — which lesson is this?',
        'Vim Save/Exit',
        ['Vim Save/Exit', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those lines are from ‘Vim Save/Exit’.'
      ),
    ],
  },
  'linux-advanced-text-fu-9': {
    id: 'linux-advanced-text-fu-9',
    title: 'Emacs',
    theory: [
      'Emacs is for users who want an extremely powerful text editor, which may be an understatement because you essentially live in emacs. You can do all your code editing, file manipulation, etc all within emacs. It\'s a bit slower to load up and the learning curve is a bit steeper than vim, but if you want a powerful editor that is extremely extensible, this is the one for you. When I say extensible, I literally mean you can write up scripts for emacs that extend its functionality.',
      'To start emacs just use:',
      '"emacs"',
      'You should be greeted with the default welcome buffer.',
      'Buffers in emacs is what your text resides in. So if you open up a file, a buffer is used to store that file\'s content. You can have multiple buffers open at the same time and you can easily switch between buffers.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Emacs’ cover?',
        'Emacs',
        ['Emacs', 'Regex', 'Vim Or Emacs', 'Vim'],
        'This lesson is ‘Emacs’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Emacs is for users who want an extremely powerful text editor, which may be an understatement because you essentially live in emacs. You can do all your code e…” — which lesson is this?',
        'Emacs',
        ['Emacs', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those opening lines are from ‘Emacs’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Emacs’ lesson?',
        'emacs',
        ['emacs', 'core', 'echo Hello World', 'pwd'],
        'The ‘Emacs’ lesson mentions “emacs” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “To start emacs just use:” — which lesson is this?',
        'Emacs',
        ['Emacs', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those lines are from ‘Emacs’.'
      ),
    ],
  },
  'linux-advanced-text-fu-10': {
    id: 'linux-advanced-text-fu-10',
    title: 'Emacs Files',
    theory: [
      'In a lot (if not all) of Emacs documentation, you will see the syntax C-[letter]. This just means hit the Ctrl-letter, but for shorthand purposes, we\'ll call Ctrl with C. If you see syntax such as M-[letter], that means use the Meta key, most commonly the Alt key.',
      'Saving files: C-x C-s - Save a file C-x C-w - Save file as C-x s - Save all',
      'The save file options will prompt you if you want to save each file.',
      'Opening a file: C-x C-f',
      'This will prompt you to type a filename to open. If you do not have a file that already exists, it will create a new file. You can load up a directory as well.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Emacs Files’ cover?',
        'Emacs Files',
        ['Emacs Files', 'Regex', 'Vim Or Emacs', 'Vim'],
        'This lesson is ‘Emacs Files’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “In a lot (if not all) of Emacs documentation, you will see the syntax C-[letter]. This just means hit the Ctrl-letter, but for shorthand purposes, we\'ll call C…” — which lesson is this?',
        'Emacs Files',
        ['Emacs Files', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those opening lines are from ‘Emacs Files’.'
      ),
      MCQ(
        'The lesson continues with: “Saving files: C-x C-s - Save a file C-x C-w - Save file as C-x s - Save all” — which lesson is this?',
        'Emacs Files',
        ['Emacs Files', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those lines are from ‘Emacs Files’.'
      ),
    ],
  },
  'linux-advanced-text-fu-11': {
    id: 'linux-advanced-text-fu-11',
    title: 'Emacs Buffer',
    theory: [
      'To move around buffers (or files you\'re visiting) use the following commands:',
      'Switch buffers: C-x b - switch buffer C-x right arrow - right-cycle through buffer C-x left arrow - left-cycle through buffer',
      'Close the buffer: C-x k',
      'Split the current buffer: C-x 2',
      'This allows you see multiple buffers on one screen. To move between these buffers use: C-x o',
      'Set a single buffer as the current screen: C-x 1',
      'If you ever used a terminal multiplexer like screen and tmux, the buffer commands will feel very familiar.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Emacs Buffer’ cover?',
        'Emacs Buffer',
        ['Emacs Buffer', 'Regex', 'Vim Or Emacs', 'Vim'],
        'This lesson is ‘Emacs Buffer’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “To move around buffers (or files you\'re visiting) use the following commands:” — which lesson is this?',
        'Emacs Buffer',
        ['Emacs Buffer', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those opening lines are from ‘Emacs Buffer’.'
      ),
      MCQ(
        'The lesson continues with: “Switch buffers: C-x b - switch buffer C-x right arrow - right-cycle through buffer C-x left arrow - left-cycle through buffer” — which lesson is this?',
        'Emacs Buffer',
        ['Emacs Buffer', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those lines are from ‘Emacs Buffer’.'
      ),
    ],
  },
  'linux-advanced-text-fu-12': {
    id: 'linux-advanced-text-fu-12',
    title: 'Emacs Editing',
    theory: [
      'Text Navigation: C-up arrow : move up one paragraph C-down arrow: move down one paragraph C-left arrow: move one word left C-right arrow: move one word right M-> : move to the end of the buffer',
      'With text navigation, your regular text buttons work as they should, home, end, page up, page down and the arrow keys, etc.',
      'Cutting and Pasting: To cut (kill) or paste (yank) in Emacs you\'ll need to be able to select text first. To select text, move your cursor to where you want to cut or paste and hit "C-space key" then you can use the navigation keys to select the text you want.',
      'Now you can do the cut and paste like so: C-w : cut C-y : yank',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Emacs Editing’ cover?',
        'Emacs Editing',
        ['Emacs Editing', 'Regex', 'Vim Or Emacs', 'Vim'],
        'This lesson is ‘Emacs Editing’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Text Navigation: C-up arrow : move up one paragraph C-down arrow: move down one paragraph C-left arrow: move one word left C-right arrow: move one word right M…” — which lesson is this?',
        'Emacs Editing',
        ['Emacs Editing', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those opening lines are from ‘Emacs Editing’.'
      ),
      MCQ(
        'The lesson continues with: “With text navigation, your regular text buttons work as they should, home, end, page up, page down and the arrow keys, etc.” — which lesson is this?',
        'Emacs Editing',
        ['Emacs Editing', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those lines are from ‘Emacs Editing’.'
      ),
    ],
  },
  'linux-advanced-text-fu-13': {
    id: 'linux-advanced-text-fu-13',
    title: 'Emacs Exiting',
    theory: [
      'To close out of emacs: C-x C-c',
      'If you have any open buffers, it will ask you to save it before closing out of emacs.',
      'Confused? C-h C-h : help menu',
      'Undo: C-x u',
      'As you can see Emacs has more moving parts, so the learning curve is a little steeper. In exchange though, you get a very powerful text editor.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Emacs Exiting’ cover?',
        'Emacs Exiting',
        ['Emacs Exiting', 'Regex', 'Vim Or Emacs', 'Vim'],
        'This lesson is ‘Emacs Exiting’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “To close out of emacs: C-x C-c” — which lesson is this?',
        'Emacs Exiting',
        ['Emacs Exiting', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those opening lines are from ‘Emacs Exiting’.'
      ),
      MCQ(
        'The lesson continues with: “If you have any open buffers, it will ask you to save it before closing out of emacs.” — which lesson is this?',
        'Emacs Exiting',
        ['Emacs Exiting', 'Regex', 'Vim Or Emacs', 'Vim'],
        'Those lines are from ‘Emacs Exiting’.'
      ),
    ],
  },
  'linux-user-management-1': {
    id: 'linux-user-management-1',
    title: 'Users/Groups',
    theory: [
      'In any traditional operating system, there are users and groups. They exist solely for access and permissions. When running a process, it will run as the owner of that process whether that is Jane or Bob. File access and ownership is also permission dependent. You wouldn\'t want Jane to see Bob\'s documents and vice versa.',
      'Each user has their own home directory where their user specific files get stored, this is usually located in /home/username, but can vary in different distributions.',
      'The system uses user ids (UID) to manage users, usernames are the friendly way to associate users with identification, but the system identifies users by their UID. The system also uses groups to manage permissions, groups are just sets of users with permission set by that group, they are identified by the system with their group ID (GID).',
      'In Linux, you\'ll have users in addition to the normal humans that use the system. Sometimes these users are system daemons that continuously run processes to keep the system functioning. One of the most important users is root or superuser, root is the most powerful user on the system, root can access any file and start and terminate any process. For that reason, it can be dangerous to operate as root all the time, you could potentially remove system critical files. Luckily, if root access is needed and a user has root access, they can run a command as root instead with the sudo command. The sudo command (superuser do) is used to run a command with root access, we\'ll go more in depth on how a user receives root access in a later lesson.',
      'Go ahead and try to view a protected file like /etc/shadow: "cat /etc/shadow"',
      'Notice how you get a permission denied error, look at the permissions with: "ls -la /etc/shadow" -rw-r----- 1 root shadow 1134 Dec 1 11:45 /etc/shadow',
      'We haven\'t gone through permissions yet, but what\'s happening here is that root is the owner of the file and you\'ll need root access or be part of the shadow group to read the contents. Now run the command with sudo:',
      '"sudo cat /etc/shadow"',
      'Now you\'ll be able to see the contents of the file!',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Users/Groups’ cover?',
        'Users/Groups',
        ['Users/Groups', 'Root User', 'Etc/passwd file', 'Etc/shadow file'],
        'This lesson is ‘Users/Groups’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: cat /etc/shadow',
        ['cat', '/etc/shadow'],
        ['cat', '/etc/shadow', 'sudo', '-la'],
        'Type it exactly as shown: cat /etc/shadow. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “In any traditional operating system, there are users and groups. They exist solely for access and permissions. When running a process, it will run as the owner…” — which lesson is this?',
        'Users/Groups',
        ['Users/Groups', 'Root User', 'Etc/passwd file', 'Etc/shadow file'],
        'Those opening lines are from ‘Users/Groups’.'
      ),
      BUILD(
        'Assemble another command from this lesson: ls -la /etc/shadow',
        ['ls', '-la', '/etc/shadow'],
        ['ls', '-la', '/etc/shadow', 'sudo', '-r'],
        'Type it exactly as shown: ls -la /etc/shadow.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Users/Groups’ lesson?',
        'sudo cat /etc/shadow',
        ['sudo cat /etc/shadow', 'core', 'echo Hello World', 'pwd'],
        'The ‘Users/Groups’ lesson mentions “sudo cat /etc/shadow” — find it in the theory above.'
      ),
    ],
  },
  'linux-user-management-2': {
    id: 'linux-user-management-2',
    title: 'Root User',
    theory: [
      'We\'ve looked at one way to get superuser access using the sudo command. You can also run commands as the superuser with the su command. This command will "substitute users" and open a root shell if no username is specified. You can use this command to substitute to any user as long as you know the password.',
      '"su"',
      'There are some downsides to using this method: it\'s much easier to make a critical mistake running everything in root, you won\'t have records of the commands you use to change system configurations, etc. Basically, if you need to run commands as the superuser, just stick to sudo.',
      'Now that you know what commands to run as the superuser, the question is how do you know who has access to do that? The system doesn\'t let every single Joe Schmoe run commands as the superuser, so how does it know? There is a file called the /etc/sudoers file, this file lists users who can run sudo. You can edit this file with the "visudo" command.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Root User’ cover?',
        'Root User',
        ['Root User', 'Users/Groups', 'Etc/passwd file', 'Etc/shadow file'],
        'This lesson is ‘Root User’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: substitute users',
        ['substitute', 'users'],
        ['substitute', 'users', 'sudo', '-la'],
        'Type it exactly as shown: substitute users. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “We\'ve looked at one way to get superuser access using the sudo command. You can also run commands as the superuser with the su command. This command will "subs…” — which lesson is this?',
        'Root User',
        ['Root User', 'Users/Groups', 'Etc/passwd file', 'Etc/shadow file'],
        'Those opening lines are from ‘Root User’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Root User’ lesson?',
        'su',
        ['su', 'core', 'echo Hello World', 'pwd'],
        'The ‘Root User’ lesson mentions “su” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “"su"” — which lesson is this?',
        'Root User',
        ['Root User', 'Users/Groups', 'Etc/passwd file', 'Etc/shadow file'],
        'Those lines are from ‘Root User’.'
      ),
    ],
  },
  'linux-user-management-3': {
    id: 'linux-user-management-3',
    title: 'Etc/passwd file',
    theory: [
      'Remember that usernames aren\'t really identifications for users. The system uses a user ID (UID) to identify a user. To find out what users are mapped to what ID, look at the /etc/passwd file.',
      '"cat /etc/passwd"',
      'This file shows you a list of users and detailed information about them. For example, the first line in this file most likely looks like this:',
      '"root:x:0:0:root:/root:/bin/bash"',
      'Each line displays user information for one user, most commonly you\'ll see the root user as the first line. There are many fields separated by colons that tell you additional information about the user, let\'s look at them all: 1- Username',
      '2- User\'s password - the password is not really stored in this file, it\'s usually stored in the /etc/shadow file. We\'ll discuss more in the next lesson about /etc/shadow, but for now, know that it contains encrypted user passwords. You can see many different symbols that are in this field, if you see an "x" that means the password is stored in the /etc/shadow file, a "*" means the user doesn\'t have login access and if there is a blank field that means the user doesn\'t have a password.',
      '3- The user ID - as you can see root has the UID of 0',
      '4- The group ID',
      '5- GECOS field - This is used to generally leave comments about the user or account such as their real name or phone number, it is comma delimited.',
      '6- User\'s home directory',
      '7- User\'s shell - you\'ll probably see a lot of user\'s defaulting to bash for their shell',
      'Normally in a user\'s setting page, you would expect you see just human users. However, you\'ll notice /etc/passwd contains other users. Remember that users are really only on the system to run processes with different permissions. Sometimes we want to run processes with pre-determined permissions. For example, the daemon user is used for daemon processes.',
      'Also should note that you can edit the /etc/passwd file by hand if you want to add users and modify information with the "vipw" tool, however things like these are best left to the tools we will discuss in a later lesson such as useradd and userdel.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Etc/passwd file’ cover?',
        'Etc/passwd file',
        ['Etc/passwd file', 'Users/Groups', 'Root User', 'Etc/shadow file'],
        'This lesson is ‘Etc/passwd file’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: cat /etc/passwd',
        ['cat', '/etc/passwd'],
        ['cat', '/etc/passwd', 'sudo', '-la'],
        'Type it exactly as shown: cat /etc/passwd. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Remember that usernames aren\'t really identifications for users. The system uses a user ID (UID) to identify a user. To find out what users are mapped to what…” — which lesson is this?',
        'Etc/passwd file',
        ['Etc/passwd file', 'Users/Groups', 'Root User', 'Etc/shadow file'],
        'Those opening lines are from ‘Etc/passwd file’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Etc/passwd file’ lesson?',
        'x',
        ['x', 'core', 'echo Hello World', 'pwd'],
        'The ‘Etc/passwd file’ lesson mentions “x” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “"cat /etc/passwd"” — which lesson is this?',
        'Etc/passwd file',
        ['Etc/passwd file', 'Users/Groups', 'Root User', 'Etc/shadow file'],
        'Those lines are from ‘Etc/passwd file’.'
      ),
    ],
  },
  'linux-user-management-4': {
    id: 'linux-user-management-4',
    title: 'Etc/shadow file',
    theory: [
      'The /etc/shadow file is used to store information about user authentication. It requires superuser read permissions. "sudo cat /etc/shadow" root:MyEPTEa$6Nonsense:15000:0:99999:7:::',
      'You\'ll notice that it looks very similar to the contents of /etc/passwd, however in the password field you\'ll see an encrypted password. The fields are separated by colons as followed: 1- Username',
      '2- Encrypted password',
      '3- Date of last password changed - expressed as the number of days since Jan 1, 1970. If there is a 0 that means the user should change their password the next time they login',
      '4- Minimum password age - Days that a user will have to wait before being able to change their password again',
      '5- Maximum password age - Maximum number of days before a user has to change their password',
      '6- Password warning period - Number of days before a password is going to expire',
      '7- Password inactivity period - Number of days after a password has expired to allow login with their password',
      '8- Account expiration date - date that user will not be able to login',
      '9- Reserved field for future use',
      'In most distributions today, user authentication doesn\'t rely on just the /etc/shadow file, there are other mechanisms in place such as PAM (Pluggable Authentication Modules) that replace authentication.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Etc/shadow file’ cover?',
        'Etc/shadow file',
        ['Etc/shadow file', 'Users/Groups', 'Root User', 'Etc/passwd file'],
        'This lesson is ‘Etc/shadow file’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo cat /etc/shadow',
        ['sudo', 'cat', '/etc/shadow'],
        ['sudo', 'cat', '/etc/shadow', '-la', '-r'],
        'Type it exactly as shown: sudo cat /etc/shadow. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The /etc/shadow file is used to store information about user authentication. It requires superuser read permissions. "sudo cat /etc/shadow" root:MyEPTEa$6Nonse…” — which lesson is this?',
        'Etc/shadow file',
        ['Etc/shadow file', 'Users/Groups', 'Root User', 'Etc/passwd file'],
        'Those opening lines are from ‘Etc/shadow file’.'
      ),
      MCQ(
        'The lesson continues with: “You\'ll notice that it looks very similar to the contents of /etc/passwd, however in the password field you\'ll see an encrypted password. The fields are separat…” — which lesson is this?',
        'Etc/shadow file',
        ['Etc/shadow file', 'Users/Groups', 'Root User', 'Etc/passwd file'],
        'Those lines are from ‘Etc/shadow file’.'
      ),
    ],
  },
  'linux-user-management-5': {
    id: 'linux-user-management-5',
    title: 'Etc/group file',
    theory: [
      'Another file that is used in user management is the /etc/group file. This file allows for different groups with different permissions.',
      '"cat /etc/group" root:*:0:pete',
      'Very similar to the /etc/password field, the /etc/group fields are as follows: 1- Group name',
      '2- Group password - there isn\'t a need to set a group password, using an elevated privilege like sudo is standard. A "*" will be put in place as the default value.',
      '3- Group ID (GID)',
      '4- List of users - you can manually specify users you want in a specific group',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Etc/group file’ cover?',
        'Etc/group file',
        ['Etc/group file', 'Users/Groups', 'Root User', 'Etc/passwd file'],
        'This lesson is ‘Etc/group file’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: cat /etc/group',
        ['cat', '/etc/group'],
        ['cat', '/etc/group', 'sudo', '-la'],
        'Type it exactly as shown: cat /etc/group. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Another file that is used in user management is the /etc/group file. This file allows for different groups with different permissions.” — which lesson is this?',
        'Etc/group file',
        ['Etc/group file', 'Users/Groups', 'Root User', 'Etc/passwd file'],
        'Those opening lines are from ‘Etc/group file’.'
      ),
      MCQ(
        'The lesson continues with: “"cat /etc/group" root:*:0:pete” — which lesson is this?',
        'Etc/group file',
        ['Etc/group file', 'Users/Groups', 'Root User', 'Etc/passwd file'],
        'Those lines are from ‘Etc/group file’.'
      ),
    ],
  },
  'linux-user-management-6': {
    id: 'linux-user-management-6',
    title: 'User Management Tools',
    theory: [
      'Most enterprise environments are using management systems to manage users, accounts and passwords. However, on a single machine computer there are useful commands to run to manage users.',
      'Adding Users: You can use the "adduser" or the "useradd" command. The adduser command contains more helpful features such as making a home directory and more. There are configuration files for adding new users that can be customized depending on what you want to allocate to a default user.',
      '"sudo useradd bob"',
      'You\'ll see that the above command creates an entry in /etc/passwd for bob, sets up default groups and adds an entry to the /etc/shadow file.',
      'Removing Users: To remove a user, you can use the "userdel" command.',
      '"sudo userdel bob"',
      'This basically does its best to undo the file changes by useradd.',
      'Changing Passwords: "passwd bob"',
      'This will allow you to change the password of yourself or another user (if you are root).',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘User Management Tools’ cover?',
        'User Management Tools',
        ['User Management Tools', 'Users/Groups', 'Root User', 'Etc/passwd file'],
        'This lesson is ‘User Management Tools’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo useradd bob',
        ['sudo', 'useradd', 'bob'],
        ['sudo', 'useradd', 'bob', '-la', '-r'],
        'Type it exactly as shown: sudo useradd bob. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Most enterprise environments are using management systems to manage users, accounts and passwords. However, on a single machine computer there are useful comma…” — which lesson is this?',
        'User Management Tools',
        ['User Management Tools', 'Users/Groups', 'Root User', 'Etc/passwd file'],
        'Those opening lines are from ‘User Management Tools’.'
      ),
      BUILD(
        'Assemble another command from this lesson: sudo userdel bob',
        ['sudo', 'userdel', 'bob'],
        ['sudo', 'userdel', 'bob', '-la', '-r'],
        'Type it exactly as shown: sudo userdel bob.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘User Management Tools’ lesson?',
        'passwd bob',
        ['passwd bob', 'core', 'echo Hello World', 'pwd'],
        'The ‘User Management Tools’ lesson mentions “passwd bob” — find it in the theory above.'
      ),
    ],
  },
  'linux-permissions-1': {
    id: 'linux-permissions-1',
    title: 'File Permissions',
    theory: [
      'As we learned previously, files have different permissions or file modes. Let\'s look at an example:',
      '"ls -l Desktop/" drwxr-xr-x 2 pete penguins 4096 Dec 1 11:45 .',
      'There are four parts to a file\'s permissions. The first part is the filetype, which is denoted by the first character in the permissions, in our case since we are looking at a directory it shows "d" for the filetype. Most commonly you will see a <b>-</b> for a regular file.',
      'The next three parts of the file mode are the actual permissions. The permissions are grouped into 3 bits each. The first 3 bits are user permissions, then group permissions and then other permissions. I\'ve added the pipe to make it easier to differentiate.',
      '"d | rwx | r-x | r-x"',
      'Each character represent a different permission: r: readable w: writable x: executable (basically an executable program) -: empty',
      'So in the above example, we see that the user pete has read, write and execute permissions on the file. The group penguins has read and execute permissions. And finally, the other users (everyone else) has read and execute permissions.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘File Permissions’ cover?',
        'File Permissions',
        ['File Permissions', 'Modifying Permissions', 'Ownership Permissions', 'Umask'],
        'This lesson is ‘File Permissions’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ls -l Desktop/',
        ['ls', '-l', 'Desktop/'],
        ['ls', '-l', 'Desktop/', 'sudo', '-la'],
        'Type it exactly as shown: ls -l Desktop/. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “As we learned previously, files have different permissions or file modes. Let\'s look at an example:” — which lesson is this?',
        'File Permissions',
        ['File Permissions', 'Modifying Permissions', 'Ownership Permissions', 'Umask'],
        'Those opening lines are from ‘File Permissions’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘File Permissions’ lesson?',
        'd',
        ['d', 'core', 'echo Hello World', 'pwd'],
        'The ‘File Permissions’ lesson mentions “d” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “"ls -l Desktop/" drwxr-xr-x 2 pete penguins 4096 Dec 1 11:45 .” — which lesson is this?',
        'File Permissions',
        ['File Permissions', 'Modifying Permissions', 'Ownership Permissions', 'Umask'],
        'Those lines are from ‘File Permissions’.'
      ),
    ],
  },
  'linux-permissions-2': {
    id: 'linux-permissions-2',
    title: 'Modifying Permissions',
    theory: [
      'Changing permissions can easily be done with the "chmod" command. First, pick which permission set you want to change, user, group or other. You can add or remove permissions with a "+" or "-", let\'s look at some examples.',
      'Adding permission bit on a file: "chmod u+x myfile"',
      'The above command reads like this: change permission on myfile by adding executable permission bit on the user set. So now the user has executable permission on this file!',
      'Removing permission bit on a file: "chmod u-x myfile"',
      'Adding multiple permission bits on a file: "chmod ug+w"',
      'There is another way to change permissions using numerical format. This method allows you to change permissions all at once. Instead of using r, w, or x to represent permissions, you\'ll use a numerical representation for a single permission set. So no need to specify the group with g or the user with u.',
      'The numerical representations are seen below:',
      '4: read permission 2: write permission 1: execute permission',
      'Let\'s look at an example: "chmod 755 myfile"',
      'Can you guess what permissions we are giving this file? Let\'s break this down, so now 755 covers the permissions for all sets. The first number (7) represents user permissions, the second number (5) represents group permissions and the last 5 represents other permissions.',
      'Wait a minute, 7 and 5 weren\'t listed above, where are we getting these numbers? Remember we are combining all the permissions into one number now, so you\'ll have to get some math involved.',
      '7 = 4 + 2 + 1, so 7 is the user permissions and it has read, write and execute permissions 5 = 4 + 1, the group has read and execute permissions 5 = 4 +1, and all other users have read and execute permissions',
      'One thing to note: it\'s not a great idea to be changing permissions nilly willy, you could potentially expose a sensitive file for everyone to modify, however many times you legitimately want to change permissions, just take precaution when using the chmod command.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Modifying Permissions’ cover?',
        'Modifying Permissions',
        ['Modifying Permissions', 'File Permissions', 'Ownership Permissions', 'Umask'],
        'This lesson is ‘Modifying Permissions’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: chmod u+x myfile',
        ['chmod', 'u+x', 'myfile'],
        ['chmod', 'u+x', 'myfile', 'sudo', '-la'],
        'Type it exactly as shown: chmod u+x myfile. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Changing permissions can easily be done with the "chmod" command. First, pick which permission set you want to change, user, group or other. You can add or rem…” — which lesson is this?',
        'Modifying Permissions',
        ['Modifying Permissions', 'File Permissions', 'Ownership Permissions', 'Umask'],
        'Those opening lines are from ‘Modifying Permissions’.'
      ),
      BUILD(
        'Assemble another command from this lesson: chmod u-x myfile',
        ['chmod', 'u-x', 'myfile'],
        ['chmod', 'u-x', 'myfile', 'sudo', '-la'],
        'Type it exactly as shown: chmod u-x myfile.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Modifying Permissions’ lesson?',
        'chmod ug+w',
        ['chmod ug+w', 'core', 'echo Hello World', 'pwd'],
        'The ‘Modifying Permissions’ lesson mentions “chmod ug+w” — find it in the theory above.'
      ),
    ],
  },
  'linux-permissions-3': {
    id: 'linux-permissions-3',
    title: 'Ownership Permissions',
    theory: [
      'In addition to modifying permissions on files, you can also modify the group and user ownership of the file as well.',
      'Modify user ownership: "sudo chown patty myfile"',
      'This command will set the owner of myfile to patty.',
      'Modify group ownership: "sudo chgrp whales myfile"',
      'This command will set the group of myfile to whales.',
      'Modify both user and group ownership at the same time: If you add a colon and groupname after the user you can set both the user and group at the same time.',
      '"sudo chown patty:whales myfile"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Ownership Permissions’ cover?',
        'Ownership Permissions',
        ['Ownership Permissions', 'File Permissions', 'Modifying Permissions', 'Umask'],
        'This lesson is ‘Ownership Permissions’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo chown patty myfile',
        ['sudo', 'chown', 'patty', 'myfile'],
        ['sudo', 'chown', 'patty', 'myfile', '-la', '-r'],
        'Type it exactly as shown: sudo chown patty myfile. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “In addition to modifying permissions on files, you can also modify the group and user ownership of the file as well.” — which lesson is this?',
        'Ownership Permissions',
        ['Ownership Permissions', 'File Permissions', 'Modifying Permissions', 'Umask'],
        'Those opening lines are from ‘Ownership Permissions’.'
      ),
      BUILD(
        'Assemble another command from this lesson: sudo chgrp whales myfile',
        ['sudo', 'chgrp', 'whales', 'myfile'],
        ['sudo', 'chgrp', 'whales', 'myfile', '-la', '-r'],
        'Type it exactly as shown: sudo chgrp whales myfile.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Ownership Permissions’ lesson?',
        'sudo chown patty:whales myfile',
        ['sudo chown patty:whales myfile', 'core', 'echo Hello World', 'pwd'],
        'The ‘Ownership Permissions’ lesson mentions “sudo chown patty:whales myfile” — find it in the theory above.'
      ),
    ],
  },
  'linux-permissions-4': {
    id: 'linux-permissions-4',
    title: 'Umask',
    theory: [
      'Every file that gets created comes with a default set of permissions. If you ever wanted to change that default set of permissions, you can do so with the umask command. This command takes the 3 bit permission set we see in numerical permissions.',
      'Instead of adding these permissions though, umask TAKES AWAY these permissions.',
      '"umask 021"',
      'In the above example, we are stating that we want the default permissions of new files to allow users access to everything, but for groups we want to take away their write permission and for others we want to take away their executable permission. The default umask on most distributions is 022, meaning all user access, but no write access for group and other users.',
      'When you run the umask command it will give that default set of permissions on any new file you make. However, if you want it to persist you\'ll have to modify your startup file (.profile), but we\'ll discuss that in a later lesson.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Umask’ cover?',
        'Umask',
        ['Umask', 'File Permissions', 'Modifying Permissions', 'Ownership Permissions'],
        'This lesson is ‘Umask’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: umask 021',
        ['umask', '021'],
        ['umask', '021', 'sudo', '-la'],
        'Type it exactly as shown: umask 021. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Every file that gets created comes with a default set of permissions. If you ever wanted to change that default set of permissions, you can do so with the umas…” — which lesson is this?',
        'Umask',
        ['Umask', 'File Permissions', 'Modifying Permissions', 'Ownership Permissions'],
        'Those opening lines are from ‘Umask’.'
      ),
      MCQ(
        'The lesson continues with: “Instead of adding these permissions though, umask TAKES AWAY these permissions.” — which lesson is this?',
        'Umask',
        ['Umask', 'File Permissions', 'Modifying Permissions', 'Ownership Permissions'],
        'Those lines are from ‘Umask’.'
      ),
    ],
  },
  'linux-permissions-5': {
    id: 'linux-permissions-5',
    title: 'Setuid',
    theory: [
      'There are many cases in which normal users need elevated access to do stuff. The system administrator can\'t always be there to enter in a root password every time a user needed access to a protected file, so there are special file permission bits to allow this behavior. The Set User ID (SUID) allows a user to run a program as the owner of the program file rather than as themselves.',
      'Let\'s look at an example: Let\'s say I want to change my password, simple right? I just use the passwd command: "passwd"',
      'What is the password command doing? It\'s modifying a couple of files, but most importantly it\'s modifying the /etc/shadow file. Let\'s look at that file for a second: "ls -l /etc/shadow" -rw-r----- 1 root shadow 1134 Dec 1 11:45 /etc/shadow',
      'Oh wait a minute here, this file is owned by root? How is it possible that we are able to modify a file owned by root?',
      'Let\'s look at another permission set, this time of the command we ran: "ls -l /usr/bin/passwd"',
      '-rwsr-xr-x 1 root root 47032 Dec 1 11:45 /usr/bin/passwd',
      'You\'ll notice a new permission bit here "s". This permission bit is the SUID, when a file has this permission set, it allows the users who launched the program to get the file owner\'s permission as well as execution permission, in this case root. So essentially while a user is running the password command, they are running as root.',
      'That\'s why we are able to access a protected file like "/etc/shadow" when we run the passwd command. Now if you removed that bit, you would see that you will not be able to modify "/etc/shadow" and therefore change your password.',
      'Modifying SUID: Just like regular permissions there are two ways to modify SUID permissions.',
      'Symbolic way: "sudo chmod u+s myfile"',
      'Numerical way: "sudo chmod 4755 myfile"',
      'As you can see the SUID is denoted by a 4 and pre-pended to the permission set. You may see the SUID denoted as a capital "S" this means that it still does the same thing, but it does not have execute permissions.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Setuid’ cover?',
        'Setuid',
        ['Setuid', 'File Permissions', 'Modifying Permissions', 'Ownership Permissions'],
        'This lesson is ‘Setuid’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ls -l /etc/shadow',
        ['ls', '-l', '/etc/shadow'],
        ['ls', '-l', '/etc/shadow', 'sudo', '-la'],
        'Type it exactly as shown: ls -l /etc/shadow. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “There are many cases in which normal users need elevated access to do stuff. The system administrator can\'t always be there to enter in a root password every t…” — which lesson is this?',
        'Setuid',
        ['Setuid', 'File Permissions', 'Modifying Permissions', 'Ownership Permissions'],
        'Those opening lines are from ‘Setuid’.'
      ),
      BUILD(
        'Assemble another command from this lesson: ls -l /usr/bin/passwd',
        ['ls', '-l', '/usr/bin/passwd'],
        ['ls', '-l', '/usr/bin/passwd', 'sudo', '-la'],
        'Type it exactly as shown: ls -l /usr/bin/passwd.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Setuid’ lesson?',
        'sudo chmod u+s myfile',
        ['sudo chmod u+s myfile', 'core', 'echo Hello World', 'pwd'],
        'The ‘Setuid’ lesson mentions “sudo chmod u+s myfile” — find it in the theory above.'
      ),
    ],
  },
  'linux-permissions-6': {
    id: 'linux-permissions-6',
    title: 'Setgid',
    theory: [
      'Similar to the set user ID permission bit, there is a set group ID (SGID) permission bit. This bit allows a program to run as if it was a member of that group.',
      'Let\'s look at one example: "ls -l /usr/bin/wall" -rwxr-sr-x 1 root tty 19024 Dec 14 11:45 /usr/bin/wall',
      'We can see now that the permission bit is in the group permission set.',
      'Modifying SGID: "sudo chmod g+s myfile" "sudo chmod 2555 myfile"',
      'The numerical representation for SGID is 2.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Setgid’ cover?',
        'Setgid',
        ['Setgid', 'File Permissions', 'Modifying Permissions', 'Ownership Permissions'],
        'This lesson is ‘Setgid’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ls -l /usr/bin/wall',
        ['ls', '-l', '/usr/bin/wall'],
        ['ls', '-l', '/usr/bin/wall', 'sudo', '-la'],
        'Type it exactly as shown: ls -l /usr/bin/wall. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Similar to the set user ID permission bit, there is a set group ID (SGID) permission bit. This bit allows a program to run as if it was a member of that group.” — which lesson is this?',
        'Setgid',
        ['Setgid', 'File Permissions', 'Modifying Permissions', 'Ownership Permissions'],
        'Those opening lines are from ‘Setgid’.'
      ),
      BUILD(
        'Assemble another command from this lesson: sudo chmod g+s myfile',
        ['sudo', 'chmod', 'g+s', 'myfile'],
        ['sudo', 'chmod', 'g+s', 'myfile', '-la', '-r'],
        'Type it exactly as shown: sudo chmod g+s myfile.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Setgid’ lesson?',
        'sudo chmod 2555 myfile',
        ['sudo chmod 2555 myfile', 'core', 'echo Hello World', 'pwd'],
        'The ‘Setgid’ lesson mentions “sudo chmod 2555 myfile” — find it in the theory above.'
      ),
    ],
  },
  'linux-permissions-7': {
    id: 'linux-permissions-7',
    title: 'Process Permissions',
    theory: [
      'Let\'s segway into process permissions for a bit, remember how I told you that when you run the passwd command with the SUID permission bit enabled you will run the program as root? That is true, however does that mean since you are temporarily root you can modify other user\'s passwords? Nope fortunately not!',
      'This is because of the many UIDs that Linux implements. There are three UIDS associated with every process:',
      'When you launch a process, it runs with the same permissions as the user or group that ran it, this is known as an "effective user ID". This UID is used to grant access rights to a process. So naturally if Bob ran the touch command, the process would run as him and any files he created would be under his ownership.',
      'There is another UID, called the "real user ID" this is the ID of the user that launched the process. These are used to track down who the user who launched the process is.',
      'One last UID is the "saved user ID", this allows a process to switch between the effective UID and real UID, vice versa. This is useful because we don\'t want our process to run with elevated privileges all the time, it\'s just good practice to use special privileges at specific times.',
      'Now let\'s piece these all together by looking at the passwd command once more. When running the passwd command, your effective UID is your user ID, let\'s say its 500 for now. Oh but wait, remember the passwd command has the SUID permission enabled. So when you run it, your effective UID is now 0 (0 is the UID of root). Now this program can access files as root.',
      'Let\'s say you get a little taste of power and you want to modify Sally\'s password, Sally has a UID of 600. Well you\'ll be out of luck, fortunately the process also has your real UID in this case 500. It knows that your UID is 500 and therefore you can\'t modify the password of UID of 600. (This of course is always bypassed if you are a superuser on a machine and can control and change everything).',
      'Since you ran passwd, it will start the process off using your real UID, and it will save the UID of the owner of the file (effective UID), so you can switch between the two. No need to modify all files with root access if it\'s not required.',
      'Most of the time the real UID and the effective UID are the same, but in such cases as the passwd command they will change.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Process Permissions’ cover?',
        'Process Permissions',
        ['Process Permissions', 'File Permissions', 'Modifying Permissions', 'Ownership Permissions'],
        'This lesson is ‘Process Permissions’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: effective user ID',
        ['effective', 'user', 'ID'],
        ['effective', 'user', 'ID', 'sudo', '-la'],
        'Type it exactly as shown: effective user ID. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Let\'s segway into process permissions for a bit, remember how I told you that when you run the passwd command with the SUID permission bit enabled you will run…” — which lesson is this?',
        'Process Permissions',
        ['Process Permissions', 'File Permissions', 'Modifying Permissions', 'Ownership Permissions'],
        'Those opening lines are from ‘Process Permissions’.'
      ),
      BUILD(
        'Assemble another command from this lesson: real user ID',
        ['real', 'user', 'ID'],
        ['real', 'user', 'ID', 'sudo', '-la'],
        'Type it exactly as shown: real user ID.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Process Permissions’ lesson?',
        'saved user ID',
        ['saved user ID', 'core', 'echo Hello World', 'pwd'],
        'The ‘Process Permissions’ lesson mentions “saved user ID” — find it in the theory above.'
      ),
    ],
  },
  'linux-permissions-8': {
    id: 'linux-permissions-8',
    title: 'Sticky Bit',
    theory: [
      'One last special permission bit I want to talk about is the sticky bit.',
      'This permission bit, "sticks a file/directory" this means that only the owner or the root user can delete or modify the file. This is very useful for shared directories. Take a look at the example below:',
      '"ls -ld /tmp" drwxrwxrwxt 6 root root 4096 Dec 15 11:45 /tmp',
      'You\'ll see a special permission bit at the end here "t", this means everyone can add files, write files, modify files in the /tmp directory, but only root can delete the /tmp directory.',
      'Modify sticky bit: "sudo chmod +t mydir" "sudo chmod 1755 mydir"',
      'The numerical representation for the sticky bit is "1"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Sticky Bit’ cover?',
        'Sticky Bit',
        ['Sticky Bit', 'File Permissions', 'Modifying Permissions', 'Ownership Permissions'],
        'This lesson is ‘Sticky Bit’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sticks a file/directory',
        ['sticks', 'a', 'file/directory'],
        ['sticks', 'a', 'file/directory', 'sudo', '-la'],
        'Type it exactly as shown: sticks a file/directory. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “One last special permission bit I want to talk about is the sticky bit.” — which lesson is this?',
        'Sticky Bit',
        ['Sticky Bit', 'File Permissions', 'Modifying Permissions', 'Ownership Permissions'],
        'Those opening lines are from ‘Sticky Bit’.'
      ),
      BUILD(
        'Assemble another command from this lesson: ls -ld /tmp',
        ['ls', '-ld', '/tmp'],
        ['ls', '-ld', '/tmp', 'sudo', '-la'],
        'Type it exactly as shown: ls -ld /tmp.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Sticky Bit’ lesson?',
        'sudo chmod +t mydir',
        ['sudo chmod +t mydir', 'core', 'echo Hello World', 'pwd'],
        'The ‘Sticky Bit’ lesson mentions “sudo chmod +t mydir” — find it in the theory above.'
      ),
    ],
  },
  'linux-process-1': {
    id: 'linux-process-1',
    title: 'Monitor Process',
    theory: [
      'Processes are the programs that are running on your machine. They are managed by the kernel and each process has an ID associated with it called the "process ID (PID)." This PID is assigned in the order that processes are created.',
      'Go ahead and run the ps command to see a list of running processes: "ps" PID TTY STAT TIME CMD 41230 pts/4 Ss 00:00:00 bash 51224 pts/4 R+ 00:00:00 ps',
      'This shows you a quick snapshot of the current processes:',
      'PID: Process ID TTY: Controlling terminal associated with the process (we\'ll go in detail about this later) STAT: Process status code TIME: Total CPU usage time CMD: Name of executable/command',
      'If you look at the man page for ps you\'ll see that there are lots of command options you can pass, they will vary depending on what options you want to use - BSD, GNU or Unix. In my opinion the BSD style is more popular to use, so we\'re gonna go with that. If you are curious the difference between the styles is the amount of dashes you use and the flags.',
      '"ps aux"',
      '1- The "a" displays all processes running, including the ones being ran by other users. 2- The "u" shows more details about the processes. 3- And finally the "x" lists all processes that don\'t have a TTY associated with it, these programs will show a ? in the TTY field, they are most common in daemon processes that launch as part of the system startup.',
      'You\'ll notice you\'re seeing a lot more fields now, no need to memorize them all, in a later course on advanced processes, we\'ll go over some of these again:',
      'USER: The effective user (the one whose access we are using) PID: Process ID %CPU: CPU time used divided by the time the process has been running %MEM: Ratio of the process\'s resident set size to the physical memory on the machine VSZ: Virtual memory usage of the entire process RSS: Resident set size, the non-swapped physical memory that a task has used TTY: Controlling terminal associated with the process STAT: Process status code START: Start time of the process TIME: Total CPU usage time COMMAND: Name of executable/command',
      'The ps command can get a little messy to look at, for now the fields we will look at the most are PID, STAT and COMMAND.',
      'Another very useful command is the "top" command, top gives you real time information about the processes running on your system instead of a snapshot. By default you\'ll get a refresh every 10 seconds. Top is an extremely useful tool to see what processes are taking up a lot of your resources. Go ahead and launch it by typing: "top"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Monitor Process’ cover?',
        'Monitor Process',
        ['Monitor Process', 'Controlling Terminal', 'Process Details', 'Process Creation'],
        'This lesson is ‘Monitor Process’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: process ID (PID).',
        ['process', 'ID', '(PID).'],
        ['process', 'ID', '(PID).', 'sudo', '-la'],
        'Type it exactly as shown: process ID (PID).. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Processes are the programs that are running on your machine. They are managed by the kernel and each process has an ID associated with it called the "process I…” — which lesson is this?',
        'Monitor Process',
        ['Monitor Process', 'Controlling Terminal', 'Process Details', 'Process Creation'],
        'Those opening lines are from ‘Monitor Process’.'
      ),
      BUILD(
        'Assemble another command from this lesson: ps aux',
        ['ps', 'aux'],
        ['ps', 'aux', 'sudo', '-la'],
        'Type it exactly as shown: ps aux.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Monitor Process’ lesson?',
        'ps',
        ['ps', 'core', 'echo Hello World', 'pwd'],
        'The ‘Monitor Process’ lesson mentions “ps” — find it in the theory above.'
      ),
    ],
  },
  'linux-process-2': {
    id: 'linux-process-2',
    title: 'Controlling Terminal',
    theory: [
      'We discussed how there is a TTY field in the ps output. The TTY is the terminal that executed the command.',
      'There are two types of terminals, "regular terminal devices" and "pseudoterminal devices". A regular terminal device is a native terminal device that you can type into and send output to your system, this sounds like the terminal application you\'ve been launching to get to your shell, but it\'s not.',
      'We\'re gonna segue so you can see this action, go ahead and type Ctrl-Alt-F1 to get into TTY1 (the first virtual console), you\'ll notice how you don\'t have anything except the terminal, no graphics, etc. This is considered a "regular terminal device", you can exit this with Ctrl-Alt-F7.',
      'A pseudoterminal is what you\'ve been used to working in, they emulate terminals with the shell terminal window and are denoted by PTS . If you look at ps again, you\'ll see your shell process under pts/*.',
      'Ok, now circling back to the controlling terminal, processes are usually bound to a controlling terminal. For example, if you were running a program on your shell window such as find and you closed the window, your process would also go with it.',
      'There are processes such as daemon processes, which are special processes that are essentially keeping the system running. They often start at system boot and usually get terminated when the system is shutdown. They run in the background and since we don\'t want these special processes to get terminated they are not bound to a controlling terminal. In the ps output, the TTY is listed as a "?" meaning it does not have a controlling terminal.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Controlling Terminal’ cover?',
        'Controlling Terminal',
        ['Controlling Terminal', 'Monitor Process', 'Process Details', 'Process Creation'],
        'This lesson is ‘Controlling Terminal’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: regular terminal devices',
        ['regular', 'terminal', 'devices'],
        ['regular', 'terminal', 'devices', 'sudo', '-la'],
        'Type it exactly as shown: regular terminal devices. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “We discussed how there is a TTY field in the ps output. The TTY is the terminal that executed the command.” — which lesson is this?',
        'Controlling Terminal',
        ['Controlling Terminal', 'Monitor Process', 'Process Details', 'Process Creation'],
        'Those opening lines are from ‘Controlling Terminal’.'
      ),
      BUILD(
        'Assemble another command from this lesson: pseudoterminal devices',
        ['pseudoterminal', 'devices'],
        ['pseudoterminal', 'devices', 'sudo', '-la'],
        'Type it exactly as shown: pseudoterminal devices.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Controlling Terminal’ lesson?',
        'regular terminal device',
        ['regular terminal device', 'core', 'echo Hello World', 'pwd'],
        'The ‘Controlling Terminal’ lesson mentions “regular terminal device” — find it in the theory above.'
      ),
    ],
  },
  'linux-process-3': {
    id: 'linux-process-3',
    title: 'Process Details',
    theory: [
      'Before we get into more practical applications of processes, we have to first understand what they are and how they work. This part can get confusing since we are diving into the nitty gritty, so feel free to come back to this lesson if you don\'t want to learn about it now.',
      'A process like we said before is a running program on the system, more precisely it\'s the system allocating memory, CPU, I/O to make the program run. A process is an instance of a running program, go ahead and open 3 terminal windows, in two windows, run the "cat" command without passing any options (the cat process will stay open as a process because it expects stdin). Now in the third window run: "ps aux | grep cat". You\'ll see that there are two processes for cat, even though they are calling the same program.',
      'The kernel is in charge of processes, when we run a program the kernel loads up the code of the program in memory, determines and allocates resources and then keeps tabs on each process, it knows:',
      '1- The status of the process 2- The resources the process is using and receives 3- The process owner 4- Signal handling (more on that later) 5- And basically everything else',
      'All processes are trying to get a taste of that sweet resource pie, it\'s the kernel\'s job to make sure that processes get the right amount of resources depending on process demands. When a process ends, the resources it used are now freed up for other processes.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Process Details’ cover?',
        'Process Details',
        ['Process Details', 'Monitor Process', 'Controlling Terminal', 'Process Creation'],
        'This lesson is ‘Process Details’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ps aux | grep cat',
        ['ps', 'aux', '|', 'grep', 'cat'],
        ['ps', 'aux', '|', 'grep', 'cat', 'sudo', '-la'],
        'Type it exactly as shown: ps aux | grep cat. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Before we get into more practical applications of processes, we have to first understand what they are and how they work. This part can get confusing since we…” — which lesson is this?',
        'Process Details',
        ['Process Details', 'Monitor Process', 'Controlling Terminal', 'Process Creation'],
        'Those opening lines are from ‘Process Details’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Process Details’ lesson?',
        'cat',
        ['cat', 'core', 'echo Hello World', 'pwd'],
        'The ‘Process Details’ lesson mentions “cat” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “A process like we said before is a running program on the system, more precisely it\'s the system allocating memory, CPU, I/O to make the program run. A process…” — which lesson is this?',
        'Process Details',
        ['Process Details', 'Monitor Process', 'Controlling Terminal', 'Process Creation'],
        'Those lines are from ‘Process Details’.'
      ),
    ],
  },
  'linux-process-4': {
    id: 'linux-process-4',
    title: 'Process Creation',
    theory: [
      'Again this lesson and the next are purely information to let you see what\'s under the hood, feel free to circle back to this once you\'ve worked with processes a bit more.',
      'When a new process is created, an existing process basically clones itself using something called the fork system call (system calls will be discussed very far into the future). The fork system call creates a mostly identical child process, this child process takes on a new process ID (PID), and the original process becomes its parent process and has something called a parent process ID (PPID).',
      'Afterwards, the child process can either continue to use the same program its parent was using before or more often use the execve system call to launch up a new program. This system call destroys the memory management that the kernel put into place for that process and sets up new ones for the new program.',
      'We can see this in action: "ps l"',
      'The l option gives us a "long format" or even more detailed view of our running processes. You\'ll see a column labelled "PPID", this is the parent ID. Now look at your terminal, you\'ll see a process running that is your shell, so on my system I have a process running bash. Now remember when you ran the ps l command, you were running it from the process that was running bash. Now you\'ll see that the "PID" of the bash shell is the "PPID" of the "ps l" command.',
      'So if every process has to have a parent and they are just forks of each other, there must be a mother of all processes right? You are correct, when the system boots up, the kernels creates a process called "init", it has a PID of 1. The init process can\'t be terminated unless the system shuts down. It runs with root privileges and runs many processes that keep the system running.',
      'We will take a closer look at init in the system bootup course, for now just know it is the process that spawns all other processes.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Process Creation’ cover?',
        'Process Creation',
        ['Process Creation', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'This lesson is ‘Process Creation’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ps l',
        ['ps', 'l'],
        ['ps', 'l', 'sudo', '-la'],
        'Type it exactly as shown: ps l. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Again this lesson and the next are purely information to let you see what\'s under the hood, feel free to circle back to this once you\'ve worked with processes…” — which lesson is this?',
        'Process Creation',
        ['Process Creation', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'Those opening lines are from ‘Process Creation’.'
      ),
      BUILD(
        'Assemble another command from this lesson: long format',
        ['long', 'format'],
        ['long', 'format', 'sudo', '-la'],
        'Type it exactly as shown: long format.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Process Creation’ lesson?',
        'init',
        ['init', 'core', 'echo Hello World', 'pwd'],
        'The ‘Process Creation’ lesson mentions “init” — find it in the theory above.'
      ),
    ],
  },
  'linux-process-5': {
    id: 'linux-process-5',
    title: 'Process Termination',
    theory: [
      'Now that we know what goes on when a process gets created, what is happening when we don\'t need it anymore? Be forewarned, sometimes Linux can get a little dark...',
      'A process can exit using the _exit system call, this will free up the resources that process was using for reallocation. So when a process is ready to terminate, it lets the kernel know why it\'s terminating with something called a termination status. Most commonly a status of 0 means that the process succeeded.',
      'However, that\'s not enough to completely terminate a process. The parent process has to acknowledge the termination of the child process by using the wait system call and what this does is it checks the termination status of the child process. I know it\'s gruesome to think about, but the wait call is a necessity, after all what parent wouldn\'t want to know how their child died?',
      'There is another way to terminate a process and that involves using signals, which we will discuss soon.',
      'Orphan Processes: When a parent process dies before a child process, the kernel knows that it\'s not going to get a wait call, so instead it makes these processes "orphans" and puts them under the care of init (remember mother of all processes). Init will eventually perform the wait system call for these orphans so they can die.',
      'Zombie Processes: What happens when a child terminates and the parent process hasn\'t called wait yet? We still want to be able to see how a child process terminated, so even though the child process finished, the kernel turns the child process into a zombie process.',
      'The resources the child process used are still freed up for other processes, however there is still an entry in the process table for this zombie. Zombie processes also cannot be killed, since they are technically "dead", so you can\'t use signals to kill them.',
      'Eventually if the parent process calls the wait system call, the zombie will disappear, this is known as "reaping". If the parent doesn\'t perform a wait call, init will adopt the zombie and automatically perform wait and remove the zombie. It can be a bad thing to have too many zombie processes, since they take up space on the process table, if it fills up it will prevent other processes from running.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Process Termination’ cover?',
        'Process Termination',
        ['Process Termination', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'This lesson is ‘Process Termination’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Now that we know what goes on when a process gets created, what is happening when we don\'t need it anymore? Be forewarned, sometimes Linux can get a little dar…” — which lesson is this?',
        'Process Termination',
        ['Process Termination', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'Those opening lines are from ‘Process Termination’.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Process Termination’ lesson?',
        'orphans',
        ['orphans', 'core', 'echo Hello World', 'pwd'],
        'The ‘Process Termination’ lesson mentions “orphans” — find it in the theory above.'
      ),
      MCQ(
        'The lesson continues with: “A process can exit using the _exit system call, this will free up the resources that process was using for reallocation. So when a process is ready to terminat…” — which lesson is this?',
        'Process Termination',
        ['Process Termination', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'Those lines are from ‘Process Termination’.'
      ),
    ],
  },
  'linux-process-6': {
    id: 'linux-process-6',
    title: 'Process Signals',
    theory: [
      'A signal is a notification to a process that something has happened.',
      'Why we have signals: They are software interrupts and they have lots of uses:',
      '1- A user can type one of the special terminal characters (Ctrl-C) or (Ctrl-Z) to kill, interrupt or suspend processes 2- Hardware issues can occur and the kernel wants to notify the process 3- Software issues can occur and the kernel wants to notify the process 4- They are basically ways processes can communicate',
      'Signal process: When a signal is generated by some event, it\'s then delivered to a process, it\'s considered in a pending state until it\'s delivered. When the process is ran, the signal will be delivered. However, processes have signal masks and they can set signal delivery to be blocked if specified. When a signal is delivered, a process can do a multitude of things:',
      '1- Ignore the signal 2- "Catch" the signal and perform a specific handler routine 3- Process can be terminated, as opposed to the normal exit system call 4- Block the signal, depending on the signal mask',
      'Common signals:',
      'Each signal is defined by integers with symbolic names that are in the form of SIGxxx. Some of the most common signals are:',
      'SIGHUP or HUP or 1: Hangup SIGINT or INT or 2: Interrupt SIGKILL or KILL or 9: Kill SIGSEGV or SEGV or 11: Segmentation fault SIGTERM or TERM or 15: Software termination SIGSTOP or STOP: Stop',
      'Numbers can vary with signals so they are usually referred by their names.',
      'Some signals are unblockable, one example is the SIGKILL signal. The KILL signal destroys the process.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Process Signals’ cover?',
        'Process Signals',
        ['Process Signals', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'This lesson is ‘Process Signals’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “A signal is a notification to a process that something has happened.” — which lesson is this?',
        'Process Signals',
        ['Process Signals', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'Those opening lines are from ‘Process Signals’.'
      ),
      MCQ(
        'The lesson continues with: “Why we have signals: They are software interrupts and they have lots of uses:” — which lesson is this?',
        'Process Signals',
        ['Process Signals', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'Those lines are from ‘Process Signals’.'
      ),
    ],
  },
  'linux-process-7': {
    id: 'linux-process-7',
    title: 'Killing Processes',
    theory: [
      'You can send signals that terminate processes, such a command is aptly named the kill command. "kill 12445"',
      'The "12445" is the PID of the process you want to kill. By default it sends a TERM signal. The SIGTERM signal is sent to a process to request its termination by allowing it to cleanly release its resources and saving its state.',
      'You can also specify a signal with the kill command:',
      '"kill -9 12445"',
      'This will run the SIGKILL signal and kill the process.',
      'Differences between SIGHUP, SIGINT, SIGTERM, SIGKILL, SIGSTOP? These signals all sound reasonably similar, but they do have their differences.',
      'SIGHUP - Hangup, sent to a process when the controlling terminal is closed. For example, if you closed a terminal window that had a process running in it, you would get a SIGHUP signal. So basically you\'ve been hung up on',
      'SIGINT - Is an interrupt signal, so you can use Ctrl-C and the system will try to gracefully kill the process',
      'SIGTERM - Kill the process, but allow it to do some cleanup first',
      'SIGKILL - Kill the process, kill it with fire, doesn\'t do any cleanup',
      'SIGSTOP - Stop/suspend a process',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Killing Processes’ cover?',
        'Killing Processes',
        ['Killing Processes', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'This lesson is ‘Killing Processes’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: kill 12445',
        ['kill', '12445'],
        ['kill', '12445', 'sudo', '-la'],
        'Type it exactly as shown: kill 12445. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “You can send signals that terminate processes, such a command is aptly named the kill command. "kill 12445"” — which lesson is this?',
        'Killing Processes',
        ['Killing Processes', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'Those opening lines are from ‘Killing Processes’.'
      ),
      BUILD(
        'Assemble another command from this lesson: kill -9 12445',
        ['kill', '-9', '12445'],
        ['kill', '-9', '12445', 'sudo', '-la'],
        'Type it exactly as shown: kill -9 12445.'
      ),
      MCQ(
        'The lesson continues with: “The "12445" is the PID of the process you want to kill. By default it sends a TERM signal. The SIGTERM signal is sent to a process to request its termination b…” — which lesson is this?',
        'Killing Processes',
        ['Killing Processes', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'Those lines are from ‘Killing Processes’.'
      ),
    ],
  },
  'linux-process-8': {
    id: 'linux-process-8',
    title: 'Process Niceness',
    theory: [
      'When you run multiple things on your computer, like perhaps Chrome, Microsoft Word or Photoshop at the same time, it may seem like these processes are running at the same time, but that isn\'t quite true.',
      'Processes use the CPU for a small amount of time called a time slice. Then they pause for milliseconds and another process gets a little time slice.',
      'By default, process scheduling happens in this round-robin fashion. Every process gets enough time slices until it\'s finished processing. The kernel handles all of these switching of processes and it does a pretty good job at it most of the time.',
      'Processes aren\'t able to decide when and how long they get CPU time, if all processes behaved normally they would each (roughly) get an equal amount of CPU time. However, there is a way to influence the kernel\'s process scheduling algorithm with a nice value. Niceness is a pretty weird name, but what it means is that processes have a number to determine their priority for the CPU. A high number means the process is nice and has a lower priority for the CPU and a low or negative number means the process is not very nice and it wants to get as much of the CPU as possible.',
      'Type "top" in your terminal! You can see a column for "NI" right now, that is the niceness level of a process.',
      'To change the niceness level you can use the nice and renice commands: "nice -n 5 apt upgrade"',
      'The nice command is used to set priority for a new process. The renice command is used to set priority on an existing process.',
      '"renice 10 -p 3245"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Process Niceness’ cover?',
        'Process Niceness',
        ['Process Niceness', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'This lesson is ‘Process Niceness’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: nice -n 5 apt upgrade',
        ['nice', '-n', '5', 'apt', 'upgrade'],
        ['nice', '-n', '5', 'apt', 'upgrade', 'sudo', '-la'],
        'Type it exactly as shown: nice -n 5 apt upgrade. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “When you run multiple things on your computer, like perhaps Chrome, Microsoft Word or Photoshop at the same time, it may seem like these processes are running…” — which lesson is this?',
        'Process Niceness',
        ['Process Niceness', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'Those opening lines are from ‘Process Niceness’.'
      ),
      BUILD(
        'Assemble another command from this lesson: renice 10 -p 3245',
        ['renice', '10', '-p', '3245'],
        ['renice', '10', '-p', '3245', 'sudo', '-la'],
        'Type it exactly as shown: renice 10 -p 3245.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Process Niceness’ lesson?',
        'top',
        ['top', 'core', 'echo Hello World', 'pwd'],
        'The ‘Process Niceness’ lesson mentions “top” — find it in the theory above.'
      ),
    ],
  },
  'linux-process-9': {
    id: 'linux-process-9',
    title: 'Process States',
    theory: [
      'Let\'s take a look at the ps aux command again: "ps aux"',
      'In the STAT column, you\'ll see lots of values. A linux process can be in a number of different states. The most common state codes you\'ll see are described below:',
      '1- R: running or runnable, it is just waiting for the CPU to process it',
      '2- S: Interruptible sleep, waiting for an event to complete, such as input from the terminal',
      '3- D: Uninterruptible sleep, processes that cannot be killed or interrupted with a signal, usually to make them go away you have to reboot or fix the issue',
      '4- Z: Zombie, we discussed in a previous lesson that zombies are terminated processes that are waiting to have their statuses collected',
      '5- T: Stopped, a process that has been suspended/stopped',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Process States’ cover?',
        'Process States',
        ['Process States', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'This lesson is ‘Process States’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ps aux',
        ['ps', 'aux'],
        ['ps', 'aux', 'sudo', '-la'],
        'Type it exactly as shown: ps aux. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Let\'s take a look at the ps aux command again: "ps aux"” — which lesson is this?',
        'Process States',
        ['Process States', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'Those opening lines are from ‘Process States’.'
      ),
      MCQ(
        'The lesson continues with: “In the STAT column, you\'ll see lots of values. A linux process can be in a number of different states. The most common state codes you\'ll see are described bel…” — which lesson is this?',
        'Process States',
        ['Process States', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'Those lines are from ‘Process States’.'
      ),
    ],
  },
  'linux-process-10': {
    id: 'linux-process-10',
    title: 'Proc Filesystem',
    theory: [
      'Remember everything in Linux is a file, even processes. Process information is stored in a special filesystem known as the "/proc filesystem".',
      '"ls /proc"',
      'You should see multiple values in here, there are sub-directories for every PID. If you looked at a PID in the ps output, you would be able to find it in the "/proc" directory.',
      'Go ahead and enter one of the processes and look at that file:',
      '"cat /proc/12345/status"',
      'You should see process state information and well as more detailed information.',
      'The "/proc" directory is how the kernel is views the system, so there is a lot more information here than what you would see in ps.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Proc Filesystem’ cover?',
        'Proc Filesystem',
        ['Proc Filesystem', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'This lesson is ‘Proc Filesystem’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ls /proc',
        ['ls', '/proc'],
        ['ls', '/proc', 'sudo', '-la'],
        'Type it exactly as shown: ls /proc. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Remember everything in Linux is a file, even processes. Process information is stored in a special filesystem known as the "/proc filesystem".” — which lesson is this?',
        'Proc Filesystem',
        ['Proc Filesystem', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'Those opening lines are from ‘Proc Filesystem’.'
      ),
      BUILD(
        'Assemble another command from this lesson: cat /proc/12345/status',
        ['cat', '/proc/12345/status'],
        ['cat', '/proc/12345/status', 'sudo', '-la'],
        'Type it exactly as shown: cat /proc/12345/status.'
      ),
      MCQ(
        'The lesson continues with: “"ls /proc"” — which lesson is this?',
        'Proc Filesystem',
        ['Proc Filesystem', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'Those lines are from ‘Proc Filesystem’.'
      ),
    ],
  },
  'linux-process-11': {
    id: 'linux-process-11',
    title: 'Job Control',
    theory: [
      'Let\'s say you\'re working on a single terminal window and you\'re running a command that is taking forever. You can\'t interact with the shell until it is complete, however we want to keep working on our machines, so we need that shell open. Fortunately we can control how our processes run with jobs:',
      'Sending a job to the background: Appending an ampersand (&) to the command will run it in the background so you can still use your shell. Let\'s see an example:',
      '"sleep 1000 &" "sleep 1001 &" "sleep 1002 &"',
      'View all background jobs: "jobs" Now you can view the jobs you just sent to the background. [1] Running sleep 1000 & [2]- Running sleep 1001 & [3]+ Running sleep 1002 &',
      'This will show you the job id in the first column, then the status and the command that was run. The "+" next to the job ID means that it is the most recent background job that started. The job with the "-" is the second most recent command.',
      'Sending a job to the background on existing job: If you already ran a job and want to send it to the background, you don\'t have to terminate it and start over again. First suspend the job with Ctrl-Z, then run the "bg" command to send it to the background.',
      'pete@icebox ~ $ sleep 1003 ^Z [4]+ Stopped sleep 1003',
      'pete@icebox ~ $ bg [4]+ sleep 1003 &',
      'pete@icebox ~ $ jobs',
      '[1] Running sleep 1000 & [2] Running sleep 1001 & [3]- Running sleep 1002 & [4]+ Running sleep 1003 &',
      'Moving a job from the background to the foreground: To move a job out of the background just specify the job ID you want. If you run fg without any options, it will bring back the most recent background job (the job with the + sign next to it) "fg %1"',
      'Kill background jobs: Similar to moving jobs out of the background, you can use the same form to kill the processes by using their Job ID. "kill %1"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Job Control’ cover?',
        'Job Control',
        ['Job Control', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'This lesson is ‘Job Control’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sleep 1000 &',
        ['sleep', '1000', '&'],
        ['sleep', '1000', '&', 'sudo', '-la'],
        'Type it exactly as shown: sleep 1000 &. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Let\'s say you\'re working on a single terminal window and you\'re running a command that is taking forever. You can\'t interact with the shell until it is complet…” — which lesson is this?',
        'Job Control',
        ['Job Control', 'Monitor Process', 'Controlling Terminal', 'Process Details'],
        'Those opening lines are from ‘Job Control’.'
      ),
      BUILD(
        'Assemble another command from this lesson: sleep 1001 &',
        ['sleep', '1001', '&'],
        ['sleep', '1001', '&', 'sudo', '-la'],
        'Type it exactly as shown: sleep 1001 &.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Job Control’ lesson?',
        'sleep 1002 &',
        ['sleep 1002 &', 'core', 'echo Hello World', 'pwd'],
        'The ‘Job Control’ lesson mentions “sleep 1002 &” — find it in the theory above.'
      ),
    ],
  },
  'linux-packages-1': {
    id: 'linux-packages-1',
    title: 'Software Distribution',
    theory: [
      'Your system is comprised of many packages such as internet browsers, text editors, media players, etc. These packages are managed via package managers, which install and maintain the software on your system. Not all packages are installed through package managers though, you can commonly install packages directly from their source code (we\'ll get to that soon).',
      'However the majority of the time you will use a package manager to install software, the most common variety of packages are Debian (.deb) and Red Hat (.rpm). Debian style packages are used in distributions such as Debian, Ubuntu, LinuxMint, etc. Red Hat style packages are seen in Red Hat Enterprise Linux, Fedora, CentOS, etc.',
      'What are packages? You may know them as Chrome, Photoshop, etc and they are, but what they really are just lots and lots of files that have been compiled into one. The people (or sometimes a single person) that write this software are known as "upstream providers", they compile their code and write up how to get it installed. These upstream providers work on getting out new software and update existing software.',
      'When they are ready to release it to the world, they send their package to "package maintainers", who handle getting this piece of software in the hands of the users. These package maintainers review, manage and distribute this software in the form of packages.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Software Distribution’ cover?',
        'Software Distribution',
        ['Software Distribution', 'Packages Repositories', 'Compressed Archives Tar', 'Package Dependencies'],
        'This lesson is ‘Software Distribution’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: upstream providers',
        ['upstream', 'providers'],
        ['upstream', 'providers', 'sudo', '-la'],
        'Type it exactly as shown: upstream providers. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Your system is comprised of many packages such as internet browsers, text editors, media players, etc. These packages are managed via package managers, which i…” — which lesson is this?',
        'Software Distribution',
        ['Software Distribution', 'Packages Repositories', 'Compressed Archives Tar', 'Package Dependencies'],
        'Those opening lines are from ‘Software Distribution’.'
      ),
      BUILD(
        'Assemble another command from this lesson: package maintainers',
        ['package', 'maintainers'],
        ['package', 'maintainers', 'sudo', '-la'],
        'Type it exactly as shown: package maintainers.'
      ),
      MCQ(
        'The lesson continues with: “However the majority of the time you will use a package manager to install software, the most common variety of packages are Debian (.deb) and Red Hat (.rpm).…” — which lesson is this?',
        'Software Distribution',
        ['Software Distribution', 'Packages Repositories', 'Compressed Archives Tar', 'Package Dependencies'],
        'Those lines are from ‘Software Distribution’.'
      ),
    ],
  },
  'linux-packages-2': {
    id: 'linux-packages-2',
    title: 'Packages Repositories',
    theory: [
      'How do packages that get uploaded to the internet somehow end up on our computers? Do you go to the download page of each package you want and click download and install? Well, actually you can do that, but there is something better called package repositories.',
      'Repositories are just a central storage location for packages. There are tons of repositories that hold lots of packages and best of all they are all found on the internet, no silly installation disks. Your machine doesn\'t know where to look for these repositories unless you explicitly tell it where to look.',
      'For example, let\'s say I want WackyWidgets Software on my machine. Well WackyWidgets manages their own repositories for their widget packages, inside this repository are 10 packages, the CoolWidget package, the SuperWidget package, etc. WackyWidgets hosts this repository at a source link called: http://download.widgets/linux/deb/',
      'Now instead of going to their website to download the package directly, you can tell your machine to find WackyWidgets software from the source link.',
      'Your distribution already comes with pre-approved sources to get packages from and this is how it installs all the base packages you see on your system. On a Debian system, this sources file is the "/etc/apt/sources.list" file. Your machine will know to look there and check for any source repositories you added.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Packages Repositories’ cover?',
        'Packages Repositories',
        ['Packages Repositories', 'Software Distribution', 'Compressed Archives Tar', 'Package Dependencies'],
        'This lesson is ‘Packages Repositories’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “How do packages that get uploaded to the internet somehow end up on our computers? Do you go to the download page of each package you want and click download a…” — which lesson is this?',
        'Packages Repositories',
        ['Packages Repositories', 'Software Distribution', 'Compressed Archives Tar', 'Package Dependencies'],
        'Those opening lines are from ‘Packages Repositories’.'
      ),
      MCQ(
        'The lesson continues with: “Repositories are just a central storage location for packages. There are tons of repositories that hold lots of packages and best of all they are all found on…” — which lesson is this?',
        'Packages Repositories',
        ['Packages Repositories', 'Software Distribution', 'Compressed Archives Tar', 'Package Dependencies'],
        'Those lines are from ‘Packages Repositories’.'
      ),
    ],
  },
  'linux-packages-3': {
    id: 'linux-packages-3',
    title: 'Compressed Archives Tar',
    theory: [
      'Before we get into package installation and the different managers, we need to discuss archiving and compressing files, because you will most likely encounter these when you hunt for software on the internet.',
      'You probably already know what a file archive is, you\'ve most likely encountered file types such as .rar and .zip. These are an archive of files, they contain many files inside of them, but they come in this very neat single file known as an archive.',
      'Compressing files with gzip: gzip is program used to compress files in Linux, they end in a .gz extension.',
      'To compress a file down: "gzip mycoolfile"',
      'To decompress the file: "gunzip mycoolfile.gz"',
      'Creating archives with tar: Unfortunately, gzip can\'t add multiple files into one archive for us. Luckily we have the tar program which does. When you create an archive using tar, it will have a .tar extension.',
      '"tar cvf mytarfile.tar mycoolfile1 mycoolfile 2"',
      '1- c - create 2- v - tell the program to be verbose and let us see what it\'s doing 3- f - the filename of the tar file has to come after this option, if you are creating a tar file you\'ll have to come up with a name',
      'Unpacking archives with tar: To extract the contents of a tar file, use:',
      '"tar xvf mytarfile.tar"',
      '1- x - extract 2- v - tell the program to be verbose and let us see what it\'s doing 3- f - the file you want to extract',
      'Compressing/uncompressing archives with tar and gzip: Many times you\'ll see a tar file that has been compressed such as: mycompressedarchive.tar.gz, all you need to do is work outside in, so first remove the compression with gunzip and then you can unpack the tar file. Or you can alternatively use the "z" option with tar, which just tells it to use the gzip or gunzip utility.',
      'Create a compressed tar file: "tar czf myfile.tar.gz"',
      'Uncompress and unpack: "tar xzf file.tar"',
      'If you need help remember this: e"X"tract all "Z"ee "F"iles!',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Compressed Archives Tar’ cover?',
        'Compressed Archives Tar',
        ['Compressed Archives Tar', 'Software Distribution', 'Packages Repositories', 'Package Dependencies'],
        'This lesson is ‘Compressed Archives Tar’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: gzip mycoolfile',
        ['gzip', 'mycoolfile'],
        ['gzip', 'mycoolfile', 'sudo', '-la'],
        'Type it exactly as shown: gzip mycoolfile. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Before we get into package installation and the different managers, we need to discuss archiving and compressing files, because you will most likely encounter…” — which lesson is this?',
        'Compressed Archives Tar',
        ['Compressed Archives Tar', 'Software Distribution', 'Packages Repositories', 'Package Dependencies'],
        'Those opening lines are from ‘Compressed Archives Tar’.'
      ),
      BUILD(
        'Assemble another command from this lesson: gunzip mycoolfile.gz',
        ['gunzip', 'mycoolfile.gz'],
        ['gunzip', 'mycoolfile.gz', 'sudo', '-la'],
        'Type it exactly as shown: gunzip mycoolfile.gz.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Compressed Archives Tar’ lesson?',
        'tar xvf mytarfile.tar',
        ['tar xvf mytarfile.tar', 'core', 'echo Hello World', 'pwd'],
        'The ‘Compressed Archives Tar’ lesson mentions “tar xvf mytarfile.tar” — find it in the theory above.'
      ),
    ],
  },
  'linux-packages-4': {
    id: 'linux-packages-4',
    title: 'Package Dependencies',
    theory: [
      'Packages very rarely work by themselves, they are most often accompanied by dependencies to help them run. For example, let\'s say we have a group of restaurants, these restaurants all make different cuisine, however they all get their ingredients from the same farm. Their food is dependent on the farm\'s supplies, if the farm were to suddenly stop supplying food, well then the restaurants would be in a pretty bad state.',
      'In Linux, these dependencies are often other packages or shared libraries. Shared libraries are libraries of code that other programs want to use and don\'t want to have to rewrite for themselves. Think of the restaurant again, how much work would it be if every restaurant also farmed their own food? Too much!',
      'We will dig more into shared libraries in the filesystem course, so for now just remember that packages have dependencies to help them run, whether those dependencies are other packages or libraries, if the dependencies aren\'t there the package will end up in a broken state and most of the time not even install.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Package Dependencies’ cover?',
        'Package Dependencies',
        ['Package Dependencies', 'Software Distribution', 'Packages Repositories', 'Compressed Archives Tar'],
        'This lesson is ‘Package Dependencies’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Packages very rarely work by themselves, they are most often accompanied by dependencies to help them run. For example, let\'s say we have a group of restaurant…” — which lesson is this?',
        'Package Dependencies',
        ['Package Dependencies', 'Software Distribution', 'Packages Repositories', 'Compressed Archives Tar'],
        'Those opening lines are from ‘Package Dependencies’.'
      ),
      MCQ(
        'The lesson continues with: “In Linux, these dependencies are often other packages or shared libraries. Shared libraries are libraries of code that other programs want to use and don\'t wan…” — which lesson is this?',
        'Package Dependencies',
        ['Package Dependencies', 'Software Distribution', 'Packages Repositories', 'Compressed Archives Tar'],
        'Those lines are from ‘Package Dependencies’.'
      ),
    ],
  },
  'linux-packages-5': {
    id: 'linux-packages-5',
    title: 'Package Install Tools',
    theory: [
      'Although most of this course is about package management systems (the Batmans of package management), we mustn\'t forget about the Robins. Although very useful and reliable, they don\'t come with that sweet batmobile and utility belt.',
      'Just like .exe is a single executable file, so is .deb and .rpm. You normally wouldn\'t see these if you use package repositories, but if you directly download packages, you will most likely get them in these popular format. Obviously, they are exclusive to their distributions, .deb for Debian based and .rpm for Red Hat based.',
      'To install these direct packages, you can use the package management commands: rpm and dpkg.',
      'These tools are used to install package files, however they will not install the package dependencies, so if your package had 10 dependencies, you would have to install those packages separately and then their dependencies and so on and so forth. As you can see, that was one of the reasons that brought forth the full blown management systems that we will discuss this later.',
      'Keep in mind that there will be countless times when you need to install, query or verify a package with one of these tools, so remember these commands.',
      'Install a package: Debian: "dpkg -i some_deb_package.deb" RPM: "rpm -i some_rpm_package.rpm"',
      'The "i" stands for install. You can also use the longer format of --install.',
      'Remove a package: Debian: "dpkg -r some_deb_package.deb" RPM: "rpm -e some_rpm_package.rpm"',
      'Debian: "r" for remove RPM: "e" for erase',
      'List installed packages: Debian: "dpkg -l" RPM: "rpm -qa"',
      'Debian: "l" for list RPM: "q" for query and "a" for all',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Package Install Tools’ cover?',
        'Package Install Tools',
        ['Package Install Tools', 'Software Distribution', 'Packages Repositories', 'Compressed Archives Tar'],
        'This lesson is ‘Package Install Tools’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: dpkg -i some_deb_package.deb',
        ['dpkg', '-i', 'some_deb_package.deb'],
        ['dpkg', '-i', 'some_deb_package.deb', 'sudo', '-la'],
        'Type it exactly as shown: dpkg -i some_deb_package.deb. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Although most of this course is about package management systems (the Batmans of package management), we mustn\'t forget about the Robins. Although very useful…” — which lesson is this?',
        'Package Install Tools',
        ['Package Install Tools', 'Software Distribution', 'Packages Repositories', 'Compressed Archives Tar'],
        'Those opening lines are from ‘Package Install Tools’.'
      ),
      BUILD(
        'Assemble another command from this lesson: rpm -i some_rpm_package.rpm',
        ['rpm', '-i', 'some_rpm_package.rpm'],
        ['rpm', '-i', 'some_rpm_package.rpm', 'sudo', '-la'],
        'Type it exactly as shown: rpm -i some_rpm_package.rpm.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Package Install Tools’ lesson?',
        'dpkg -r some_deb_package.deb',
        ['dpkg -r some_deb_package.deb', 'core', 'echo Hello World', 'pwd'],
        'The ‘Package Install Tools’ lesson mentions “dpkg -r some_deb_package.deb” — find it in the theory above.'
      ),
    ],
  },
  'linux-packages-6': {
    id: 'linux-packages-6',
    title: 'Package Management System',
    theory: [
      'Ah, the Batmans of package management, these systems come with all the fixins to make package installation, removal and changes easier, including installing package dependencies. Two of the most popular management systems is "yum" and "apt". "Yum" is exclusive to the Red Hat family and "apt" is exclusively to the Debian family.',
      'Install a package from a repository: Debian: "apt install package_name" RPM: "yum install package_name"',
      'Remove a package: Debian: "apt remove package_name" RPM: "yum erase package_name"',
      'Updating packages for a repository: It\'s always best practice to update your package repositories so they are up to date before you install and update a package.',
      'Debian: "apt update & apt upgrade" RPM: "yum update"',
      'Get information about an installed package: Debian: "apt show package_name" RPM: "yum info package_name"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Package Management System’ cover?',
        'Package Management System',
        ['Package Management System', 'Software Distribution', 'Packages Repositories', 'Compressed Archives Tar'],
        'This lesson is ‘Package Management System’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: apt install package_name',
        ['apt', 'install', 'package_name'],
        ['apt', 'install', 'package_name', 'sudo', '-la'],
        'Type it exactly as shown: apt install package_name. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Ah, the Batmans of package management, these systems come with all the fixins to make package installation, removal and changes easier, including installing pa…” — which lesson is this?',
        'Package Management System',
        ['Package Management System', 'Software Distribution', 'Packages Repositories', 'Compressed Archives Tar'],
        'Those opening lines are from ‘Package Management System’.'
      ),
      BUILD(
        'Assemble another command from this lesson: yum install package_name',
        ['yum', 'install', 'package_name'],
        ['yum', 'install', 'package_name', 'sudo', '-la'],
        'Type it exactly as shown: yum install package_name.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Package Management System’ lesson?',
        'apt remove package_name',
        ['apt remove package_name', 'core', 'echo Hello World', 'pwd'],
        'The ‘Package Management System’ lesson mentions “apt remove package_name” — find it in the theory above.'
      ),
    ],
  },
  'linux-packages-7': {
    id: 'linux-packages-7',
    title: 'Compile Source Code',
    theory: [
      'Often times you will encounter an obscure package that only comes in the form of pure source code. You\'ll need to use a few commands to get that source code package compiled and installed on your system.',
      'First thing is first, you\'ll need to have software to install the tools that will allow you to compile source code: "sudo apt install build-essential"',
      'Once you do that, extract the contents of the package file, most likely a .tar.gz file: "tar -xzvf package.tar.gz"',
      'Before you do anything, take a look at the README or INSTALL file inside the package. Sometimes there will be specific installation instructions.',
      'Depending on what compile method that the developer used, you\'ll have to use different commands, such as cmake or something else. However, most commonly you\'ll see basic make compilation, so we\'ll discuss that:',
      'Inside the package contents will be a configure script, this script checks for dependencies on your system and if you are missing anything, you\'ll see an error and you\'ll need to fix those dependencies.',
      '"./configure" (the "./" allows you to execute a script in the current directory)',
      'Inside of the package contents, there is a file called Makefile that contains rules to building the software. When you run the make command, it looks at this file to build the software.',
      '"sudo make install" This command actually installs the package, it will copy the correct files to the correct locations on your computer.',
      'If you want to uninstall the package, use: "sudo make uninstall"',
      'Be wary when using make install, you may not realize how much is actually going on in the background. If you decide to remove this package, you may not actually remove everything because you didn\'t realize what was added to your system.',
      'Instead forget everything about make install that I just explained to you and use the "checkinstall" command. This command will make a .deb file for you that you can easily install and uninstall.',
      '"sudo checkinstall" This command will essentially "make install" and build a .deb package and install it. This makes it easier to remove the package later on.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Compile Source Code’ cover?',
        'Compile Source Code',
        ['Compile Source Code', 'Software Distribution', 'Packages Repositories', 'Compressed Archives Tar'],
        'This lesson is ‘Compile Source Code’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo apt install build-essential',
        ['sudo', 'apt', 'install', 'build-essential'],
        ['sudo', 'apt', 'install', 'build-essential', '-la', '-r'],
        'Type it exactly as shown: sudo apt install build-essential. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Often times you will encounter an obscure package that only comes in the form of pure source code. You\'ll need to use a few commands to get that source code pa…” — which lesson is this?',
        'Compile Source Code',
        ['Compile Source Code', 'Software Distribution', 'Packages Repositories', 'Compressed Archives Tar'],
        'Those opening lines are from ‘Compile Source Code’.'
      ),
      BUILD(
        'Assemble another command from this lesson: tar -xzvf package.tar.gz',
        ['tar', '-xzvf', 'package.tar.gz'],
        ['tar', '-xzvf', 'package.tar.gz', 'sudo', '-la'],
        'Type it exactly as shown: tar -xzvf package.tar.gz.'
      ),
      MCQ(
        'Which of these is mentioned in the ‘Compile Source Code’ lesson?',
        'sudo make install',
        ['sudo make install', 'core', 'echo Hello World', 'pwd'],
        'The ‘Compile Source Code’ lesson mentions “sudo make install” — find it in the theory above.'
      ),
    ],
  },
};
