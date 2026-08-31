import asyncio
import json
import base64
import os
import subprocess
import time
import urllib.request
import websockets

os.makedirs('docs/screenshots', exist_ok=True)

async def main():
    # Kill any leftover chrome
    subprocess.run(['pkill', '-f', 'google-chrome-stable'], stderr=subprocess.DEVNULL)
    time.sleep(1)

    chrome_proc = subprocess.Popen([
        '/usr/bin/google-chrome-stable',
        '--headless=new',
        '--remote-debugging-port=9222',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--window-size=1600,1000'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    try:
        # Get WebSocket debugger URL
        with urllib.request.urlopen('http://127.0.0.1:9222/json/list') as res:
            targets = json.loads(res.read())
            ws_url = targets[0]['webSocketDebuggerUrl']

        async with websockets.connect(ws_url, max_size=20_000_000) as ws:
            req_id = 1
            pending_responses = {}

            async def reader():
                while True:
                    try:
                        raw = await ws.recv()
                        data = json.loads(raw)
                        if 'id' in data:
                            fut = pending_responses.pop(data['id'], None)
                            if fut and not fut.done():
                                fut.set_result(data)
                    except Exception:
                        break

            reader_task = asyncio.create_task(reader())

            async def call_cdp(method, params=None):
                nonlocal req_id
                cid = req_id
                req_id += 1
                fut = asyncio.get_running_loop().create_future()
                pending_responses[cid] = fut
                await ws.send(json.dumps({'id': cid, 'method': method, 'params': params or {}}))
                return await fut

            print("Enabling CDP domains...")
            await call_cdp('Page.enable')
            await call_cdp('Runtime.enable')

            # Fetch token for admin
            token_req = urllib.request.Request(
                'http://localhost:8088/api/auth/token',
                data='username=admin&password=admin123'.encode('utf-8'),
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            with urllib.request.urlopen(token_req) as res:
                auth_data = json.loads(res.read())
                token = auth_data['access_token']
                user_json = json.dumps({
                    'id': 1,
                    'username': 'admin',
                    'full_name': 'Chief Medical Administrator',
                    'role': 'admin',
                    'department': 'Administration',
                    'is_active': True
                })

            print("Navigating to http://localhost:3000 ...")
            await call_cdp('Page.navigate', {'url': 'http://localhost:3000'})
            await asyncio.sleep(2)

            # Inject localStorage token
            inject_js = f'''
                localStorage.setItem('token', '{token}');
                localStorage.setItem('user', JSON.stringify({user_json}));
                window.location.reload();
            '''
            await call_cdp('Runtime.evaluate', {'expression': inject_js})
            await asyncio.sleep(3)

            async def screenshot(filename):
                res = await call_cdp('Page.captureScreenshot', {'format': 'png'})
                img = base64.b64decode(res['result']['data'])
                out_path = os.path.join('docs/screenshots', filename)
                with open(out_path, 'wb') as f:
                    f.write(img)
                print(f"✓ Saved {filename} ({len(img)} bytes)")

            # Screenshot 1: Executive Dashboard
            print("Capturing 01_executive_dashboard.png...")
            await screenshot('01_executive_dashboard.png')

            # Let's define the tabs to visit
            tabs = [
                ('query_workspace', '02_query_workspace.png', 3.5, '''
                    const runBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Execute') || b.textContent.includes('Run'));
                    if (runBtn) runBtn.click();
                '''),
                ('optimizer', '03_adaptive_optimizer.png', 3.5, '''
                    const optBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Analyze') || b.textContent.includes('Benchmark'));
                    if (optBtn) optBtn.click();
                '''),
                ('predictive_analytics', '04_predictive_analytics.png', 3.0, ''),
                ('live_monitoring', '05_live_monitoring.png', 3.0, ''),
                ('patients', '06_patient_registry.png', 3.0, ''),
                ('admissions', '07_admissions_bed_management.png', 3.0, ''),
                ('alerts', '08_clinical_alerts.png', 3.0, ''),
                ('audit_log', '09_audit_logs.png', 3.0, ''),
                ('system_admin', '10_system_admin.png', 3.0, '')
            ]

            for tab_id, fname, wait_s, custom_js in tabs:
                print(f"Navigating to tab: {tab_id} -> {fname}")
                switch_js = f'''
                    const btn = Array.from(document.querySelectorAll('aside button')).find(b => b.innerHTML.includes('{tab_id}'));
                    if (btn) btn.click();
                '''
                await call_cdp('Runtime.evaluate', {'expression': switch_js})
                await asyncio.sleep(wait_s)
                if custom_js:
                    await call_cdp('Runtime.evaluate', {'expression': custom_js})
                    await asyncio.sleep(2.0)
                await screenshot(fname)

            reader_task.cancel()
            print("All screenshots successfully captured!")

    finally:
        chrome_proc.terminate()

if __name__ == '__main__':
    asyncio.run(main())
