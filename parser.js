class ScriptParser {
    constructor(kernel) {
        this.kernel = kernel;
        this.isRunning = false;
        this.interruptFlag = false;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, Math.max(ms, 0)));
    }

    interrupt() {
        this.interruptFlag = true;
    }

    /**
     * Execute a multi-line batch script under a given PID context.
     */
    async executeScript(codeStr, contextPid = 1) {
        if (this.isRunning) {
            this.kernel.log('[Parser] Already running a script. Please wait or reset.');
            return;
        }
        this.isRunning = true;
        this.interruptFlag = false;

        const lines = codeStr.split('\n')
            .map(l => l.split('//')[0].trim())
            .filter(l => l.length > 0);

        try {
            await this._runContext(contextPid, lines);
        } catch (e) {
            this.kernel.log(`[Script Error] ${e.message}`);
        }

        this.isRunning = false;
    }

    /**
     * Execute a single command string immediately — for live terminal use.
     */
    async executeCommand(cmdStr, contextPid = 1) {
        const line = cmdStr.trim();
        if (!line) return;
        try {
            await this._runLine(contextPid, line);
        } catch (e) {
            this.kernel.log(`[CMD Error] ${e.message}`);
        }
    }

    async _runContext(pid, lines) {
        for (let i = 0; i < lines.length; i++) {
            if (this.interruptFlag) {
                this.kernel.log('[Parser] Script execution interrupted.');
                break;
            }
            await this._runLine(pid, lines[i]);
            await this.sleep(300); // breathing room between commands for visual clarity
        }
    }

    async _runLine(pid, line) {
        const parts = line.split(/\s+/);
        const cmd = parts[0].toLowerCase();

        switch (cmd) {
            case 'fork': {
                // Optional: fork <parent_pid> — defaults to current context pid
                const parentPid = parts[1] ? parseInt(parts[1]) : pid;
                this.kernel.pm_fork(parentPid);
                break;
            }

            case 'sleep': {
                const ms = parseInt(parts[1]) || 1000;
                this.kernel.log(`[CPU] PID ${pid} sleeping for ${ms}ms`);
                await this.sleep(ms);
                break;
            }

            case 'wait': {
                const targetPid = parseInt(parts[1]);
                const childPid = isNaN(targetPid) ? -1 : targetPid;
                await this.kernel.pm_wait(pid, childPid);
                break;
            }

            case 'exit': {
                const status = parseInt(parts[1]) ?? 0;
                this.kernel.pm_exit(pid, status);
                break;
            }

            case 'kill': {
                const kpid = parseInt(parts[1]);
                if (!isNaN(kpid)) {
                    this.kernel.pm_kill(kpid);
                } else {
                    this.kernel.log('[Parser] kill requires a PID argument: kill <pid>');
                }
                break;
            }

            case 'help': {
                this.kernel.log('Commands: fork [ppid], sleep <ms>, wait <pid|-1>, exit <status>, kill <pid>, help');
                break;
            }

            default:
                this.kernel.log(`[Parser] Unknown command: "${cmd}". Type 'help' for available commands.`);
        }
    }

}
