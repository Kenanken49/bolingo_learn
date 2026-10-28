/**
 * Track Linux · Networking — Linux Journey course bank.
 *
 * Lesson theory verbatim from linuxjourney-desktop (GPL-3.0):
 * https://github.com/Sempiternal-Futility/linuxjourney-desktop
 * (fork of LinuxJourney.com). Quiz questions are original, derived from
 * each lesson's own text so every answer is provable from the theory.
 * SPDX-License-Identifier: GPL-3.0-only (this file).
 */

import { MCQ, BUILD, type CourseLesson } from '../quizBank';

export const TRACK_LINUX_NETWORKING: Record<string, CourseLesson> = {
  'linux-network-sharing-1': {
    id: 'linux-network-sharing-1',
    title: 'File Sharing',
    theory: [
      'You usually are not the only computer on your network, this is especially the case if you\'re working in a commercial environment. When we want to transfer data from one machine to another, sometimes it maybe easier to connect a USB drive and manually copy them. But for the most part, if you\'re working with machines on the same network, the way to transfer data is through network file sharing.',
      'In this course we\'ll go over a couple of different methods to copy data to and from different machines on your network. We\'ll discuss some simple file copies, then we\'ll talk about mounting entire directories on your machine that act as a separate drive.',
      'One simple file sharing tool is the "scp" command. The scp command stands for secure copy, it works exactly the way the cp command does, but allows you to copy from one host over to another host on the same network. It works via ssh so all your actions are using the same authentication and security as ssh.',
      'To copy a file over from local host to a remote host: "scp myfile.txt username@remotehost.com:/remote/directory"',
      'To copy a file from a remote host to your local host: "scp username@remotehost.com:/remote/directory/myfile.txt /local/directory"',
      'To copy over a directory from your local host to a remote host: "scp -r mydir username@remotehost.com:/remote/directory"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘File Sharing’ cover?',
        'File Sharing',
        ['File Sharing', 'Rsync', 'Simple Http Server', 'Nfs Network File Share'],
        'This lesson is ‘File Sharing’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: scp myfile.txt username@remotehost.com:/remote/directory',
        ['scp', 'myfile.txt', 'username@remotehost.com:/remote/directory'],
        ['scp', 'myfile.txt', 'username@remotehost.com:/remote/directory', 'sudo', '-la'],
        'Type it exactly as shown: scp myfile.txt username@remotehost.com:/remote/directory. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “You usually are not the only computer on your network, this is especially the case if you\'re working in a commercial environment. When we want to transfer data…” — which lesson is this?',
        'File Sharing',
        ['File Sharing', 'Rsync', 'Simple Http Server', 'Nfs Network File Share'],
        'Those opening lines are from ‘File Sharing’.'
      ),
    ],
  },
  'linux-network-sharing-2': {
    id: 'linux-network-sharing-2',
    title: 'Rsync',
    theory: [
      'Another tool used to copy data from different hosts is rsync (short for remote synchronization). Rsync is very similar to scp, but it does have a major difference. Rsync uses a special algorithm that checks in advanced if there is already data that you are copying to and will only copy over the differences.',
      'For example, let\'s say that you were copying over a file and your network got interrupted, therefore your copy stopped midway. Instead of re-copying everything from the beginning, rsync will only copy over the parts that didn\'t get copied.',
      'It also verifies the integrity of a file you are copying over with checksums. These small optimizations allow greater file transfer flexibility and makes rsync ideal for directory synchronization remotely and locally, data backups, large data transfers and more.',
      'Some commonly-used rsync options:',
      '1- v - verbose output 2- r - recursive into directories 3- h - human readable output 4- z - compressed for easier transfer, great for slow connections',
      'Copy/sync files on the same host: "rsync -zvr /my/local/directory/one /my/local/directory/two"',
      'Copy/sync files to local host from a remote host: "rsync /local/directory username@remotehost.com:/remote/directory"',
      'Copy/sync files to a remote host from a local host: "rsync username@remotehost.com:/remote/directory /local/directory"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Rsync’ cover?',
        'Rsync',
        ['Rsync', 'File Sharing', 'Simple Http Server', 'Nfs Network File Share'],
        'This lesson is ‘Rsync’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: rsync -zvr /my/local/directory/one /my/local/directory/two',
        ['rsync', '-zvr', '/my/local/directory/one', '/my/local/directory/two'],
        ['rsync', '-zvr', '/my/local/directory/one', '/my/local/directory/two', 'sudo', '-la'],
        'Type it exactly as shown: rsync -zvr /my/local/directory/one /my/local/directory/two. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Another tool used to copy data from different hosts is rsync (short for remote synchronization). Rsync is very similar to scp, but it does have a major differe…” — which lesson is this?',
        'Rsync',
        ['Rsync', 'File Sharing', 'Simple Http Server', 'Nfs Network File Share'],
        'Those opening lines are from ‘Rsync’.'
      ),
    ],
  },
  'linux-network-sharing-3': {
    id: 'linux-network-sharing-3',
    title: 'Simple Http Server',
    theory: [
      'Python has a super useful tool for serving files over HTTP. This is great if you just want to create a quick network share that other machines on your network can access. To do that just go to the directory you want to share and run:',
      '"python -m SimpleHTTPServer"',
      'This sets up a basic webserver that you can access via the localhost address. So grab the IP address of the machine you ran this on and then on another machine access it in the browser with: http://IP_ADDRESS:8000. On your own machine, you can view the files available by typing: http://localhost:8000 in your web browser.',
      'You can also do this with node or if you are running Python 3, the syntax will be a little bit different.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Simple Http Server’ cover?',
        'Simple Http Server',
        ['Simple Http Server', 'File Sharing', 'Rsync', 'Nfs Network File Share'],
        'This lesson is ‘Simple Http Server’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: python -m SimpleHTTPServer',
        ['python', '-m', 'SimpleHTTPServer'],
        ['python', '-m', 'SimpleHTTPServer', 'sudo', '-la'],
        'Type it exactly as shown: python -m SimpleHTTPServer. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Python has a super useful tool for serving files over HTTP. This is great if you just want to create a quick network share that other machines on your network…” — which lesson is this?',
        'Simple Http Server',
        ['Simple Http Server', 'File Sharing', 'Rsync', 'Nfs Network File Share'],
        'Those opening lines are from ‘Simple Http Server’.'
      ),
    ],
  },
  'linux-network-sharing-4': {
    id: 'linux-network-sharing-4',
    title: 'Nfs Network File Share',
    theory: [
      'The most standard network file share for Linux is NFS (Network File System), NFS allows a server to share directories and files with one or more clients over the network.',
      'We won\'t get into the details of how to create an NFS server as it can get complex, however we will discuss setting up NFS clients.',
      'Setting up NFS client: "sudo service nfsclient start" "sudo mount server:/directory /mount_directory"',
      'Automounting: Let\'s say you use the NFS server quite often and you want to keep it permanently mounted, normally you think you\'d edit the /etc/fstab file, but you may not always get a connection to the server and that can cause issues on bootup.',
      'Instead what you want to do is setup automounting so that you can connect to the NFS server when you need to. This is done with the <b>automount</b> tool or in recent versions of Linux "amd". When a file is accessed in a specified directory, automount will look up the remote server and automatically mount it.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Nfs Network File Share’ cover?',
        'Nfs Network File Share',
        ['Nfs Network File Share', 'File Sharing', 'Rsync', 'Simple Http Server'],
        'This lesson is ‘Nfs Network File Share’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo service nfsclient start',
        ['sudo', 'service', 'nfsclient', 'start'],
        ['sudo', 'service', 'nfsclient', 'start', '-la', '-r'],
        'Type it exactly as shown: sudo service nfsclient start. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The most standard network file share for Linux is NFS (Network File System), NFS allows a server to share directories and files with one or more clients over t…” — which lesson is this?',
        'Nfs Network File Share',
        ['Nfs Network File Share', 'File Sharing', 'Rsync', 'Simple Http Server'],
        'Those opening lines are from ‘Nfs Network File Share’.'
      ),
    ],
  },
  'linux-network-sharing-5': {
    id: 'linux-network-sharing-5',
    title: 'Samba',
    theory: [
      'In the early days of computing, it became necessary for Windows machines to share files with Linux machines, thus the Server Message Block (SMB) protocol was born. SMB was used for sharing files between Windows operating systems (Mac also has file sharing with SMB) and then it was later cleaned up and optimized in the form of the Common Internet File System (CIFS) protocol.',
      'Samba is what we call the Linux utilities to work with CIFS on Linux. In addition to file sharing, you can also share resources like printers.',
      'Create a network share with Samba: Let\'s go through the basic steps to create a network share that a Windows machine can access:',
      'Install Samba: "sudo apt update" "sudo apt install samba"',
      'Setup smb.conf: The configuration file for Samba is found at /etc/samba/smb.conf, this file should tell the system what directories should be shared, their access permissions, and more options. The default smb.conf comes with lots of commented code already and you can use those as an example to write your own configurations.',
      '"sudo vi /etc/samba/smb.conf"',
      'Setup up a password for Samba: "sudo smbpasswd -a [username]"',
      'Create a shared directory: "mkdir /my/directory/to/share"',
      'Restart the Samba service: "sudo service smbd restart"',
      'Accessing a Samba share via Windows: In Windows, just type in the network connection in the run prompt: \\\\HOST\\sharename.',
      'Accessing a Samba/Windows share via Linux: "smbclient //HOST/directory -U user"',
      'The Samba package includes a command line tool called "smbclient" that you can use to access any Windows or Samba server. Once you\'re connected to the share you can navigate and transfer files.',
      'Attach a Samba share to your system: Instead of transferring files one by one, you can just mount the network share on your system.',
      '"sudo mount -t cifs servername:directory mountpount -o user=username,pass=password"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Samba’ cover?',
        'Samba',
        ['Samba', 'File Sharing', 'Rsync', 'Simple Http Server'],
        'This lesson is ‘Samba’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo apt update',
        ['sudo', 'apt', 'update'],
        ['sudo', 'apt', 'update', '-la', '-r'],
        'Type it exactly as shown: sudo apt update. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “In the early days of computing, it became necessary for Windows machines to share files with Linux machines, thus the Server Message Block (SMB) protocol was b…” — which lesson is this?',
        'Samba',
        ['Samba', 'File Sharing', 'Rsync', 'Simple Http Server'],
        'Those opening lines are from ‘Samba’.'
      ),
    ],
  },
  'linux-network-basics-1': {
    id: 'linux-network-basics-1',
    title: 'Network Basics',
    theory: [
      'Let\'s look at a typical home network, you have a few different components.',
      '1- ISP - Your internet service provider, the company you pay to get Internet at your house.',
      '2- Router - The router allows each machine on your network to connect to the Internet. In most modern routers, you can connect via wireless or an Ethernet cable.',
      '3- WAN - Wide Area Network, this is what we call the network that encompasses everything between your router and a wider network such the Internet.',
      '4- WLAN - Wireless Local Area Network, this is the network between your router and any wireless devices you may have such as laptops.',
      '5- LAN - Local Area Network, this is the network between your router and any wired devices such as Desktop PCs.',
      '6- Hosts - Each machine on a network is known as a host.',
      'The data and information that gets transmitted through networks are known as packets and by the end of the Networking Nomad section, you\'ll understand in detail how a packet travels to and from hosts.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Network Basics’ cover?',
        'Network Basics',
        ['Network Basics', 'Osi Model', 'Tcp/Ip Model', 'Network Addressing'],
        'This lesson is ‘Network Basics’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Let\'s look at a typical home network, you have a few different components.” — which lesson is this?',
        'Network Basics',
        ['Network Basics', 'Osi Model', 'Tcp/Ip Model', 'Network Addressing'],
        'Those opening lines are from ‘Network Basics’.'
      ),
    ],
  },
  'linux-network-basics-2': {
    id: 'linux-network-basics-2',
    title: 'Osi Model',
    theory: [
      'Before we can look at some practical networking stuff, we have to go over some boring jargon that you\'ve probably heard of before. The OSI (Open Systems Interconnection) model is a theoretical model of networking. This model shows us how a packet traverses through a network in seven different layers.',
      'I won\'t get into specifics of this model, since most of these networking courses will be focused on the TCP/IP model, but it should be mentioned that such a theoretical networking model exists and has actually played a large part in the TCP/IP networking model that we use today.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Osi Model’ cover?',
        'Osi Model',
        ['Osi Model', 'Network Basics', 'Tcp/Ip Model', 'Network Addressing'],
        'This lesson is ‘Osi Model’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Before we can look at some practical networking stuff, we have to go over some boring jargon that you\'ve probably heard of before. The OSI (Open Systems Interc…” — which lesson is this?',
        'Osi Model',
        ['Osi Model', 'Network Basics', 'Tcp/Ip Model', 'Network Addressing'],
        'Those opening lines are from ‘Osi Model’.'
      ),
    ],
  },
  'linux-network-basics-3': {
    id: 'linux-network-basics-3',
    title: 'Tcp/Ip Model',
    theory: [
      'The OSI model gave birth to what eventually became the TCP/IP model and this model is actually what the Internet is based off of. It is the actual implementation of networking. The TCP/IP model uses the TCP/IP protocol suite, which we just commonly refer to as TCP/IP. These protocols work together to specify how data should be gathered, addressed, transmitted and routed through a network. Using the TCP/IP model, we can see how these protocols are used to show the breakdown of how a packet travels through the network.',
      'Application Layer: The top layer of the TCP/IP model. It determines how your computer\'s programs (such as your web browser) interface with the transport layer services to view the data that gets sent or received.',
      'This layer uses: 1- HTTP (Hypertext Transfer Protocol) - used for the webpages on the Internet. 2- SMTP (Simple Mail Transfer Protocol) - electronic mail (email) transmission',
      'Transport Layer: How data will be transmitted, includes checking the correct ports, the integrity of the data, and basically delivering our packets.',
      'This layer uses: 1- TCP (Transmission Control Protocol) - reliable data delivery 2- UDP (User Datagram Protocol) - unreliable data delivery',
      'Network Layer: This layers specifies how to move packets between hosts and across networks.',
      'This layer uses: 1- IP (Internet Protocol) - Helps route packets from one machine to another. 20 ICMP (Internet Control Message Protocol) - Helps tell us what is going on, such as error messages and debugging information.',
      'Link Layer: This layer specifies how to send data across a physical piece of hardware. Such as data travelling through Ethernet, fiber, etc.',
      'The lists above of protocols each layer uses is not extensive and you\'ll encounter many other protocols that come into play.',
      'In the following lessons, we will dive through each of these layers and discuss how our packet traverses through the network in the eyes of the TCP/IP model (there are many perspectives on how a packet travels across networks, we won\'t look at them all, but be aware that they exist).',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Tcp/Ip Model’ cover?',
        'Tcp/Ip Model',
        ['Tcp/Ip Model', 'Network Basics', 'Osi Model', 'Network Addressing'],
        'This lesson is ‘Tcp/Ip Model’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “The OSI model gave birth to what eventually became the TCP/IP model and this model is actually what the Internet is based off of. It is the actual implementati…” — which lesson is this?',
        'Tcp/Ip Model',
        ['Tcp/Ip Model', 'Network Basics', 'Osi Model', 'Network Addressing'],
        'Those opening lines are from ‘Tcp/Ip Model’.'
      ),
    ],
  },
  'linux-network-basics-4': {
    id: 'linux-network-basics-4',
    title: 'Network Addressing',
    theory: [
      'Before we jump into seeing how a packet moves across a network, we have to familiarize ourselves with some terminology. When you mail a letter, you must know who it is being sent to and where it is coming from. Packets need the same information, our hosts and other hosts are identified using MAC (media access control) addresses and IP addresses, to make it easier on us humans we use hostnames to identify a host.',
      'MAC Addresses: A MAC address is a unique identifier used as a hardware address. This address will never change.',
      'When you want to get access to the Internet, your machine needs to have a device called a network interface card. This network adapter has its own hardware address that\'s used to identify your machine. A MAC address for an Ethernet device looks something like this 00:C4:B5:45:B2:43. MAC addresses are given to network adapters when they are manufactured. Each manufacturer has an organizationally unique identifier (OUI) to identify them as the manufacturer. This OUI is denoted by the first 3 bytes of the MAC address. For example, Dell has 00-14-22, so a network adapter from Dell could have a MAC address like: 00-14-22-34-B2-C2.',
      'IP Addresses: An IP Address is used to identify a device on a network, they are hardware independent and can vary in syntax depending on if you are using IPv4 or IPv6 (more on this later). For now we\'ll assume you are using IPv4, so a typical IP address would look like: 10.24.12.4.',
      'IP addresses are used with the software side of networking. Anytime a system is connected to the Internet it should have an IP address. They can also change if your network changes and are unique to the entire Internet (this isn\'t always the case once we learn about NAT).',
      'Remember it takes both software and hardware to move packets across networks, so we have two identifiers for each, MAC (hardware) and IP (software).',
      'Hostnames: One last way to identify your machines is through hostname. Hostnames take your IP address and allow you to tie that address to a human readable name. Instead of remembering 192.12.41.4 you can just remember myhost.com.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Network Addressing’ cover?',
        'Network Addressing',
        ['Network Addressing', 'Network Basics', 'Osi Model', 'Tcp/Ip Model'],
        'This lesson is ‘Network Addressing’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Before we jump into seeing how a packet moves across a network, we have to familiarize ourselves with some terminology. When you mail a letter, you must know w…” — which lesson is this?',
        'Network Addressing',
        ['Network Addressing', 'Network Basics', 'Osi Model', 'Tcp/Ip Model'],
        'Those opening lines are from ‘Network Addressing’.'
      ),
    ],
  },
  'linux-network-basics-5': {
    id: 'linux-network-basics-5',
    title: 'Application Layer',
    theory: [
      'Let\'s say I wanted to send an email to Patty. We\'ll go through each of the TCP/IP layers to see this in action.',
      'Remember that packets are used to transmit data across networks, a packet consists of a header and payload. The header contains information about where the packet is going and where it came from. The payload is the actual data that is being transferred. As our packet traverses the network, each layer adds a bit of information to the header of the packet. Also keep in mind that different layers use a different term for our "packet". In the transport layer we essentially encapsulate our data in a segment and in the link layer we refer to this as a frame, but just know that packet can be used in regards to the same thing.',
      'First we start off in the application layer. When we send our email through our email client, the application layer will encapsulate this data. The application layer talks to the transport layer through a specified port and through this port it sends its data. We want to send an email through the application layer protocol SMTP (simple mail transfer protocol). The data is sent through our transport protocol which opens a connection to this port (port 25 is used for SMTP), so we get this data sent through this port and that data is sent to the Transport layer to be encapsulated into segments.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Application Layer’ cover?',
        'Application Layer',
        ['Application Layer', 'Network Basics', 'Osi Model', 'Tcp/Ip Model'],
        'This lesson is ‘Application Layer’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Let\'s say I wanted to send an email to Patty. We\'ll go through each of the TCP/IP layers to see this in action.” — which lesson is this?',
        'Application Layer',
        ['Application Layer', 'Network Basics', 'Osi Model', 'Tcp/Ip Model'],
        'Those opening lines are from ‘Application Layer’.'
      ),
    ],
  },
  'linux-network-basics-6': {
    id: 'linux-network-basics-6',
    title: 'Transport Layer',
    theory: [
      'The transports layer helps us transfer our data in a way networks can read it. It breaks our data into chunks that will be transported and put back together in the correct order. These chunks are known as segments. Segments make it easier to transport data across networks.',
      'Ports: Even though we know where we are sending our data via IP addresses, they aren\'t specific enough to send our data to a certain processes or services. Services such as HTTP use a communication channel via ports. If we want to send webpage data, we need to send it over the HTTP port (port 80). In addition to forming segments, the transport layer will also attach the source and destination ports to the segment, so when the receiver gets the final packet it will know what port to use.',
      'UDP: There are two popular transport protocols UDP and TCP. We\'ll briefly discuss UDP and spend most of our time on TCP, since it\'s the most commonly used.',
      'UDP is not a reliable method of transporting data, in fact it doesn\'t really care if you get all of your original data. This may sound terrible, but it does have its uses, such as for media streaming, it\'s ok if you lose some frames in return you get your data a little faster.',
      'TCP: TCP provides a reliable connection-oriented stream of data. TCP uses ports to send data to and from hosts. An application opens up a connection from one port on its host to another port on a remote host. In order to establish the connection, we use the TCP handshake.',
      '1- The client (connecting process) sends a SYN segment to the server to request a connection 2- Server sends the client a SYN-ACK segment to acknowledge the client\'s connection request 3- Client sends an ACK to the server to acknowledge the server\'s connection request',
      'Once this connection is established, data can be exchanged over a TCP connection. The data is sent over in different segments and are tracked with TCP sequence numbers so they can be arranged in the correct order when they are delivered. In our email example, the transport layer attaches the destination port (25) to the source port of the source host.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Transport Layer’ cover?',
        'Transport Layer',
        ['Transport Layer', 'Network Basics', 'Osi Model', 'Tcp/Ip Model'],
        'This lesson is ‘Transport Layer’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “The transports layer helps us transfer our data in a way networks can read it. It breaks our data into chunks that will be transported and put back together in…” — which lesson is this?',
        'Transport Layer',
        ['Transport Layer', 'Network Basics', 'Osi Model', 'Tcp/Ip Model'],
        'Those opening lines are from ‘Transport Layer’.'
      ),
    ],
  },
  'linux-network-basics-7': {
    id: 'linux-network-basics-7',
    title: 'Network Layer',
    theory: [
      'The Network layer determines the routing of our packets from our source host to a destination host. Fortunately in our example, our packet is only traveling within the same network, but the Internet is made up of many networks. These smaller networks that make up the Internet are known as subnets. All subnets connect to each other in some way, which is why we are able to get to www.google.com even though it\'s on its own network. I won\'t go into detail as we have a whole course dedicated to subnets, but for now in regards to our Network layer, know that the IP addresses define the rules to travel to different subnets.',
      'In the network layer, it receives the segment coming from the transport layer and encapsulates this segment in an IP packet then attaches the IP address of the source host and the IP address of the destination host to the packet header. So at this point, our packet has information about where it is going and where it came from. Now it sends our packet to the physical hardware layer.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Network Layer’ cover?',
        'Network Layer',
        ['Network Layer', 'Network Basics', 'Osi Model', 'Tcp/Ip Model'],
        'This lesson is ‘Network Layer’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “The Network layer determines the routing of our packets from our source host to a destination host. Fortunately in our example, our packet is only traveling wi…” — which lesson is this?',
        'Network Layer',
        ['Network Layer', 'Network Basics', 'Osi Model', 'Tcp/Ip Model'],
        'Those opening lines are from ‘Network Layer’.'
      ),
    ],
  },
  'linux-network-basics-8': {
    id: 'linux-network-basics-8',
    title: 'Link Layer',
    theory: [
      'At the bottom of the TCP/IP model sits the Link Layer. This layer is the hardware specific layer.',
      'In the link layer, our packet is encapsulated once more into something called a frame. The frame header attaches the source and destination MAC addresses of our hosts, checksums and packet separators so that the receiver can tell when a packet ends.',
      'Fortunately we are on the same network, so our packet won\'t have to travel too far. First, the link layer attaches my source MAC address to the frame header, but it needs to know Patty\'s MAC address as well. How does it know that and how do I find it since it\'s not on the Internet? We use ARP!',
      'ARP (Address Resolution Protocol):',
      'ARP finds the MAC address associated with an IP address. ARP is used within the same network. If Patty was not on the same network, we would use a routing system to determine the next router that would receive the packet and once we were on the same network, we could use ARP.',
      'Once we are on the same network, systems first use the ARP look-up table that stores information about what IP addresses are associated with what MAC address. If the value is not there, then ARP is used. Then the system will send a broadcast message to the network using the ARP protocol to find out which host has IP 10.10.1.4. A broadcast message is a special message that is sent to all hosts on a network (aptly named for sending a broadcast). Any machine with the requested IP address will reply with an ARP packet containing the IP address and the MAC address.',
      'Now that we have all the necessary data we need, IP address and MAC addresses, our link layer forwards this frame through our network interface card, out to the next device and finds Patty\'s network. This step is a little more complex than how I just explained it, but we will discuss more details in the Routing course.',
      'And there it is a simple (or not so simple) packet traversal down the TCP/IP layer. Keep in mind that packets don\'t travel in a one way fashion like this. We haven\'t even gotten to Patty\'s network yet! When travelling through networks, it requires going through the TCP/IP model at least twice before any data is sent or received. In reality, the way this packet looks would be something like this:',
      'Packet Traversal:',
      '1- Pete sends Patty an email: this data gets sent to the transport layer.',
      '2- The transport layer encapsulates the data into a TCP or UDP header to form a segment, the segment attaches the destination and source TCP or UDP port, then the segment is sent to the network layer.',
      '3- The network layer encapsulates the TCP segment inside an IP packet, it attaches the source and destination IP address. Then routes the packet to the link layer.',
      '4- The packet then reaches Pete\'s physical hardware and gets encapsulated in a frame. The source and destination MAC address get added to the frame.',
      '5- Patty\'s receives this data frame through her physical layer and checks each frame for data integrity, then de-encapsulates the frame contents and sends the IP packet to the network layer.',
      '6- The network layer reads the packet to find the source and destination IP that was previously attached. It checks if its IP is the same as the destination IP, which it is! It de-encapsulates the packet and sends the segment to the transport layer.',
      '7- The transport layer de-encapsulates the segments, checks the TCP or UDP port numbers and makes a connection to the application layer based on those port numbers.',
      '8- The application layer receives the data from the transport layer on the port that was specified and presents it to Patty in the form of the final email message',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Link Layer’ cover?',
        'Link Layer',
        ['Link Layer', 'Network Basics', 'Osi Model', 'Tcp/Ip Model'],
        'This lesson is ‘Link Layer’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “At the bottom of the TCP/IP model sits the Link Layer. This layer is the hardware specific layer.” — which lesson is this?',
        'Link Layer',
        ['Link Layer', 'Network Basics', 'Osi Model', 'Tcp/Ip Model'],
        'Those opening lines are from ‘Link Layer’.'
      ),
    ],
  },
  'linux-network-basics-9': {
    id: 'linux-network-basics-9',
    title: 'Dhcp Overview',
    theory: [
      'An important networking concept that we did not go over yet is DHCP (Dynamic Host Configuration Protocol)',
      'DHCP assigns IP addresses, subnet masks and gateways to our machines. For example, let\'s say you have a cell phone and you want to get a cell phone number to start talking to people. You have to call up your phone carrier and they will give you a number. As long as your pay your bills you can keep using your phone. DHCP is the phone carrier in this case, it gives you an IP address so that you can talk to other IP addresses. You are also leased an IP address, these last for a certain period of time, then will get renewed depending on how you have your lease settings.',
      'DHCP is great for many reasons, it allows a network administrator to not worry about assigning IP addresses and it also prevents them from setting up duplicate IP addresses. Every physical network should have its own DHCP server so that a host can request an IP address. In a regular home setting, the router usually acts as the DHCP server.',
      'The way DHCP gets all your dynamic host information is:',
      '1- DHCP DISCOVER - This message is broadcasted to search for a DHCP server. 2- DHCP OFFER - The DHCP server in the network replies with an offer message. The offer contains a packet with DHCP lease time, subnet mask, IP address, etc. 3- DHCP REQUEST - The client sends out another broadcast to let all DHCP servers know which offer it accepted. 4- DHCP ACK - Acknowledgement is sent by the server.',
      'DHCP gets more involved than this, but this is the gist of it.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Dhcp Overview’ cover?',
        'Dhcp Overview',
        ['Dhcp Overview', 'Network Basics', 'Osi Model', 'Tcp/Ip Model'],
        'This lesson is ‘Dhcp Overview’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “An important networking concept that we did not go over yet is DHCP (Dynamic Host Configuration Protocol)” — which lesson is this?',
        'Dhcp Overview',
        ['Dhcp Overview', 'Network Basics', 'Osi Model', 'Tcp/Ip Model'],
        'Those opening lines are from ‘Dhcp Overview’.'
      ),
    ],
  },
  'linux-subnetting-1': {
    id: 'linux-subnetting-1',
    title: 'Ipv4',
    theory: [
      'So we know that network hosts have a unique address they can be found at. These addresses are known as IP addresses. An IPv4 address looks something like this: "204.23.124.23"',
      'This address actually contains two parts, the network portion that tells us know network it\'s on and the host portion that tells us which host on that network it is. For this course we will mostly be discussing IPv4 addresses, which are what you commonly will see when referring to IP addresses.',
      'An IP address is separated into octets by the periods. So there are 4 octets in an IPv4 address. If you know a bit of computer science, an octet is 8 bits and 8 bits actually equal 1 byte, so we also refer to an IPv4 address as having 4 bytes. We use bits frequently when dealing with subnets and IP addresses.',
      'You can view your IP address with the ifconfig -a command:',
      '"ifconfig -a" eth0 Link encap:Ethernet HWaddr 1d:3a:32:24:4d:ce inet addr:192.168.1.129 Bcast:192.168.1.255 Mask:255.255.255.0 inet6 addr: fd60::21c:29ff:fe63:5cdc/64 Scope:Link',
      'As you can see my IPv4 address is: 192.168.1.129',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Ipv4’ cover?',
        'Ipv4',
        ['Ipv4', 'Subnets', 'Subnet Math', 'Subnetting Cheats'],
        'This lesson is ‘Ipv4’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ifconfig -a',
        ['ifconfig', '-a'],
        ['ifconfig', '-a', 'sudo', '-la'],
        'Type it exactly as shown: ifconfig -a. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “So we know that network hosts have a unique address they can be found at. These addresses are known as IP addresses. An IPv4 address looks something like this:…” — which lesson is this?',
        'Ipv4',
        ['Ipv4', 'Subnets', 'Subnet Math', 'Subnetting Cheats'],
        'Those opening lines are from ‘Ipv4’.'
      ),
    ],
  },
  'linux-subnetting-2': {
    id: 'linux-subnetting-2',
    title: 'Subnets',
    theory: [
      'How can I tell if I\'m on the same network as Patty? Well we can just look at the subnet short for subnetwork. A subnet is a group of hosts with IP addresses that are similar in a certain way. These hosts usually are in a proximate location from each other and you can easily send data to and from hosts on the same subnet. Think about it as sending mail in the same zip code, it\'s a lot easier than sending mail to a different state.',
      'For example, all hosts with an IP address that starts with 123.45.67 would be on the same subnet. My host has an IP of 123.45.67.8 and Patty\'s has an IP of 123.45.67.9. The common numbers are my network prefix and the 8 and 9 are our hosts, therefore my network is the same as Patty\'s. A subnet is divided into a network prefix, such as 123.45.67.0 and a subnet mask.',
      'Subnet Masks: Subnet masks determine what part of your IP address is the network portion and what part is the host portion.',
      'A typical subnet mask can look something like this:',
      '"255.255.255.0"',
      'The 255 portion is actually our mask. To make this a little easier to understand, remember how we refer to each octet as 8 bits? In computer science a bit is denoted by a 0 or a 1 in binary form. When binary numbers are used, 1 means on and 0 means off. So what does 8 0\'s or 1\'s equal?',
      'Punch into Google "binary to decimal calculator" and convert 11111111 into a decimal form. What do you get? 255! So an octet ranges from 0 to 255. So if we had a subnet mask of 255.255.255.0, and an IP address of 192.168.1.0, how many hosts are on that subnet? We\'ll find out the answer to that in our subnet math lesson.',
      'Also when we talk about our subnet, we commonly denote it by the network prefix followed by the subnet mask: "123.234.0.0/255.255.0.0"',
      'Why?: Why on earth do we make subnets? Subnetting is used to segment networks and control the flow of traffic within that network. So a host on one subnet can’t interact with another host on a different subnet.',
      'But wait a minute, what if I want to connect to other hosts like yahoo.com? Then you need to connect subnets together. To connect subnets you just need to find the hosts that are connected to more than one subnet. For example, if my host at 192.168.1.129 is connected to a local network of 192.168.1.129/24 it can reach any hosts on that network. To reach hosts on the rest of the Internet, it needs to communicate through the router. Traditionally, on most networks with a subnet mask of 255.255.255.0, the router is usually at address 1 of the subnet, so 192.168.1.1. Now that router will have a port that connects it to another subnet (more in the Routing course). Certain IP addresses (private networks) are not visible to the internet, and we have things like NAT in place (more on this later).',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Subnets’ cover?',
        'Subnets',
        ['Subnets', 'Ipv4', 'Subnet Math', 'Subnetting Cheats'],
        'This lesson is ‘Subnets’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: binary to decimal calculator',
        ['binary', 'to', 'decimal', 'calculator'],
        ['binary', 'to', 'decimal', 'calculator', 'sudo', '-la'],
        'Type it exactly as shown: binary to decimal calculator. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “How can I tell if I\'m on the same network as Patty? Well we can just look at the subnet short for subnetwork. A subnet is a group of hosts with IP addresses th…” — which lesson is this?',
        'Subnets',
        ['Subnets', 'Ipv4', 'Subnet Math', 'Subnetting Cheats'],
        'Those opening lines are from ‘Subnets’.'
      ),
    ],
  },
  'linux-subnetting-3': {
    id: 'linux-subnetting-3',
    title: 'Subnet Math',
    theory: [
      'Ok, we know that subnet masks are important to figure out how many hosts we can have on our subnet. So how many hosts would that be?',
      'Let\'s say I have an IP address of "192.168.1.0" and a subnet mask of "255.255.255.0", now let\'s line up these numbers in binary form. For now use an online calculator to convert these values from decimal to binary.',
      '192.168.1.165 = 11000000.10101000.00000001.10100101 255.255.255.0 = 11111111.11111111.11111111.00000000',
      'The IP address is masked by our subnet mask, when you see a 1, it is masked and we pretend like we don\'t see it. So the only possible hosts we can have are from the 00000000 region. Remember 11111111 in binary form equals 255, we also account 0 as a host number, so there are 256 possible options. However, it may look like we have 256 possible options, but we actually subtract 2 hosts because we have to account for the broadcast address and the subnet address, leaving us with 254 possible hosts on our subnet. So we know that we can have hosts with IP addresses ranging from 192.168.1.1 - 192.168.1.254.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Subnet Math’ cover?',
        'Subnet Math',
        ['Subnet Math', 'Ipv4', 'Subnets', 'Subnetting Cheats'],
        'This lesson is ‘Subnet Math’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Ok, we know that subnet masks are important to figure out how many hosts we can have on our subnet. So how many hosts would that be?” — which lesson is this?',
        'Subnet Math',
        ['Subnet Math', 'Ipv4', 'Subnets', 'Subnetting Cheats'],
        'Those opening lines are from ‘Subnet Math’.'
      ),
    ],
  },
  'linux-subnetting-4': {
    id: 'linux-subnetting-4',
    title: 'Subnetting Cheats',
    theory: [
      'I hate to have to add this section, in the real world you would most likely never have to do subnet math by hand, however if you were getting interviewed on this, you\'ll have to know how to convert to and from binary form for subnetting.',
      'Luckily there are some arithmetic cheats you can memorize.',
      'First memorize your base-2 calculations, just do it:',
      '2^1 = 2 2^2 = 4 2^3 = 8 2^4 = 16 2^5 = 32 2^6 = 64 2^7 = 128 2^8 = 256 2^9 = 512 2^10 = 1024 2^11 = 2048 2^12 = 4096',
      'Decimal to Binary Chart: 1 1 1 1 1 1 1 1 128 64 32 16 8 4 2 1',
      'There are lots of reasons why the following chart looks the way it does, if you\'re curious how it works there are lots of resources online.',
      'Ok, got these memorized? Let\'s do a quick decimal to binary conversion:',
      'Convert 192.168.23.43 to Binary: Remember: 128 / 64 / 32 / 16 / 8 / 4 / 2 / 1',
      'Let\'s walk through converting the first octet to binary and you\'ll understand how the rest works.',
      'Can you subtract 192 - 128? Yes, so the first bit is 1 192 - 128 = 64, the next number in the chart is 64, can you subtract 64 - 64? Yes, so the second bit is 1 We\'ve run out of numbers to subtract from, so our binary form of 192 is 11000000',
      'Convert Binary 11000000 to Decimal: For binary to decimal conversion you add up the numbers that have a 1, so: 128 + 64 + 0 + 0 + 0 + 0 + 0 + 0 = 192!',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Subnetting Cheats’ cover?',
        'Subnetting Cheats',
        ['Subnetting Cheats', 'Ipv4', 'Subnets', 'Subnet Math'],
        'This lesson is ‘Subnetting Cheats’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “I hate to have to add this section, in the real world you would most likely never have to do subnet math by hand, however if you were getting interviewed on th…” — which lesson is this?',
        'Subnetting Cheats',
        ['Subnetting Cheats', 'Ipv4', 'Subnets', 'Subnet Math'],
        'Those opening lines are from ‘Subnetting Cheats’.'
      ),
    ],
  },
  'linux-subnetting-5': {
    id: 'linux-subnetting-5',
    title: 'Classless Interdomain Routing (CIDR)',
    theory: [
      'CIDR (classless inter-domain routing) is used to represent a subnet mask in a more compact way. You may see subnets notated in CIDR notation, where a subnet such as the 10.42.3.0/255.255.255.0 is written as 10.42.3.0/24 which just means it includes both the subnet prefix and the subnet mask.',
      'Remember an IP address consists of 4 bytes or 32 bits, CIDR indicates the amount of bits used as the network prefix. So 123.12.24.0/23 means that the first 23 bits are used. Well what does that mean? How many hosts is that?',
      'A simple trick is to subtract the total of bits an IP address can have (32) from the CIDR address (23), so that leaves 9 bits, 2^9 = 512, but we have to remove 2 addresses (subnet address and broadcast address) so we have 510 usable hosts.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Classless Interdomain Routing (CIDR)’ cover?',
        'Classless Interdomain Routing (CIDR)',
        ['Classless Interdomain Routing (CIDR)', 'Ipv4', 'Subnets', 'Subnet Math'],
        'This lesson is ‘Classless Interdomain Routing (CIDR)’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “CIDR (classless inter-domain routing) is used to represent a subnet mask in a more compact way. You may see subnets notated in CIDR notation, where a subnet su…” — which lesson is this?',
        'Classless Interdomain Routing (CIDR)',
        ['Classless Interdomain Routing (CIDR)', 'Ipv4', 'Subnets', 'Subnet Math'],
        'Those opening lines are from ‘Classless Interdomain Routing (CIDR)’.'
      ),
    ],
  },
  'linux-subnetting-6': {
    id: 'linux-subnetting-6',
    title: 'Network Adress Translation (NAT)',
    theory: [
      'We\'ve brought up NAT (network address translation) before but didn\'t touch upon it, when we are working on our network, does that mean that the Internet can see our IP address? Not quite.',
      'NAT makes a device like our router act as an intermediary between the Internet and private network. So only a single, unique IP address is required to represent an entire group of computers.',
      'Think of NAT is like a receptionist in a large office, if someone wants to contact you, they only know the number to the whole office, the receptionist would then have to look for your extension number and forward the call to you.',
      'How does it work?:',
      'A simple case would look like this:',
      '1- Patty wants to connect to www.google.com, so her machine sends this request through the router 2- The router takes that request and opens its own connection to google.com, then it sends Patty\'s request once it makes a connection 3- The router is the intermediary between Patty and www.google.com. Google doesn\'t know about Patty instead all it can see is the router.',
      'NAT and packet routing in general can get pretty ugly, but we won\'t dive into the specifics.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Network Adress Translation (NAT)’ cover?',
        'Network Adress Translation (NAT)',
        ['Network Adress Translation (NAT)', 'Ipv4', 'Subnets', 'Subnet Math'],
        'This lesson is ‘Network Adress Translation (NAT)’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “We\'ve brought up NAT (network address translation) before but didn\'t touch upon it, when we are working on our network, does that mean that the Internet can se…” — which lesson is this?',
        'Network Adress Translation (NAT)',
        ['Network Adress Translation (NAT)', 'Ipv4', 'Subnets', 'Subnet Math'],
        'Those opening lines are from ‘Network Adress Translation (NAT)’.'
      ),
    ],
  },
  'linux-subnetting-7': {
    id: 'linux-subnetting-7',
    title: 'Ipv6',
    theory: [
      'We\'ve heard the term IPv6 here and there, but what is it? Every device that connects to the Internet gets it\'s own IP address, well that happens to be a finite number that we are soon approaching in this digital age.',
      'IPv6 was created to allow us to connect more hosts to the Internet, it comes with more IP improvements however, it\'s adoption is quite slow. It isn\'t meant to replace IPv4, they are meant to complement each other. The two IP protocols are very similar and if you know IPv4 you\'ll understand IPv6, the major difference is the way the address is written. Here is what a typical IPv6 address looks like:',
      '"2dde:1235:1256:3:200:f8ed:fe23:59cf"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Ipv6’ cover?',
        'Ipv6',
        ['Ipv6', 'Ipv4', 'Subnets', 'Subnet Math'],
        'This lesson is ‘Ipv6’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “We\'ve heard the term IPv6 here and there, but what is it? Every device that connects to the Internet gets it\'s own IP address, well that happens to be a finite…” — which lesson is this?',
        'Ipv6',
        ['Ipv6', 'Ipv4', 'Subnets', 'Subnet Math'],
        'Those opening lines are from ‘Ipv6’.'
      ),
    ],
  },
  'linux-routing-1': {
    id: 'linux-routing-1',
    title: 'What Is A Router?',
    theory: [
      'We\'ve used this term router before, hopefully you know what one is, since you probably have one in your home. A router enables machines on a network to communicate with each other as well as other networks.',
      'On a typical router, you will have LAN ports, that allow your machines to connect to the same local area network and you will also have an Internet uplink port that connects you to the Internet, sometimes you\'ll see this port being labelled as WAN, because it is essentially connecting you to a wider network.',
      'When we do any sort of networking activity, it has to go through the router. The router decides where our network packets go and which ones come in. It routes our packets between multiple networks to get from it\'s source host to it\'s destination host.',
      'How does a router work?: Think about routing the same way as mail delivery, we have an address we want to send a letter to, when we send it off to the post office, they get the letter and see, oh this is going to California, I\'ll put it on the truck going to California (I honestly have no idea how the postal system works).',
      'The letter then gets sent to San Francisco, inside San Francisco there are different zip codes, and then in those zip codes there are smaller address codes, until finally someone is able to deliver your letter to the address you wanted. On the other hand, if you already lived in San Francisco and in the same zipcode, the mail deliverer will probably know exactly where the letter has to go to without handing it off to anyone else.',
      'When we route packets, they use similar address "routes", such as to get to network A, send these packets to network B. When we don\'t have a route set for that, we have a default route that our packets will use. These routes are set on a routing table that our system uses to navigate us across networks.',
      'Hops: As packets move across networks, they travel in hops, a hop is how we roughly measure the distance that the packet must travel to get from the source to the destination. Let\'s say to I have two routers connecting host A to host B, so therefore we say there are two hops between host A and host B. Each hop is a intermediate device like the routers that we must pass through.',
      'Understanding the basic difference between Switching, Routing & Flooding?: Packet SWITCHING is basically receiving, processing and forwarding data to the destination device. ROUTING is a process of creating the routing table, so that we can do SWITCHING better. Before routing, FLOODING was used. If a router don\'t know which way to send a packet than every incoming packet is sent through every outgoing link except the one it arrived on.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘What Is A Router?’ cover?',
        'What Is A Router?',
        ['What Is A Router?', 'Routing Table', 'Path Of A Packet', 'Routing Protocols'],
        'This lesson is ‘What Is A Router?’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “We\'ve used this term router before, hopefully you know what one is, since you probably have one in your home. A router enables machines on a network to communi…” — which lesson is this?',
        'What Is A Router?',
        ['What Is A Router?', 'Routing Table', 'Path Of A Packet', 'Routing Protocols'],
        'Those opening lines are from ‘What Is A Router?’.'
      ),
    ],
  },
  'linux-routing-2': {
    id: 'linux-routing-2',
    title: 'Routing Table',
    theory: [
      'Look at your machine\'s routing table:',
      '"sudo route -n" Kernel IP routing table Destination Gateway Genmask Flags Metric Ref Use Iface 0.0.0.0 192.168.224.2 0.0.0.0 UG 0 0 0 eth0 192.168.224.0 0.0.0.0 255.255.255.0 U 1 0 0 eth0',
      'Destination: In the first field, we have a destination IP address of 192.168.224.0, this says that any packet that tries to go to this network, goes out through my Ethernet cable (eth0). If I was 192.168.224.5 and wanted to get to 192.168.224.7, I would just use the network interface eth0 directly.',
      'Notice that we have addresses of "0.0.0.0" this means that no address is specified or it\'s unknown. So if for example, I wanted to send a packet to IP address 151.123.43.6, our routing table doesn\'t know where that goes, so it denotes it as 0.0.0.0 and therefore routes our packet to the Gateway.',
      'Gateway: If we are sending a packet that is not on the same network, it will be sent to this Gateway address. Which is aptly named as being a Gateway to another network.',
      'Genmask: This is the subnet mask, used to figure out what IP addresses match what destination.',
      'Flags: UG - Network is Up and is a Gateway U - Network is Up',
      'Iface: This is the interface that our packet will be going out of, eth0 usually stands for the first Ethernet device on your system.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Routing Table’ cover?',
        'Routing Table',
        ['Routing Table', 'What Is A Router?', 'Path Of A Packet', 'Routing Protocols'],
        'This lesson is ‘Routing Table’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo route -n',
        ['sudo', 'route', '-n'],
        ['sudo', 'route', '-n', '-la', '-r'],
        'Type it exactly as shown: sudo route -n. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Look at your machine\'s routing table:” — which lesson is this?',
        'Routing Table',
        ['Routing Table', 'What Is A Router?', 'Path Of A Packet', 'Routing Protocols'],
        'Those opening lines are from ‘Routing Table’.'
      ),
    ],
  },
  'linux-routing-3': {
    id: 'linux-routing-3',
    title: 'Path Of A Packet',
    theory: [
      'Let\'s look at how a packet travels within it\'s local network:',
      '1- First the local machine will compare the destination IP address to see if it\'s in the same subnet by looking at its subnet mask.',
      '2- When packets are sent they need to have a source MAC address, destination MAC address, source IP address and destination IP address, at this point we do not know the destination MAC address.',
      '3- To get to the destination host, we use ARP to broadcast a request on the local network to find the MAC address of the destination host.',
      '4- Now the packet can be successfully sent!',
      'Let\'s see how a packet travels outside it\'s network:',
      '1- First the local machine will compare the destination IP address, since it\'s outside of our network, it does not see the MAC address of the destination host. And we can\'t use ARP because the ARP request is a broadcast to locally connected hosts.',
      '2- So our packet now looks at the routing table, it doesn\'t know the address of the destination IP, so it sends it out to the default gateway (another router). So now our packet contains our source IP, destination IP and source MAC, however we don\'t have a destination MAC. Remember MAC addresses are only reached through the same network. So what does it do? It sends an ARP request to get the MAC address of the default gateway.',
      '3- The router looks at the packet and confirms the destination MAC address, but it\'s not the final destination IP address, so it keeps looking at the routing table to forward the packet to another IP address that can help the packet move along to its destination. Everytime the packet moves, it strips the old source and destination MAC address and updates the packet with the new source and destination MAC addresses.',
      '4- Once the packet gets forwarded to the same network, we use ARP to find the final destination MAC address.',
      '5- During this process, our packet doesn\'t change the source or destination IP address.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Path Of A Packet’ cover?',
        'Path Of A Packet',
        ['Path Of A Packet', 'What Is A Router?', 'Routing Table', 'Routing Protocols'],
        'This lesson is ‘Path Of A Packet’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Let\'s look at how a packet travels within it\'s local network:” — which lesson is this?',
        'Path Of A Packet',
        ['Path Of A Packet', 'What Is A Router?', 'Routing Table', 'Routing Protocols'],
        'Those opening lines are from ‘Path Of A Packet’.'
      ),
    ],
  },
  'linux-routing-4': {
    id: 'linux-routing-4',
    title: 'Routing Protocols',
    theory: [
      'It would be a pain to have to manually configure routes on a routing table for every device on your network, so instead we use what are known as routing protocols. Routing protocols are used to help our system adapt to network changes, it learns of different routes, builds them in the routing table and then routes our packets through that way.',
      'There are two primary routing protocol types, distance vector protocols and link state protocols.',
      'Convergence: Before we talk about the protocols, we should go over a term using in routing known as convergence.',
      'When using routing protocols, routers communicate with other routers to collect and exchange information about the network. When they agree on how a network should look, every routing table maps out the complete topology of the network, thus "converging".',
      'When something occurs in the network topology, the convergence will temporarily break until all routers are aware of this change.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Routing Protocols’ cover?',
        'Routing Protocols',
        ['Routing Protocols', 'What Is A Router?', 'Routing Table', 'Path Of A Packet'],
        'This lesson is ‘Routing Protocols’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “It would be a pain to have to manually configure routes on a routing table for every device on your network, so instead we use what are known as routing protoc…” — which lesson is this?',
        'Routing Protocols',
        ['Routing Protocols', 'What Is A Router?', 'Routing Table', 'Path Of A Packet'],
        'Those opening lines are from ‘Routing Protocols’.'
      ),
    ],
  },
  'linux-routing-5': {
    id: 'linux-routing-5',
    title: 'Distance Vector Protocols',
    theory: [
      'Distance vector protocols determine the path of other networks using the hop count a packet takes across the network. If network A was 3 hops away and network B was next to network A, then we assume it must be 4 hops away. In distance vector protocols, the next route would be the one with the least amount of hops.',
      'Distance vector protocols are great for small networks, when networks start to scale it takes longer for the routers to converge because it periodically sends the entire routing table out to every router.',
      'Another downside to distance vector protocols is efficiency, it chooses routes that are closer in hops, but it may not always choose the most efficient route.',
      'One of the common distance vector protocols is RIP (Routing Information Protocol), it broadcasts the routing table to every router in the network every 30 seconds. For a large network, this can take some serious juice to pull off, because of that RIP limits it\'s hop count to 15.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Distance Vector Protocols’ cover?',
        'Distance Vector Protocols',
        ['Distance Vector Protocols', 'What Is A Router?', 'Routing Table', 'Path Of A Packet'],
        'This lesson is ‘Distance Vector Protocols’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Distance vector protocols determine the path of other networks using the hop count a packet takes across the network. If network A was 3 hops away and network…” — which lesson is this?',
        'Distance Vector Protocols',
        ['Distance Vector Protocols', 'What Is A Router?', 'Routing Table', 'Path Of A Packet'],
        'Those opening lines are from ‘Distance Vector Protocols’.'
      ),
    ],
  },
  'linux-routing-6': {
    id: 'linux-routing-6',
    title: 'Link State Protocols',
    theory: [
      'Link state protocols are great for large scale networks, they are more complex than distance vector protocols, however a large upside is their ability to converge quickly, this is because instead of periodically sending out the whole routing table, they only send updates to neighboring routes.',
      'They use a different algorithm to calculate the shortest path first and construct their network topology in the form of a graph to show which routers are connected to other routers.',
      'One of the common link state protocols is OSPF (Open Shortest Path First), it only updates the routing tables if there was a network change. It doesn\'t have a hop limit.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Link State Protocols’ cover?',
        'Link State Protocols',
        ['Link State Protocols', 'What Is A Router?', 'Routing Table', 'Path Of A Packet'],
        'This lesson is ‘Link State Protocols’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Link state protocols are great for large scale networks, they are more complex than distance vector protocols, however a large upside is their ability to conve…” — which lesson is this?',
        'Link State Protocols',
        ['Link State Protocols', 'What Is A Router?', 'Routing Table', 'Path Of A Packet'],
        'Those opening lines are from ‘Link State Protocols’.'
      ),
    ],
  },
  'linux-routing-7': {
    id: 'linux-routing-7',
    title: 'Border Gateway Protocol (BGP)',
    theory: [
      'The last important protocol we\'ll discuss is BGP, BGP is basically how the Internet runs. It\'s used to collect and exchange routing information among autonomous systems. Think of an autonomous system as an Internet service provider, a company, university, any organization, etc.',
      'Without BGP, these systems would not know how to talk to each other, they would just be siloed off. Instead of routing inside these autonomous systems, BGP routes between them.',
      'Let\'s say you were on your home network and I\'m working from Starbucks, I want to be able to communicate with you, so I send an email and the network packet travels through Starbuck\'s network, it bounces around there and goes through the routing tables in Starbuck\'s network until it finally reaches a point at the border of the Starbucks network and passes it to a Border Gateway router.',
      'This router contains the information for my packet to leave the Starbucks network and traverse other networks.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Border Gateway Protocol (BGP)’ cover?',
        'Border Gateway Protocol (BGP)',
        ['Border Gateway Protocol (BGP)', 'What Is A Router?', 'Routing Table', 'Path Of A Packet'],
        'This lesson is ‘Border Gateway Protocol (BGP)’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “The last important protocol we\'ll discuss is BGP, BGP is basically how the Internet runs. It\'s used to collect and exchange routing information among autonomou…” — which lesson is this?',
        'Border Gateway Protocol (BGP)',
        ['Border Gateway Protocol (BGP)', 'What Is A Router?', 'Routing Table', 'Path Of A Packet'],
        'Those opening lines are from ‘Border Gateway Protocol (BGP)’.'
      ),
    ],
  },
  'linux-network-config-1': {
    id: 'linux-network-config-1',
    title: 'Network Interfaces',
    theory: [
      'A network interface is how the kernel links up the software side of networking to the hardware side. We\'ve already seen an example of this:',
      '"ifconfig -a" eth0 Link encap:Ethernet HWaddr 1d:3a:32:24:4d:ce inet addr:192.168.1.129 Bcast:192.168.1.255 Mask:255.255.255.0 inet6 addr: fd60::21c:29ff:fe63:5cdc/64 Scope:Link',
      'The ifconfig command: The "ifconfig" tool allows us to configure our network interfaces, if we don\'t have any network interfaces set up, the kernel\'s device drivers and the network won\'t know how to talk to each other. Ifconfig runs on bootup and configures our interfaces through config files, but we can also manually modify them. The output of ifconfig shows the interface name on the left side and the right side shows detailed information.',
      'You\'ll most commonly see interfaces named eth0 (first Ethernet card in the machine), wlan0 (wireless interface), lo (loopback interface). The loopback interface is used to represent your computer, it just loops you back to yourself. This is good for debugging or connecting to servers running locally.',
      'The status of interfaces, can be up or down, as you can guess if you wanted to "turn off" an interface you can set it to go down. The fields you\'ll probably look at the most in the ifconfig output is the HWaddr (MAC address of the interface), inet address (IPv4 address) and inet6 (IPv6 address). Of course you can see that the subnet mask and broadcast address are there as well. You can also view interface information at /etc/network/interfaces.',
      'To create an interface and bring it up: "ifconfig eth0 192.168.2.1 netmask 255.255.255.0 up"',
      'This assigns an IP address and netmask to the eth0 interface and also turns it up.',
      'To bring up or down an interface:',
      '"ifup eth0" "ifdown eth0"',
      'The ip command: The "ip" command also allows us to manipulate the networking stack of a system. Depending on the distribution you are using it may be the preferred method of manipulating your network settings.',
      'Here are some examples of its use:',
      'To show interface information for all interfaces: "ip link show"',
      'To show the statistics of an interface: "ip -s link show eth0"',
      'To show ip addresses allocated to interfaces: "ip address show"',
      'To bring interfaces up and down: "ip link set eth0 up" "ip link set eth0 down"',
      'To add an IP address to an interface: "ip address add 192.168.1.1/24 dev eth0"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Network Interfaces’ cover?',
        'Network Interfaces',
        ['Network Interfaces', 'Route', 'Dhclient', 'Network Manager'],
        'This lesson is ‘Network Interfaces’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ifconfig -a',
        ['ifconfig', '-a'],
        ['ifconfig', '-a', 'sudo', '-la'],
        'Type it exactly as shown: ifconfig -a. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “A network interface is how the kernel links up the software side of networking to the hardware side. We\'ve already seen an example of this:” — which lesson is this?',
        'Network Interfaces',
        ['Network Interfaces', 'Route', 'Dhclient', 'Network Manager'],
        'Those opening lines are from ‘Network Interfaces’.'
      ),
    ],
  },
  'linux-network-config-2': {
    id: 'linux-network-config-2',
    title: 'Route',
    theory: [
      'We\'ve already discussed viewing our routing tables with the route command, if you wanted to add or remove routes you can do so manually.',
      'Add a new route: "sudo route add -net 192.168.2.1/23 gw 10.11.12.3"',
      'Delete a route: "sudo route del -net 192.168.2.1/23"',
      'You can also perform these changes with the "ip" command:',
      'To add a route: "ip route add 192.168.2.1/23 via 10.11.12.3"',
      'To delete a route: "ip route delete 192.168.2.1/23 via 10.11.12.3" or "ip route delete 192.168.2.1/23"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Route’ cover?',
        'Route',
        ['Route', 'Network Interfaces', 'Dhclient', 'Network Manager'],
        'This lesson is ‘Route’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo route del -net 192.168.2.1/23',
        ['sudo', 'route', 'del', '-net', '192.168.2.1/23'],
        ['sudo', 'route', 'del', '-net', '192.168.2.1/23', '-la', '-r'],
        'Type it exactly as shown: sudo route del -net 192.168.2.1/23. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “We\'ve already discussed viewing our routing tables with the route command, if you wanted to add or remove routes you can do so manually.” — which lesson is this?',
        'Route',
        ['Route', 'Network Interfaces', 'Dhclient', 'Network Manager'],
        'Those opening lines are from ‘Route’.'
      ),
    ],
  },
  'linux-network-config-3': {
    id: 'linux-network-config-3',
    title: 'Dhclient',
    theory: [
      'We\'ve discussed DHCP before and most often you will never need to statically set your IP addresses, subnet masks, etc. Instead you\'ll be using DHCP! The dhclient starts up on boot and gets a list of network interfaces from the dhclient.conf file. For each interface listed it tries to configure the interface using the DHCP protocol.',
      'In the dhclient.leases file, dhclient keeps track of a list of leases across system reboots, after reading dhclient.conf, the dhclient.leases file is read to let it know what leases it\'s already assigned.',
      'To obtain a fresh IP: "sudo dhclient"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Dhclient’ cover?',
        'Dhclient',
        ['Dhclient', 'Network Interfaces', 'Route', 'Network Manager'],
        'This lesson is ‘Dhclient’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo dhclient',
        ['sudo', 'dhclient'],
        ['sudo', 'dhclient', '-la', '-r'],
        'Type it exactly as shown: sudo dhclient. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “We\'ve discussed DHCP before and most often you will never need to statically set your IP addresses, subnet masks, etc. Instead you\'ll be using DHCP! The dhclie…” — which lesson is this?',
        'Dhclient',
        ['Dhclient', 'Network Interfaces', 'Route', 'Network Manager'],
        'Those opening lines are from ‘Dhclient’.'
      ),
    ],
  },
  'linux-network-config-4': {
    id: 'linux-network-config-4',
    title: 'Network Manager',
    theory: [
      'Of course if you wanted to have your system\'s networking up and running automatically there is something already in place for that. Most distributions utilize the NetworkManager daemon to configure their networks automatically.',
      'You\'ll notice NetworkManager in the form of an applet somewhere on your desktop taskbar if you are using a GUI. As you can see it manages your network\'s hardware and connection information. For instance on startup, NetworkManager will gather network hardware information, search for connections to wireless, wired, etc. and then activates it.',
      'There are also command-line tools to interact with NetworkManager:',
      'nm-tool: nm-tools reports NetworkManager\'s state and it\'s devices',
      '"nm-tool" NetworkManager Tool',
      'State: connected (global)',
      '- Device: eth0 [Wired connection 1] ------------------------------------------- Type: Wired Driver: pcnet32 State: connected Default: yes HW Address: 12:3D:45:56:7D:CC',
      'Capabilities: Carrier Detect: yes',
      'Wired Properties Carrier: on',
      'IPv4 Settings: Address: 192.168.22.1 Prefix: 24 (255.255.255.0) Gateway: 192.168.22.2',
      'DNS: 192.168.22.2',
      'nmcli: The nmcli command allows you to control and modify NetworkManager, see the manpage for more details.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Network Manager’ cover?',
        'Network Manager',
        ['Network Manager', 'Network Interfaces', 'Route', 'Dhclient'],
        'This lesson is ‘Network Manager’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Of course if you wanted to have your system\'s networking up and running automatically there is something already in place for that. Most distributions utilize…” — which lesson is this?',
        'Network Manager',
        ['Network Manager', 'Network Interfaces', 'Route', 'Dhclient'],
        'Those opening lines are from ‘Network Manager’.'
      ),
    ],
  },
  'linux-network-config-5': {
    id: 'linux-network-config-5',
    title: 'Command arp',
    theory: [
      'Remember when we lookup a MAC address with ARP, it first checks the locally stored ARP cache on our system, you can actually view this cache:',
      '"arp" Address HWtype HWaddress Flags Mask Iface 192.168.22.1 ether 00:12:24:fc:12:cc C eth0 192.168.22.254 ether 00:12:45:f2:84:64 C eth0',
      'The ARP cache is actually empty when a machine boots up, it gets populated as packets are being sent to other hosts. If we send a packet to a destination that isn\'t in the ARP cache, the following happens:',
      '1- The source host creates the Ethernet frame with an ARP request packet 2- The source host broadcasts this frame to the entire network 3- If one of the hosts on the network knows the correct MAC address, it will send a reply packet and frame containing the MAC address 4- The source host adds the IP to MAC address mapping to the ARP cache and then proceeds with sending the packet',
      'You can also view your arp cache via the ip command:',
      '"ip neighbour show"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Command arp’ cover?',
        'Command arp',
        ['Command arp', 'Network Interfaces', 'Route', 'Dhclient'],
        'This lesson is ‘Command arp’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ip neighbour show',
        ['ip', 'neighbour', 'show'],
        ['ip', 'neighbour', 'show', 'sudo', '-la'],
        'Type it exactly as shown: ip neighbour show. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Remember when we lookup a MAC address with ARP, it first checks the locally stored ARP cache on our system, you can actually view this cache:” — which lesson is this?',
        'Command arp',
        ['Command arp', 'Network Interfaces', 'Route', 'Dhclient'],
        'Those opening lines are from ‘Command arp’.'
      ),
    ],
  },
  'linux-troubleshooting-1': {
    id: 'linux-troubleshooting-1',
    title: 'Icmp',
    theory: [
      'The Internet Control Message Protocol (ICMP) is part of the TCP/IP protocol suite, it used to send updates and error messages and is an extremely useful protocol used for debugging network issues such as a failed packet delivery.',
      'Each ICMP message contains a type, code and checksum field. The type field is the type of ICMP message, the code is a sub-type and describes more information about the message and the checksum is used to detect any issues with the integrity of the message.',
      'Let\'s look at some common ICMP Types:',
      'Type 0 - Echo Reply Type 3 - Destination Unreachable Type 8 - Echo Request Type 11 - Time Exceeded',
      'When a packet can\'t get to a destination, Type 3 ICMP message is generated, within Type 3 there are 16 code values that will further describe why it can\'t get to the destination:',
      'Code 0 - Network Unreachable Code 1 - Host Unreachable etc..etc..',
      'These messages will make more sense as we use some network troubleshooting tools.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Icmp’ cover?',
        'Icmp',
        ['Icmp', 'Ping', 'Traceroute', 'Netstat'],
        'This lesson is ‘Icmp’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “The Internet Control Message Protocol (ICMP) is part of the TCP/IP protocol suite, it used to send updates and error messages and is an extremely useful protoc…” — which lesson is this?',
        'Icmp',
        ['Icmp', 'Ping', 'Traceroute', 'Netstat'],
        'Those opening lines are from ‘Icmp’.'
      ),
    ],
  },
  'linux-troubleshooting-2': {
    id: 'linux-troubleshooting-2',
    title: 'Ping',
    theory: [
      'One of the most simplest networking tools <b>ping</b>, it\'s used to test whether or not a packet can reach a host. It works by sending ICMP echo request (Type 8) packets to the destination host and waits for an ICMP echo reply (Type 0). Ping is successful when a host sends out the request packet and receives a response from the target.',
      'Let\'s look at an example:',
      '"ping -c 3 www.google.com" PING www.google.com (74.125.239.112) 56(84) bytes of data. 64 bytes from nuq05s01-in-f16.1e100.net (74.125.239.112): icmp_seq=1 ttl=128 time=29.0 ms 64 bytes from nuq05s01-in-f16.1e100.net (74.125.239.112): icmp_seq=2 ttl=128 time=23.7 ms 64 bytes from nuq05s01-in-f16.1e100.net (74.125.239.112): icmp_seq=3 ttl=128 time=15.1 ms',
      'In this example, we are using ping to check if we can get to www.google.com. The -c flag (count) is used to stop sending echo request packets after the count has been reached.',
      'The first part says that we are sending 64-byte packets to 74.125.239.112 (google.com) and the rest show us the details of the trip. By default it sends a packet per second.',
      'icmp_seq: The icmp_seq field is used to show the sequence number of packets sent, so in this case, I sent out 3 packets and we can see that 3 packets made it back. If you do a ping and you get some sequence numbers missing, that means that some connectivity issue is happening and not all your packets are getting through.',
      'If the sequence number is out of order, your connection is probably very slow as your packets are exceeding the one second default.',
      'ttl: The Time To Live (ttl) field is used as a hop counter, as you make hops, it decrements the counter by one and once the hop counter reaches 0, our packet dies. This is meant to give the packet a lifespan, we don\'t want our packets travelling around forever.',
      'time: The roundtrip time it took from you sending the echo request packet to getting an echo reply.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Ping’ cover?',
        'Ping',
        ['Ping', 'Icmp', 'Traceroute', 'Netstat'],
        'This lesson is ‘Ping’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: ping -c 3 www.google.com',
        ['ping', '-c', '3', 'www.google.com'],
        ['ping', '-c', '3', 'www.google.com', 'sudo', '-la'],
        'Type it exactly as shown: ping -c 3 www.google.com. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “One of the most simplest networking tools <b>ping</b>, it\'s used to test whether or not a packet can reach a host. It works by sending ICMP echo request (Type…” — which lesson is this?',
        'Ping',
        ['Ping', 'Icmp', 'Traceroute', 'Netstat'],
        'Those opening lines are from ‘Ping’.'
      ),
    ],
  },
  'linux-troubleshooting-3': {
    id: 'linux-troubleshooting-3',
    title: 'Traceroute',
    theory: [
      'The traceroute command is used to see how packets are getting routed. It works by sending packets with increasing TTL values, starting with 1. So the first router gets the packet, and it decrements the TTL value by one, thus dropping the packet.',
      'The router sends back an ICMP Time Exceeded message back to us. And then the next packet gets a TTL of 2, so it makes it past the first router, but when it gets to the second router the TTL is 0 and it returns another ICMP Time Exceeded message.',
      'Traceroute works this way because as it sends and drops packets it is build a list of routers that the packets traverse, until it finally gets to its destination and gets an ICMP Echo Reply message.',
      'Here\'s a little snippet of a traceroute:',
      '"traceroute google.com" traceroute to google.com (216.58.216.174), 30 hops max, 60 byte packets 1 192.168.4.254 (192.168.4.254) 0.028 ms 0.009 ms 0.008 ms 2 100.64.1.113 (100.64.1.113) 1.227 ms 1.226 ms 0.920 ms 3 100.64.0.20 (100.64.0.20) 1.501 ms 1.556 ms 0.855 ms',
      'Each line is a router or machine that is between me and my target. It shows the name of the target and its IP address and the last three columns correspond to the round-trip time of a packet to get to that router. By default, we send three packets along the route.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Traceroute’ cover?',
        'Traceroute',
        ['Traceroute', 'Icmp', 'Ping', 'Netstat'],
        'This lesson is ‘Traceroute’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: traceroute google.com',
        ['traceroute', 'google.com'],
        ['traceroute', 'google.com', 'sudo', '-la'],
        'Type it exactly as shown: traceroute google.com. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The traceroute command is used to see how packets are getting routed. It works by sending packets with increasing TTL values, starting with 1. So the first rou…” — which lesson is this?',
        'Traceroute',
        ['Traceroute', 'Icmp', 'Ping', 'Netstat'],
        'Those opening lines are from ‘Traceroute’.'
      ),
    ],
  },
  'linux-troubleshooting-4': {
    id: 'linux-troubleshooting-4',
    title: 'Netstat',
    theory: [
      'Well Known Ports: We\'ve discussed data transmission through ports on our machine, let\'s look at some well known ports.',
      'You can get a list of well-known ports by looking at the file /etc/services:',
      'ftp 21/tcp ssh 22/tcp smtp 25/tcp domain 53/tcp # DNS http 80/tcp https 443/tcp ..etc..',
      'The first column is the name of the service, then the port number and the transport layer protocol it uses.',
      'netstat: An extremely useful tool to get detailed information about your network is "netstat". Netstat displays various network related information such network connections, routing tables, information about network interfaces and more, it\'s the swiss army knife of networking tools. We will focus mostly on one feature netstat has and that\'s the status of network connections.',
      'Before we look at an example, let\'s talk about sockets and ports first. A socket is an interface that allows programs to send and receive data while a port is used to identify which application should send or receive data. The socket address is the combination of the IP address and port. Every connection between a host and destination requires a unique socket. For example, HTTP is a service that runs on port 80, however we can have many HTTP connections and to maintain each connection a socket gets created per connection.',
      '"netstat -at" Active Internet connections (servers and established) Proto Recv-Q Send-Q Local Address Foreign Address State tcp 0 0 icebox:domain *:* LISTEN tcp 0 0 localhost:ipp *:* LISTEN tcp 0 0 icebox.lan:44468 124.28.28.50:http TIME_WAIT tcp 0 0 icebox.lan:34751 124.28.29.50:http TIME_WAIT tcp 0 0 icebox.lan:34604 economy.canonical.:http TIME_WAIT tcp6 0 0 ip6-localhost:ipp [::]:* LISTEN tcp6 1 0 ip6-localhost:35094 ip6-localhost:ipp CLOSE_WAIT tcp6 0 0 ip6-localhost:ipp ip6-localhost:35094 FIN_WAIT2',
      'The netstat -a command shows the listening and non-listening sockets for network connections, the -t flag shows only tcp connections.',
      'The columns are as follows from left to right:',
      '1- Proto: Protocol used, TCP or UDP. 2- Recv-Q: Data that is queued to be received 3- Send-Q: Data that is queued to be sent 4- Local Address: Locally connected host 5- Foreign Address: Remotely connected host 6- State: The state of the socket',
      'See the manpage for a list of socket states, but here are a few:',
      '1- LISTENING: The socket is listening for incoming connections, remember when we make a TCP connection our destination has to be listening for us before we can connect. 2- SYN_SENT: The socket is actively attempting to establish a connection. 3- ESTABLISHED: The socket has an established connection 4- CLOSE_WAIT: The remote host has shutdown and we\'re waiting for the socket to close 5- TIME_WAIT: The socket is waiting after close to handle packets still in the network',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Netstat’ cover?',
        'Netstat',
        ['Netstat', 'Icmp', 'Ping', 'Traceroute'],
        'This lesson is ‘Netstat’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: netstat -at',
        ['netstat', '-at'],
        ['netstat', '-at', 'sudo', '-la'],
        'Type it exactly as shown: netstat -at. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Well Known Ports: We\'ve discussed data transmission through ports on our machine, let\'s look at some well known ports.” — which lesson is this?',
        'Netstat',
        ['Netstat', 'Icmp', 'Ping', 'Traceroute'],
        'Those opening lines are from ‘Netstat’.'
      ),
    ],
  },
  'linux-troubleshooting-5': {
    id: 'linux-troubleshooting-5',
    title: 'Packet Analysis',
    theory: [
      'The subject of packet analysis could fill an entire course of its own and there are many books written just on packet analysis. However, today we will just learn the basics.',
      'There are two extremely popular packet analyzers, Wireshark and tcpdump. These tools scan your network interfaces, capture the packet activity, parse the packages and output the information for us to see. They allows us to get into the nitty gritty of network analysis and get into the low level stuff. We\'ll be using tcpdump since it has a simpler interface, however if you were to pick up packet analysis for your toolbelt, I would recommend looking into Wireshark.',
      'Install tcpdump: "sudo apt install tcpdump"',
      'Capture packet data on an interface:',
      '"sudo tcpdump -i wlan0" tcpdump: verbose output suppressed, use -v or -vv for full protocol decode listening on wlan0, link-type EN10MB (Ethernet), capture size 65535 bytes 11:28:23.958840 IP icebox.lan > nuq04s29-in-f4.1e100.net: ICMP echo request, id 1901, seq 2, length 64 11:28:23.970928 IP nuq04s29-in-f4.1e100.net > icebox.lan: ICMP echo reply, id 1901, seq 2, length 64 11:28:24.960464 IP icebox.lan > nuq04s29-in-f4.1e100.net: ICMP echo request, id 1901, seq 3, length 64 11:28:24.979299 IP nuq04s29-in-f4.1e100.net > icebox.lan: ICMP echo reply, id 1901, seq 3, length 64 11:28:25.961869 IP icebox.lan > nuq04s29-in-f4.1e100.net: ICMP echo request, id 1901, seq 4, length 64 11:28:25.976176 IP nuq04s29-in-f4.1e100.net > icebox.lan: ICMP echo reply, id 1901, seq 4, length 64 11:28:26.963667 IP icebox.lan > nuq04s29-in-f4.1e100.net: ICMP echo request, id 1901, seq 5, length 64 11:28:26.976137 IP nuq04s29-in-f4.1e100.net > icebox.lan: ICMP echo reply, id 1901, seq 5, length 64 11:28:30.674953 ARP, Request who-has 172.254.1.0 tell ThePickleParty.lan, length 28 11:28:31.190665 IP ThePickleParty.lan.51056 > 192.168.86.255.rfe: UDP, length 306',
      'You\'ll notice a lot of stuff happening when you run a packet capture, well that\'s to be expected there\'s a lot of network activity happening in the background. In my above example, I\'ve taken only a snippet of my capture specifically the time when I decided to ping www.google.com.',
      'Understanding the output:',
      '11:28:23.958840 IP icebox.lan > nuq04s29-in-f4.1e100.net: ICMP echo request, id 1901, seq 2, length 64 11:28:23.970928 IP nuq04s29-in-f4.1e100.net > icebox.lan: ICMP echo reply, id 1901, seq 2, length 64',
      '1- The first field is a timestamp of the network activity 2- IP, this contains the protocol information 3- Next, you\'ll see the source and destination address: icebox.lan > nuq04s29-in-f4.1e100.net 4- seq, this is the TCP packets\'s starting and ending sequence number 5- length, length in bytes',
      'As you can see from our tcpdump output, we are sending an ICMP echo request packet to www.google.com and getting an ICMP echo reply packet in return! Also note that different packets will output different information, refer to the manpage to see what those are.',
      'Writing tcpdump output to a file: "sudo tcpdump -w /some/file"',
      'Some final thoughts: we only scraped the surface of the subject of packet analysis. There is so much you can look at and we haven\'t even touched upon going even deeper with Hex and ASCII output. There are plenty of resources online to help you learn more about packet analyzers and I urge you to find them!',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Packet Analysis’ cover?',
        'Packet Analysis',
        ['Packet Analysis', 'Icmp', 'Ping', 'Traceroute'],
        'This lesson is ‘Packet Analysis’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: sudo apt install tcpdump',
        ['sudo', 'apt', 'install', 'tcpdump'],
        ['sudo', 'apt', 'install', 'tcpdump', '-la', '-r'],
        'Type it exactly as shown: sudo apt install tcpdump. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The subject of packet analysis could fill an entire course of its own and there are many books written just on packet analysis. However, today we will just lea…” — which lesson is this?',
        'Packet Analysis',
        ['Packet Analysis', 'Icmp', 'Ping', 'Traceroute'],
        'Those opening lines are from ‘Packet Analysis’.'
      ),
    ],
  },
  'linux-dns-1': {
    id: 'linux-dns-1',
    title: 'What is DNS?',
    theory: [
      'Imagine if every time you wanted to do a search on Google you had to type in http://192.78.12.4 instead of www.google.com. Well without DNS ("Domain Name System") that\'s exactly what would happen.',
      'Low level networking only understands the raw IP address to identify a host. DNS allows us humans to keep track of websites and hosts by name instead of an IP address. It\'s like a contact list for the Internet. If you know someone\'s name but don’t know their phone number, you can simply look it up in your contacts list.',
      'DNS is fundamentally a distributed database of hostnames to IP addresses, we manage our database so people know how to get to our site/domain, and somewhere else another person is managing their database so others can get to their domain. These domains are then able to talk to each other and build a massive contact list of the Internet.',
      'In this course, we will go over some basics of DNS, but be wary that DNS is an exhaustive topic and if you really want to get down and dirty with it, you\'ll need to do some additional research.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘What is DNS?’ cover?',
        'What is DNS?',
        ['What is DNS?', 'DNS Components', 'DNS Process', 'Etc hosts'],
        'This lesson is ‘What is DNS?’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Imagine if every time you wanted to do a search on Google you had to type in http://192.78.12.4 instead of www.google.com. Well without DNS ("Domain Name Syste…” — which lesson is this?',
        'What is DNS?',
        ['What is DNS?', 'DNS Components', 'DNS Process', 'Etc hosts'],
        'Those opening lines are from ‘What is DNS?’.'
      ),
    ],
  },
  'linux-dns-2': {
    id: 'linux-dns-2',
    title: 'DNS Components',
    theory: [
      'The DNS database of the Internet relies on sites and organizations providing part of that database. To do that, they need:',
      'Name Server: We setup DNS via "name servers", the name servers load up our DNS settings and configs and answers any questions from clients or other servers that want to know things like "Who is google.com?". If the name server doesn\'t know the answer to that query, it will redirect the request to other name servers.',
      'Name servers can be "authoritative", meaning they hold the actual DNS records that you\'re looking for, or "recursive" meaning they would ask other servers and those servers would ask other servers until they found an authoritative server that contained the DNS records. Recursive servers can also have the information we want cached instead of reaching an authoritative server.',
      'Zone File: Inside a name server lives something called zone files. Zone files are how the name server stores information about the domain or how to get to the domain if it doesn\'t know.',
      'Resource Records: A zone file is comprised of entries of resource records. Each line is a record and contains information about hosts, nameservers, other resources, etc.',
      'The fields consist of the following: 1- Record name',
      '2- TTL - The time after which we discard the record and obtain a new one, in DNS TTL is denoted by time, so records could have a TTL of one hour. The reason we do this is because the Internet is constantly changing, one minute a host can be mapped to X IP address then next it can be at Y IP address',
      '3- Class - Namespace of the record information, most commonly IN is used for Internet',
      '4- Type - Type of information stored in the record data. We won\'t get into record types, but you\'ve probably seen common ones like A for address, MX or mail exchanger, etc.',
      '5- Data - This field can contain an IP address if it\'s an A record or something else depending on the record type.',
      '"patty IN A 192.168.0.4"',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘DNS Components’ cover?',
        'DNS Components',
        ['DNS Components', 'What is DNS?', 'DNS Process', 'Etc hosts'],
        'This lesson is ‘DNS Components’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: name servers',
        ['name', 'servers'],
        ['name', 'servers', 'sudo', '-la'],
        'Type it exactly as shown: name servers. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “The DNS database of the Internet relies on sites and organizations providing part of that database. To do that, they need:” — which lesson is this?',
        'DNS Components',
        ['DNS Components', 'What is DNS?', 'DNS Process', 'Etc hosts'],
        'Those opening lines are from ‘DNS Components’.'
      ),
    ],
  },
  'linux-dns-3': {
    id: 'linux-dns-3',
    title: 'DNS Process',
    theory: [
      'Let\'s look at an example of how your host finds a domain (catzontheinterwebz.com) with DNS. Essentially, we funnel our way down until we reach the DNS server that knows of that domain.',
      'Local DNS Server: First our host asks, "Where is catzontheinterwebz.com?", our local DNS server doesn\'t know so it goes and starts from the top of the funnel to ask the Root Servers. Keep in mind that our host is not making these requests to find catzontheinterwebz.com directly, most users talk to a recursive DNS server provided by their ISPs and that server is then tasked to find the location of catzontheinterwebz.com.',
      'Root Servers: There are 13 Root Servers for the Internet, they are mirrored and distributed around the world to handle DNS requests for the Internet, so there are really hundreds of servers that are working, they are controlled by different organizations and they contain information about Top-Level Domains.',
      'Top-level domains are what you know as .org, .com, .net, etc addresses. So the Root Server doesn\'t know where catzontheinterwebz.com is, so it tells us ask the .com Top-Level Domain DNS Server at an IP address it gives us.',
      'Top-Level Domain: So now we send another request to the name server that knows about ".com" addresses and asks if it knows where catzontheinterwebz.com is? The TLD doesn\'t have the catzontheinterwebz.com in their zone files, but it does see a record for the name server for catzontheinterwebz.com. So it gives us the IP address of that name server and tells us to look there.',
      'Authoritative DNS Server: Now we send a final request to the DNS server that actually has the record we want. The name server sees that it has a zone file for catzontheinterwebz.com and there is a resource record for \'www\' for this host. It then gives us the IP address of this host and we can finally see some cats on the Internet.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘DNS Process’ cover?',
        'DNS Process',
        ['DNS Process', 'What is DNS?', 'DNS Components', 'Etc hosts'],
        'This lesson is ‘DNS Process’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “Let\'s look at an example of how your host finds a domain (catzontheinterwebz.com) with DNS. Essentially, we funnel our way down until we reach the DNS server t…” — which lesson is this?',
        'DNS Process',
        ['DNS Process', 'What is DNS?', 'DNS Components', 'Etc hosts'],
        'Those opening lines are from ‘DNS Process’.'
      ),
    ],
  },
  'linux-dns-4': {
    id: 'linux-dns-4',
    title: 'Etc hosts',
    theory: [
      'Before our machine actually hits DNS to do a query, it first looks locally on our machines.',
      '/etc/hosts: The /etc/hosts file contains mappings of some hostnames to IP addresses. The fields are pretty self explanatory, there is one for the IP address, the hostname and then any alias\'s for the host.',
      '"cat /etc/hosts" 127.0.0.1 localhost 127.0.1.1 icebox',
      'You\'ll typically see your localhost address listed as a default in this file. You can also manage access to hosts by modifying the /etc/hosts.deny or /etc/hosts.allow files. However, if you were security conscientious, this isn\'t really the way to go and you should be modifying your firewall rules instead.',
      'Let\'s see a fun example of /etc/hosts. Modify the file and add a line for: "123.45.6.7 www.google.com"',
      'Save the file and now go to www.google.com. Having issues aren\'t you? Well that\'s because we just mapped www.google.com to a completely wrong IP address. Since our hosts first look locally for IP address mappings, it never reaches DNS to find google.com.',
      '/etc/resolv.conf: Traditionally, we\'ve used a file called /etc/resolv.conf to map DNS name servers for more efficient lookups, however with the improvements made to DNS this file is quite often irrelevant, in fact, you can see in my example below that /etc/resolv.conf isn\'t managed manually. Refer to your distribution specific settings to manage DNS name server mappings.',
      'conf(5) file for glibc resolver(3) generated by resolvconf(8) # DO NOT EDIT THIS FILE BY HAND -- YOUR CHANGES WILL BE OVERWRITTEN nameserver 127.0.1.1 search localdomain',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘Etc hosts’ cover?',
        'Etc hosts',
        ['Etc hosts', 'What is DNS?', 'DNS Components', 'DNS Process'],
        'This lesson is ‘Etc hosts’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: cat /etc/hosts',
        ['cat', '/etc/hosts'],
        ['cat', '/etc/hosts', 'sudo', '-la'],
        'Type it exactly as shown: cat /etc/hosts. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “Before our machine actually hits DNS to do a query, it first looks locally on our machines.” — which lesson is this?',
        'Etc hosts',
        ['Etc hosts', 'What is DNS?', 'DNS Components', 'DNS Process'],
        'Those opening lines are from ‘Etc hosts’.'
      ),
    ],
  },
  'linux-dns-5': {
    id: 'linux-dns-5',
    title: 'DNS Setup',
    theory: [
      'We won\'t got through setting up a DNS server, as that would be quite a lengthy tutorial. Instead here is a quick comparison list of the popular DNS servers to use with Linux.',
      'BIND: The most popular DNS server on the Internet, it\'s the standard that is used with Linux distributions. It was originally developed at the University of California at Berkeley hence the name BIND (Berkeley Internet Name Domain). If you need full-featured power and flexibility, you can\'t go wrong with BIND.',
      'DNSmasq: Lightweight and much easier to configure than BIND. If you want simplicity and don\'t need all the bells and whistles of BIND, use DNSmasq. It comes with all the tools you need to setup DHCP and DNS, recommended for a smaller network.',
      'PowerDNS: Full-featured and similar to BIND, it offers you a little bit more flexibility with options. It reads information from multiple databases such as MySQL, PostgreSQL, etc. for easier administration. Just because BIND has been the way we do things, it doesn\'t mean it has to stay that way.',
      'This isn\'t a complete list, but it should give you an idea of where to look if you are setting up your own DNS server.',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘DNS Setup’ cover?',
        'DNS Setup',
        ['DNS Setup', 'What is DNS?', 'DNS Components', 'DNS Process'],
        'This lesson is ‘DNS Setup’ — read its theory above for the full picture.'
      ),
      MCQ(
        'The lesson opens with: “We won\'t got through setting up a DNS server, as that would be quite a lengthy tutorial. Instead here is a quick comparison list of the popular DNS servers to…” — which lesson is this?',
        'DNS Setup',
        ['DNS Setup', 'What is DNS?', 'DNS Components', 'DNS Process'],
        'Those opening lines are from ‘DNS Setup’.'
      ),
    ],
  },
  'linux-dns-6': {
    id: 'linux-dns-6',
    title: 'DNS Tools',
    theory: [
      'nslookup:',
      'The "name server lookup" tool is used to query name servers to find information about resource records. Let\'s find where the name server for google.com is:',
      '"nslookup www.google.com" Server: 127.0.1.1 Address: 127.0.1.1#53',
      'Non-authoritative answer: Name: www.google.com Address: 216.58.192.4',
      'dig: Dig (domain information groper) is a powerful tool for getting information about DNS name servers, it is more flexible than nslookup and great for troubleshooting DNS issues.',
      '"dig www.google.com"',
      '; <<>> DiG 9.9.5-3-Ubuntu <<>> www.google.com ;; global options: +cmd ;; Got answer: ;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 42376 ;; flags: qr rd ra; QUERY: 1, ANSWER: 5, AUTHORITY: 0, ADDITIONAL: 1',
      ';; OPT PSEUDOSECTION: ; EDNS: version: 0, flags:; MBZ: 0005 , udp: 512 ;; QUESTION SECTION: ;www.google.com. IN A',
      ';; ANSWER SECTION: www.google.com. 5 IN A 74.125.239.147 www.google.com. 5 IN A 74.125.239.144 www.google.com. 5 IN A 74.125.239.146 www.google.com. 5 IN A 74.125.239.145 www.google.com. 5 IN A 74.125.239.148',
      ';; Query time: 27 msec ;; SERVER: 127.0.1.1#53(127.0.1.1) ;; WHEN: Sun Feb 07 10:14:00 PST 2016 ;; MSG SIZE rcvd: 123',
    ],
    questions: [
      MCQ(
        'Which topic does the lesson ‘DNS Tools’ cover?',
        'DNS Tools',
        ['DNS Tools', 'What is DNS?', 'DNS Components', 'DNS Process'],
        'This lesson is ‘DNS Tools’ — read its theory above for the full picture.'
      ),
      BUILD(
        'Assemble the command from this lesson: name server lookup',
        ['name', 'server', 'lookup'],
        ['name', 'server', 'lookup', 'sudo', '-la'],
        'Type it exactly as shown: name server lookup. Spacing matters on the command line.'
      ),
      MCQ(
        'The lesson opens with: “nslookup:” — which lesson is this?',
        'DNS Tools',
        ['DNS Tools', 'What is DNS?', 'DNS Components', 'DNS Process'],
        'Those opening lines are from ‘DNS Tools’.'
      ),
    ],
  },
};
