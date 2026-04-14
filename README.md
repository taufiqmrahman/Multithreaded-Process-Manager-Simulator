# Multithreaded Process Manager Simulator

An interactive educational tool for visualizing OS process lifecycles, parent-child relationships, and concurrency through a multithreaded process manager simulation. 

This project serves as an interactive OS kernel visualizer running entirely in the browser, allowing you to fork processes, simulate waits, witness zombie states, and see how a multithreaded OS kernel manages processes under the hood.

## 🚀 Features

- **Live Interactive Terminal**: Type commands directly and watch the kernel respond — fork, kill, wait, exit — all in real-time.
- **Process Tree Visualizer**: Visualizes structural parent-to-child connections with Bezier-curve SVG lines. Nodes glow dynamically based on their state.
- **Monitor Feed**: A timestamped millisecond-level log of every kernel event, serving as a live system journal.
- **Kernel Panic**: Trigger a kernel panic overlay by exceeding the 64-process hard limit, forcing a kernel reboot.
- **Batch Script Runner**: Provides the ability to run sequential or simultaneous commands for bulk testing and complex simulation scenarios.

## 🧠 Concepts Visualized

- **Process States**: Watch a process seamlessly transition through states:
  - `RUNNING`: Process is currently executing.
  - `WAITING` (Blocked): Parent process waiting for a child to exit.
  - `ZOMBIE`: Process exited, but uncollected by parent.
  - `TERMINATED` (Reaped): Process completely removed from the system.
- **Process Control Block (PCB)**: Track PID, PPID, state, exit status, and children at a glance.
- **Fork & Wait Mechanism**: Explore the traditional OS approach to creating branching processes and safely resolving them without leaving orphans.

## 💻 Usage

Upon launching the simulator, you will see a clean UI divided into three sections:
1. **Command Dispatch (Left)**: Utilize quick actions, the interactive live terminal, or the batch script runner to interact with the kernel.
2. **Process Tree (Center)**: The dynamic visualizer illustrating your current processes and their relationships.
3. **Process Table & Monitor (Right)**: Detailed tabular data of active processes paired with the live event monitor log.

### Supported Terminal Commands
- `fork` or `f` - Forks the currently active process (or a specific process if indicated, depending on implementation).
- `kill [pid]` or `k [pid]` - Forcefully terminates a specific process.
- `wait [pid]` or `w [pid]` - Blocks a process until the specified child completes.
- `exit [pid] [status]` or `e [pid] [status]` - Exits a process returning a specific status.
- `sleep [ms]` - Sleep function used mainly in the Batch script to set delay timings.

## 🛠️ Technology Stack

- **HTML5**
- **Vanilla JavaScript** (No Frameworks)
- **CSS3** (Custom Animations & UI effects)

## 👥 Developers

Developed as part of **CSE321 SPRING 2026** by:
- **[Ahnaf Ashique Adi](https://www.facebook.com/ahnaf.ashique.adi)** (UI / SIM)
- **[Taufiq Mustafizur Rahman](https://www.facebook.com/Letthebatbewithyou)** (KERNEL / C)

---
*© 2026 Process Manager Simulator. All rights reserved.*
