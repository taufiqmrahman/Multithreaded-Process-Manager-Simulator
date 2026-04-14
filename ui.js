/* ============================================
   UI.JS — View Router + DOM Manager
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const chars = '01アイウエオ↑↓←→⌥⎇⊕⊗FORKWAITEXITPIDKILL_STATE_ZOMBIE'.split('');
    const colW = 20;
    const cols = Math.floor(window.innerWidth / colW);
    const drops = new Array(cols).fill(1).map(() => Math.random() * -50);
    const opacities = new Array(cols).fill(0).map(() => Math.random() * 0.5 + 0.1);

    function drawMatrix() {
        ctx.fillStyle = 'rgba(6, 6, 15, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < drops.length; i++) {
            const char = chars[Math.floor(Math.random() * chars.length)];
            // Blue Eclipse palette — deep indigo fading to lavender
            const y = drops[i] * colW;
            const base = Math.random() > 0.95 ? 0.55 : 0.18;
            const alpha = opacities[i] * base;
            // Vary between #272757 and #8686AC tones
            const useLight = Math.random() > 0.6;
            ctx.fillStyle = useLight
                ? `rgba(134, 134, 172, ${alpha})`   /* #8686AC lavender */
                : `rgba(80, 80, 129, ${alpha * 0.7})`; /* #505081 mid */
            ctx.font = `13px 'JetBrains Mono', monospace`;
            ctx.fillText(char, i * colW, y);

            if (y > canvas.height && Math.random() > 0.97) {
                drops[i] = 0;
                opacities[i] = Math.random() * 0.5 + 0.1;
            }
            drops[i] += 0.35;
        }
    }

    let animFrame = setInterval(drawMatrix, 50);

    /* ============================================
       HERO TERMINAL TYPING ANIMATION
    ============================================ */
    const typingEl = document.getElementById('hero-typing');
    const heroTerminal = document.getElementById('hero-terminal');

    const heroScript = [
        { cmd: 'init --boot', delay: 400 },
        { output: '→ Kernel initialized. PID 1 created.', cls: 'ok', delay: 300 },
        { cmd: 'pm_fork 1', delay: 600 },
        { output: '→ Child process spawned. PID 2.', cls: 'ok', delay: 200 },
        { cmd: 'pm_fork 1', delay: 500 },
        { output: '→ Child process spawned. PID 3.', cls: 'ok', delay: 200 },
        { cmd: 'pm_wait 1 -1', delay: 700 },
        { output: '→ PID 1 blocking. Waiting for children...', cls: 'warn', delay: 1200 },
        { output: '→ PID 2 exited (status=0). Reaped.', cls: 'ok', delay: 400 },
        { cmd: 'pm_exit 3 0', delay: 600 },
        { output: '→ PID 3 → ZOMBIE → TERMINATED', cls: 'ok', delay: 300 },
        { output: '✓ All children reaped. PID 1 → RUNNING', cls: 'ok', delay: 500 },
    ];

    async function runHeroAnimation() {
        await typeSleep(800);
        for (const step of heroScript) {
            if (step.cmd) {
                await typeText(typingEl, step.cmd, 60);
                await typeSleep(step.delay || 400);
                // Add new output line
                const outLine = document.createElement('div');
                outLine.className = 'terminal-output-line';
                const cmdLine = document.createElement('div');
                cmdLine.className = 't-line';
                cmdLine.innerHTML = `<span class="t-prompt">root@kernel:~$</span> <span class="t-cmd">${typingEl.textContent}</span>`;
                heroTerminal.insertBefore(cmdLine, heroTerminal.lastElementChild);
                typingEl.textContent = '';
            } else if (step.output) {
                await typeSleep(100);
                const outLine = document.createElement('div');
                outLine.className = `terminal-output-line ${step.cls || ''}`;
                outLine.textContent = step.output;
                heroTerminal.insertBefore(outLine, heroTerminal.lastElementChild);
                await typeSleep(step.delay || 300);
            }
        }
        await typeSleep(2000);
        // Reset
        Array.from(heroTerminal.querySelectorAll('.terminal-output-line, .t-line:not(:last-child)')).forEach(el => el.remove());
        runHeroAnimation();
    }

    async function typeText(el, text, speed = 70) {
        el.textContent = '';
        for (const ch of text) {
            el.textContent += ch;
            await typeSleep(speed + Math.random() * 30);
        }
    }

    function typeSleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    runHeroAnimation();

    /* ============================================
       SCROLL REVEALS — Intersection Observer
    ============================================ */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('revealed'), i * 120);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));

    /* Features list - stagger */
    const featuresObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const items = entry.target.querySelectorAll('li');
                items.forEach((li, i) => setTimeout(() => li.classList.add('revealed'), i * 150));
                featuresObs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    const featuresList = document.querySelector('.features-list');
    if (featuresList) featuresObs.observe(featuresList);

    /* Preview card live cycle */
    const previewRows = [
        document.getElementById('prev-r1'),
        document.getElementById('prev-r2'),
        document.getElementById('prev-r3'),
        document.getElementById('prev-r4'),
    ];
    const rowCycles = [
        ['row-run', 'row-wait', 'row-run'],
        ['row-run', 'row-zomb', 'row-term'],
        ['row-wait', 'row-run', 'row-zomb'],
        ['row-zomb', 'row-term', 'row-run'],
    ];
    let cycleI = 0;
    setInterval(() => {
        cycleI = (cycleI + 1) % 3;
        previewRows.forEach((row, i) => {
            if (!row) return;
            row.className = `preview-row ${rowCycles[i][cycleI]}`;
            const stateEl = row.children[2];
            const stateMap = { 'row-run': 'RUNNING', 'row-wait': 'WAITING', 'row-zomb': 'ZOMBIE', 'row-term': 'TERMINATED' };
            if (stateEl) stateEl.textContent = stateMap[rowCycles[i][cycleI]];
        });
    }, 2000);

    /* ============================================
       VIEW ROUTER
    ============================================ */
    const viewHome = document.getElementById('view-home');
    const viewSim = document.getElementById('view-simulator');
    const pageTransition = document.getElementById('page-transition');

    function showView(view) {
        const allViews = [viewHome, viewSim];
        allViews.forEach(v => v.classList.remove('active'));
        view.classList.add('active');
    }

    async function transitionTo(targetView) {
        pageTransition.classList.add('active');
        await typeSleep(500);
        showView(targetView);
        pageTransition.classList.remove('active');
        pageTransition.classList.add('reveal');
        await typeSleep(500);
        pageTransition.classList.remove('reveal');
    }

    // Launch simulator buttons
    ['btn-launch-hero', 'btn-launch-nav', 'btn-launch-features', 'btn-launch-cta'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => {
            transitionTo(viewSim);
            if (!kernelBooted) bootKernel();
        });
    });

    document.getElementById('btn-back-home').addEventListener('click', () => {
        transitionTo(viewHome);
    });

    /* ============================================
       KERNEL + PARSER SETUP
    ============================================ */
    const kernel = new Kernel();
    const parser = new ScriptParser(kernel);

    let kernelBooted = false;
    let uptimeInterval = null;

    // DOM Refs
    const stateTbody = document.getElementById('state-tbody');
    const slotCountEl = document.getElementById('slot-count');
    const monitorLogs = document.getElementById('monitor-logs');
    const treeContainer = document.getElementById('tree-container');
    const treeSvg = document.getElementById('tree-svg');
    const kernelStatusDot = document.getElementById('kernel-status-dot');
    const kernelStatusText = document.getElementById('kernel-status-text');
    const kernelUptime = document.getElementById('kernel-uptime');
    const terminalOutput = document.getElementById('terminal-output');
    const terminalInput = document.getElementById('terminal-input');
    const treeProcessCount = document.getElementById('tree-process-count');
    const kernelPanic = document.getElementById('kernel-panic');

    /* ---- Logging ---- */
    function formatTime() {
        const d = new Date();
        return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}.${d.getMilliseconds().toString().padStart(3,'0')}`;
    }

    function addMonitorLog(msg, type = 'info') {
        const entry = document.createElement('div');
        entry.className = 'log-entry';

        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-time';
        timeSpan.textContent = formatTime();

        const msgSpan = document.createElement('span');
        const clsMap = { ok: 'ok', warn: 'warn', err: 'err', sys: '', info: '' };
        msgSpan.className = `log-msg ${clsMap[type] || ''}`;
        msgSpan.textContent = msg;

        entry.appendChild(timeSpan);
        entry.appendChild(msgSpan);
        monitorLogs.appendChild(entry);
        monitorLogs.scrollTop = monitorLogs.scrollHeight;
    }

    function addTerminalLog(msg, type = 'ok') {
        const div = document.createElement('div');
        div.className = `t-log t-log-${type}`;
        div.textContent = (type === 'ok' ? '✓ ' : type === 'err' ? '✗ ' : type === 'wait' ? '⏳ ' : '  ') + msg;
        terminalOutput.appendChild(div);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    kernel.onLog = (msg, type) => {
        addMonitorLog(msg, type);
        addTerminalLog(msg, type);
    };

    kernel.onProcessUpdate = () => {
        renderTable();
        renderTree();
        updateStats();
    };

    kernel.onPanic = (msg) => {
        kernelPanic.classList.remove('hidden');
    };

    /* ---- Boot Kernel ---- */
    function bootKernel() {
        kernelBooted = true;
        kernel.init();
        kernelPanic.classList.add('hidden');
        kernelStatusDot.classList.add('online');
        kernelStatusText.textContent = 'ONLINE';
        if (uptimeInterval) clearInterval(uptimeInterval);
        uptimeInterval = setInterval(() => {
            const secs = Math.floor((Date.now() - kernel.startTime) / 1000);
            const mm = String(Math.floor(secs / 60)).padStart(2, '0');
            const ss = String(secs % 60).padStart(2, '0');
            kernelUptime.textContent = `${mm}:${ss}`;
        }, 1000);
    }

    /* ---- Stats ---- */
    function updateStats() {
        const activeProcs = kernel.getActiveProcesses();
        slotCountEl.textContent = `${activeProcs.length}/64`;
        if (treeProcessCount) treeProcessCount.textContent = `${activeProcs.length} process${activeProcs.length !== 1 ? 'es' : ''}`;
    }

    /* ---- State Table ---- */
    function getStateCls(state) {
        if (state === PROCESS_STATES.RUNNING) return 'row-run';
        if (state === PROCESS_STATES.WAITING) return 'row-wait';
        if (state === PROCESS_STATES.ZOMBIE) return 'row-zomb';
        return 'row-term';
    }

    function renderTable() {
        stateTbody.innerHTML = '';
        for (const p of kernel.processTable) {
            if (!p) continue;
            const tr = document.createElement('tr');
            tr.className = getStateCls(p.state);
            tr.innerHTML = `
                <td>${p.pid}</td>
                <td>${p.ppid}</td>
                <td>${p.state}</td>
                <td>${p.exit_status !== null ? p.exit_status : '—'}</td>
                <td>${p.children.join(', ') || '—'}</td>
            `;
            stateTbody.appendChild(tr);
        }
    }

    /* ---- Process Tree ---- */
    function getNodeClass(state) {
        if (state === PROCESS_STATES.RUNNING) return 'node-run';
        if (state === PROCESS_STATES.WAITING) return 'node-wait';
        if (state === PROCESS_STATES.ZOMBIE) return 'node-zomb';
        return 'node-term';
    }

    function getDepth(p, memo = {}) {
        if (p.pid in memo) return memo[p.pid];
        if (p.ppid === 0) return (memo[p.pid] = 0);
        const parent = kernel._getByPid(p.ppid);
        if (!parent) return (memo[p.pid] = 0);
        return (memo[p.pid] = getDepth(parent, memo) + 1);
    }

    function renderTree() {
        treeContainer.innerHTML = '';
        treeSvg.innerHTML = '';

        const procs = kernel.processTable.filter(p => p !== null);

        if (procs.length === 0) {
            treeContainer.innerHTML = `
                <div class="empty-tree">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                    <span>Kernel offline. Launch the kernel to begin.</span>
                </div>`;
            return;
        }

        // Group by depth
        const memo = {};
        const levels = {};
        let maxDepth = 0;
        procs.forEach(p => {
            const d = getDepth(p, memo);
            if (!levels[d]) levels[d] = [];
            levels[d].push(p);
            if (d > maxDepth) maxDepth = d;
        });

        const nodeEls = {};
        for (let d = 0; d <= maxDepth; d++) {
            if (!levels[d]) continue;
            const lvlDiv = document.createElement('div');
            lvlDiv.className = 'tree-level';

            levels[d].forEach(p => {
                const node = document.createElement('div');
                node.className = `process-node ${getNodeClass(p.state)}`;
                node.id = `node-${p.pid}`;
                node.innerHTML = `
                    <span class="node-pid">PID ${p.pid}</span>
                    <span class="node-state">${p.state}</span>
                    <span class="node-ppid">PPID ${p.ppid}</span>
                `;
                lvlDiv.appendChild(node);
                nodeEls[p.pid] = node;
            });

            treeContainer.appendChild(lvlDiv);
        }

        // Draw SVG lines after layout
        requestAnimationFrame(() => drawLines(procs, nodeEls));
    }

    function drawLines(procs, nodeEls) {
        treeSvg.innerHTML = '';
        const svgRect = treeSvg.getBoundingClientRect();

        procs.forEach(c => {
            if (c.ppid === 0) return;
            const parentEl = nodeEls[c.ppid];
            const childEl = nodeEls[c.pid];
            if (!parentEl || !childEl) return;

            const pR = parentEl.getBoundingClientRect();
            const cR = childEl.getBoundingClientRect();

            const x1 = pR.left + pR.width / 2 - svgRect.left;
            const y1 = pR.bottom - svgRect.top;
            const x2 = cR.left + cR.width / 2 - svgRect.left;
            const y2 = cR.top - svgRect.top;
            const my = (y1 + y2) / 2;

            // Bezier curve
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`);
            path.setAttribute('class', 'tree-line');

            // Color by child state
            const stateColors = {
                [PROCESS_STATES.RUNNING]: 'rgba(0,255,65,0.25)',
                [PROCESS_STATES.WAITING]: 'rgba(255,186,0,0.25)',
                [PROCESS_STATES.ZOMBIE]: 'rgba(255,59,59,0.25)',
                [PROCESS_STATES.TERMINATED]: 'rgba(61,68,77,0.3)',
            };
            path.style.stroke = stateColors[c.state] || 'rgba(61,68,77,0.3)';
            treeSvg.appendChild(path);
        });
    }

    window.addEventListener('resize', () => {
        if (viewSim.classList.contains('active')) renderTree();
    });

    /* ============================================
       LIVE TERMINAL COMMANDS
    ============================================ */
    async function handleTerminalCommand(cmdStr) {
        if (!kernelBooted) {
            addTerminalLog('Kernel not running. Please boot the kernel first.', 'err');
            return;
        }
        const displayLine = document.createElement('div');
        displayLine.className = 't-log t-log-cmd';
        displayLine.textContent = `❯ ${cmdStr}`;
        terminalOutput.appendChild(displayLine);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;

        // Check for special UI overrides
        const parts = cmdStr.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        if (cmd === 'clear' || cmd === 'cls') {
            terminalOutput.innerHTML = '';
            return;
        }
        if (cmd === 'reset') {
            resetKernel();
            return;
        }

        await parser.executeCommand(cmdStr, 1);
    }

    terminalInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const val = terminalInput.value.trim();
            if (val) {
                terminalInput.value = '';
                await handleTerminalCommand(val);
            }
        }
    });

    document.getElementById('btn-exec').addEventListener('click', async () => {
        const val = terminalInput.value.trim();
        if (val) {
            terminalInput.value = '';
            await handleTerminalCommand(val);
        }
    });

    /* ============================================
       QUICK ACTION BUTTONS
    ============================================ */
    const modal = document.getElementById('qa-modal');
    const modalTitle = document.getElementById('qa-modal-title');
    const modalBody = document.getElementById('qa-modal-body');
    const modalConfirm = document.getElementById('qa-modal-confirm');
    const modalCancel = document.getElementById('qa-modal-cancel');

    let pendingAction = null;

    function showModal(title, bodyHTML, onConfirm) {
        modalTitle.textContent = title;
        modalBody.innerHTML = bodyHTML;
        modal.classList.remove('hidden');
        pendingAction = onConfirm;

        // Style selects inside modal
        modal.querySelectorAll('select').forEach(s => s.classList.add('modal-select'));
        modal.querySelectorAll('input').forEach(i => i.classList.add('modal-input'));
    }

    function closeModal() {
        modal.classList.add('hidden');
        pendingAction = null;
    }

    modalConfirm.addEventListener('click', () => {
        if (pendingAction) pendingAction();
        closeModal();
    });
    modalCancel.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    function buildProcessOptions(filterFn = null) {
        const procs = kernel.getActiveProcesses();
        const filtered = filterFn ? procs.filter(filterFn) : procs;
        return filtered.map(p => `<option value="${p.pid}">PID ${p.pid} [${p.state}]</option>`).join('');
    }

    // Fork
    document.getElementById('qa-fork').addEventListener('click', () => {
        if (!kernelBooted) return;
        const options = buildProcessOptions(p => p.state === PROCESS_STATES.RUNNING);
        showModal('FORK PROCESS', `
            <div class="modal-field">
                <label class="modal-label">PARENT PROCESS</label>
                <select id="modal-parent" class="modal-select">${options}</select>
            </div>
        `, () => {
            const parentPid = parseInt(document.getElementById('modal-parent').value);
            try {
                const childPid = kernel.pm_fork(parentPid);
                if (childPid > 0) parser._spawnChildWorker(childPid);
            } catch(e) {}
        });
    });

    // Kill
    document.getElementById('qa-kill').addEventListener('click', () => {
        if (!kernelBooted) return;
        const options = buildProcessOptions(p => p.pid !== 1 && p.state === PROCESS_STATES.RUNNING);
        showModal('KILL PROCESS (SIGKILL)', `
            <div class="modal-field">
                <label class="modal-label">TARGET PROCESS</label>
                <select id="modal-kill-pid" class="modal-select">${options}</select>
            </div>
        `, () => {
            const pid = parseInt(document.getElementById('modal-kill-pid').value);
            kernel.pm_kill(pid);
        });
    });

    // Wait
    document.getElementById('qa-wait').addEventListener('click', () => {
        if (!kernelBooted) return;
        const parentOpts = buildProcessOptions(p => p.state === PROCESS_STATES.RUNNING && p.children.length > 0);
        showModal('PM_WAIT — Block Parent', `
            <div class="modal-field">
                <label class="modal-label">PARENT (waiter)</label>
                <select id="modal-wait-parent" class="modal-select">${parentOpts}</select>
            </div>
            <div class="modal-field">
                <label class="modal-label">CHILD PID (-1 = any)</label>
                <input id="modal-wait-child" type="number" value="-1" class="modal-input">
            </div>
        `, () => {
            const parentPid = parseInt(document.getElementById('modal-wait-parent').value);
            const childPid = parseInt(document.getElementById('modal-wait-child').value) || -1;
            kernel.pm_wait(parentPid, childPid);
        });
    });

    // Exit
    document.getElementById('qa-exit').addEventListener('click', () => {
        if (!kernelBooted) return;
        const options = buildProcessOptions(p => p.pid !== 1 && p.state === PROCESS_STATES.RUNNING);
        showModal('PM_EXIT — Exit Process', `
            <div class="modal-field">
                <label class="modal-label">PROCESS</label>
                <select id="modal-exit-pid" class="modal-select">${options}</select>
            </div>
            <div class="modal-field">
                <label class="modal-label">EXIT STATUS</label>
                <input id="modal-exit-status" type="number" value="0" class="modal-input">
            </div>
        `, () => {
            const pid = parseInt(document.getElementById('modal-exit-pid').value);
            const status = parseInt(document.getElementById('modal-exit-status').value) || 0;
            kernel.pm_exit(pid, status);
        });
    });

    /* ============================================
       BATCH SCRIPT RUNNER
    ============================================ */
    const btnRunAll = document.getElementById('btn-run-all');

    btnRunAll.addEventListener('click', async () => {
        if (!kernelBooted) bootKernel();
        if (parser.isRunning) {
            parser.interrupt();
            return;
        }
        const code = document.getElementById('script-input').value;
        btnRunAll.textContent = '⏹ INTERRUPT';
        btnRunAll.style.borderColor = 'rgba(255,59,59,0.4)';
        btnRunAll.style.color = 'var(--red)';

        kernel.init(); // Reset for fresh run
        await parser.executeScript(code, 1);

        btnRunAll.textContent = '▶ RUN ALL';
        btnRunAll.style.borderColor = '';
        btnRunAll.style.color = '';
    });

    document.getElementById('btn-clear-script').addEventListener('click', () => {
        document.getElementById('script-input').value = '';
    });

    /* ============================================
       RESET / REBOOT
    ============================================ */
    function resetKernel() {
        parser.interrupt();
        kernelPanic.classList.add('hidden');
        terminalOutput.innerHTML = '';
        monitorLogs.innerHTML = '';
        bootKernel();
        addTerminalLog('Kernel rebooted. Init process (PID 1) created.', 'ok');
    }

    document.getElementById('btn-reset').addEventListener('click', resetKernel);
    document.getElementById('btn-panic-reset').addEventListener('click', resetKernel);
    document.getElementById('btn-clear-log').addEventListener('click', () => { monitorLogs.innerHTML = ''; });

    /* ============================================
       INITIAL STATE
    ============================================ */
    // Render empty tree on simulator view
    renderTree();
});
