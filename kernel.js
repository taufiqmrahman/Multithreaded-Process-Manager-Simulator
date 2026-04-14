/* ============================================
   KERNEL.JS — Process Manager Core
   Mimics a multithreaded OS kernel
   ============================================ */

const PROCESS_STATES = Object.freeze({
    RUNNING: 'RUNNING',
    WAITING: 'WAITING',
    ZOMBIE: 'ZOMBIE',
    TERMINATED: 'TERMINATED'
});

class PCB {
    constructor(pid, ppid) {
        this.pid = pid;
        this.ppid = ppid;
        this.state = PROCESS_STATES.RUNNING;
        this.exit_status = null;
        this.children = [];
        this.createdAt = Date.now();
    }
}

class Kernel {
    constructor() {
        this.MAX_PROCESSES = 64;
        this.processTable = new Array(this.MAX_PROCESSES).fill(null);
        this.nextPid = 1;
        this.waitQueue = {}; // { parent_pid: { child_pid, resolve, reject } }
        this.onProcessUpdate = null;
        this.onLog = null;
        this.onPanic = null;
        this.startTime = null;
    }

    /* ---- Lifecycle ---- */
    init() {
        this.processTable.fill(null);
        this.waitQueue = {};
        this.nextPid = 1;
        this.startTime = Date.now();
        this._log('Simulator initializing...', 'sys');
        
        // PID 1: Init
        const init = new PCB(this.nextPid++, 0);
        this.processTable[0] = init;
        this._log('Init process created (PID 1, PPID 0). State → RUNNING', 'ok');
        
        this._notify();
        return init.pid;
    }

    /* ---- Internal Helpers ---- */
    _log(msg, type = 'info') {
        if (this.onLog) this.onLog(msg, type);
        else console.log(`[Kernel] ${msg}`);
    }

    _notify() {
        if (this.onProcessUpdate) this.onProcessUpdate();
    }

    _findSlot() {
        for (let i = 0; i < this.MAX_PROCESSES; i++) {
            if (this.processTable[i] === null ||
                this.processTable[i].state === PROCESS_STATES.TERMINATED) {
                return i;
            }
        }
        return -1;
    }

    // Public-friendly alias used by parser
    _getByPid(pid) {
        return this.processTable.find(p => p !== null && p.pid === pid);
    }

    _getActive(pid) {
        const p = this._getByPid(pid);
        return (p && p.state !== PROCESS_STATES.TERMINATED) ? p : null;
    }

    getActiveProcesses() {
        return this.processTable.filter(p => p !== null && p.state !== PROCESS_STATES.TERMINATED);
    }

    /* ---- System Calls ---- */

    /**
     * pm_fork(parent_pid) — Create a child process
     */
    pm_fork(parent_pid) {
        const parent = this._getActive(parent_pid);
        if (!parent) {
            this._log(`pm_fork failed: Parent PID ${parent_pid} not found or terminated.`, 'err');
            return -1;
        }

        const slot = this._findSlot();
        if (slot === -1) {
            const msg = 'KERNEL PANIC: Process table is full (64 processes). No fork allowed.';
            this._log(msg, 'err');
            if (this.onPanic) this.onPanic(msg);
            throw new Error(msg);
        }

        const child = new PCB(this.nextPid++, parent_pid);
        this.processTable[slot] = child;
        parent.children.push(child.pid);

        this._log(`pm_fork: PID ${parent_pid} → child PID ${child.pid} (slot ${slot})`, 'ok');
        this._notify();
        return child.pid;
    }

    /**
     * pm_exit(pid, status) — Process exits, becomes ZOMBIE until reaped
     */
    pm_exit(pid, status = 0) {
        const proc = this._getActive(pid);
        if (!proc) {
            this._log(`pm_exit failed: PID ${pid} not found or already terminated.`, 'err');
            return -1;
        }

        proc.state = PROCESS_STATES.ZOMBIE;
        proc.exit_status = status;
        this._log(`pm_exit: PID ${pid} exited (status=${status}). State → ZOMBIE`, 'warn');

        // Check if parent is blocking on wait
        const waitInfo = this.waitQueue[proc.ppid];
        if (waitInfo && (waitInfo.child_pid === pid || waitInfo.child_pid === -1)) {
            this._reap(proc, proc.ppid, waitInfo.resolve);
            delete this.waitQueue[proc.ppid];
        }

        this._notify();
        return 0;
    }

    /**
     * pm_wait(parent_pid, child_pid=-1) — Block parent until a child exits
     * Returns a Promise that resolves when child is reaped.
     */
    pm_wait(parent_pid, child_pid = -1) {
        return new Promise((resolve, reject) => {
            const parent = this._getActive(parent_pid);
            if (!parent) {
                this._log(`pm_wait failed: Parent PID ${parent_pid} not found.`, 'err');
                resolve(-1);
                return;
            }

            // Check for already-zombie children
            if (child_pid === -1) {
                for (const cid of parent.children) {
                    const child = this._getByPid(cid);
                    if (child && child.state === PROCESS_STATES.ZOMBIE) {
                        this._reap(child, parent_pid, resolve);
                        return;
                    }
                }
                // No zombie children present — check if there are any children at all
                if (parent.children.length === 0) {
                    this._log(`pm_wait: PID ${parent_pid} has no children to wait for.`, 'warn');
                    resolve(-1);
                    return;
                }
            } else {
                const child = this._getByPid(child_pid);
                if (!child || child.ppid !== parent_pid) {
                    this._log(`pm_wait failed: PID ${child_pid} is not a child of ${parent_pid}.`, 'err');
                    resolve(-1);
                    return;
                }
                if (child.state === PROCESS_STATES.ZOMBIE) {
                    this._reap(child, parent_pid, resolve);
                    return;
                }
            }

            // Block parent
            parent.state = PROCESS_STATES.WAITING;
            const targetStr = child_pid === -1 ? 'ANY' : child_pid;
            this._log(`pm_wait: PID ${parent_pid} blocking on child [${targetStr}]. State → WAITING`, 'wait');

            this.waitQueue[parent_pid] = { child_pid, resolve, reject };
            this._notify();
        });
    }

    /**
     * pm_kill(pid) — Forcefully terminate a process (sends signal 9)
     */
    pm_kill(pid) {
        const proc = this._getActive(pid);
        if (!proc) {
            this._log(`pm_kill failed: PID ${pid} not found.`, 'err');
            return -1;
        }

        if (pid === 1) {
            this._log(`pm_kill: Cannot kill Init process (PID 1).`, 'err');
            return -1;
        }

        this._log(`pm_kill: Sending SIGKILL to PID ${pid}`, 'warn');
        this.pm_exit(pid, 9);
        return 0;
    }

    /* ---- Internal: Reap ---- */
    _reap(child, parentPid, resolve) {
        const prevState = child.state;
        child.state = PROCESS_STATES.TERMINATED;
        this._log(`Kernel: PID ${child.pid} reaped by parent ${parentPid}. State → TERMINATED`, 'ok');

        const parent = this._getActive(parentPid);
        if (parent && parent.state === PROCESS_STATES.WAITING) {
            parent.state = PROCESS_STATES.RUNNING;
            this._log(`Kernel: Parent PID ${parentPid} unblocked. State → RUNNING`, 'ok');
        }

        if (parent) {
            parent.children = parent.children.filter(c => c !== child.pid);
        }

        this._notify();
        resolve(child.pid);
    }
}
