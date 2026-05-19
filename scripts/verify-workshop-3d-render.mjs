import { spawn } from 'node:child_process';

const CHROME = process.env.CHROME_BIN || 'chromium';
const APP_URL = process.env.APP_URL || 'http://localhost:5173/';
const DEBUG_PORT = Number(process.env.DEBUG_PORT || 9223);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDevtools() {
    for (let i = 0; i < 60; i += 1) {
        try {
            const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
            if (response.ok) return;
        } catch {
            // keep waiting
        }
        await sleep(100);
    }
    throw new Error('Chrome DevTools endpoint did not become available.');
}

async function waitForPageTarget() {
    for (let i = 0; i < 30; i += 1) {
        const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
        const targets = await response.json();
        const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
        if (page) return page;
        await sleep(100);
    }
    throw new Error('Chrome page target did not become available.');
}

function connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    let seq = 0;
    const pending = new Map();
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.id && pending.has(message.id)) {
            pending.get(message.id)(message);
            pending.delete(message.id);
        }
    };
    const opened = new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
    });
    return {
        opened,
        send(method, params = {}) {
            return new Promise((resolve) => {
                const id = ++seq;
                pending.set(id, resolve);
                ws.send(JSON.stringify({ id, method, params }));
            });
        },
        close() {
            ws.close();
        },
    };
}

async function waitForTrue(send, expression, label) {
    for (let i = 0; i < 50; i += 1) {
        const result = await send('Runtime.evaluate', { returnByValue: true, expression });
        if (result.result?.result?.value) return;
        await sleep(100);
    }
    const debug = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `({
            text: document.body.innerText.slice(0, 500),
            buttons: [...document.querySelectorAll('button')].map((button) => ({
                label: button.getAttribute('data-label'),
                title: button.title,
                text: button.textContent?.trim(),
                active: button.className,
            })),
            canvasCount: document.querySelectorAll('canvas').length
        })`,
    });
    throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(debug.result?.result?.value)}`);
}

async function readCanvas(send) {
    const result = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
            const canvas = document.querySelector('.ws-3d-canvas canvas');
            if (!canvas) return { ok: false, reason: 'no canvas' };
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (!gl) return { ok: false, reason: 'no webgl context' };
            const pixel = new Uint8Array(4);
            gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
            const rect = canvas.getBoundingClientRect();
            return {
                ok: true,
                width: canvas.width,
                height: canvas.height,
                cssWidth: Math.round(rect.width),
                cssHeight: Math.round(rect.height),
                centerPixel: Array.from(pixel),
            };
        })()`,
    });
    const remoteValue = result.result?.result;
    if (!remoteValue) throw new Error(`Runtime.evaluate did not return a value: ${JSON.stringify(result)}`);
    return remoteValue.value;
}

async function main() {
    const userDataDir = `/tmp/hauskompass-workshop-3d-${process.pid}`;
    const chrome = spawn(CHROME, [
        '--headless=new',
        '--no-sandbox',
        '--use-gl=swiftshader',
        '--enable-unsafe-swiftshader',
        `--remote-debugging-port=${DEBUG_PORT}`,
        `--user-data-dir=${userDataDir}`,
        'about:blank',
    ], { stdio: 'ignore' });

    try {
        await waitForDevtools();
        const page = await waitForPageTarget();
        const cdp = connect(page.webSocketDebuggerUrl);
        await cdp.opened;
        const { send } = cdp;

        await send('Page.enable');
        await send('Runtime.enable');
        await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
        await send('Page.navigate', { url: APP_URL });
        await waitForTrue(send, `!!document.querySelector('.ph-project-card-builtin')`, 'project home');
        await send('Runtime.evaluate', { expression: `document.querySelector('.ph-project-card-builtin')?.click()` });
        await waitForTrue(send, `!!document.querySelector('button[data-label="3D"]')`, 'Workshop 3D nav button');
        await send('Runtime.evaluate', { expression: `document.querySelector('button[data-label="3D"]')?.click()` });
        await waitForTrue(send, `!!document.querySelector('.ws-3d-canvas canvas')`, 'Workshop 3D canvas');
        await sleep(800);

        const desktop = await readCanvas(send);
        const desktopScreenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });

        await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
        await sleep(1000);
        const mobile = await readCanvas(send);
        const mobileScreenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });

        cdp.close();

        console.log(JSON.stringify({
            appUrl: APP_URL,
            desktop,
            mobile,
            screenshots: {
                desktopBytesBase64: desktopScreenshot.result?.data?.length ?? 0,
                mobileBytesBase64: mobileScreenshot.result?.data?.length ?? 0,
            },
        }, null, 2));

        if (!desktop.ok || !mobile.ok) throw new Error('Workshop 3D canvas missing or WebGL unavailable.');
        if (!desktopScreenshot.result?.data || !mobileScreenshot.result?.data) throw new Error('Screenshot capture failed.');
    } finally {
        chrome.kill();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
