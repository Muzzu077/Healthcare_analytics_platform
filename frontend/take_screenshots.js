import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('../docs/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('Launching Chrome via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1600,1050'],
    defaultViewport: { width: 1600, height: 1050 }
  });

  const page = await browser.newPage();

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Perform login as Admin to get full executive & DBA view
  console.log('Authenticating as Chief Medical Administrator (admin)...');
  await page.evaluate(async () => {
    try {
      const res = await fetch('http://localhost:8088/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'username=admin&password=admin123'
      });
      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        username: 'admin',
        full_name: 'Chief Medical Administrator',
        role: 'admin',
        department: 'Administration',
        is_active: true
      }));
    } catch (e) {
      console.error(e);
    }
  });

  // Reload with token
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Check if landing page shows "Launch Platform" button, click it if present
  await page.evaluate(() => {
    const launchBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.textContent.toLowerCase().includes('launch') || 
      b.textContent.toLowerCase().includes('enter') ||
      b.textContent.toLowerCase().includes('portal')
    );
    if (launchBtn) launchBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // 1. Executive Dashboard
  console.log('Capturing 01_executive_dashboard.png...');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_executive_dashboard.png') });

  // Helper to click sidebar button by item ID or label
  async function clickTab(id, labelPart) {
    console.log(`Switching to tab: ${id} (${labelPart})...`);
    await page.evaluate((tabId, label) => {
      const btns = Array.from(document.querySelectorAll('aside button, nav button, button'));
      const target = btns.find(b => 
        b.innerHTML.includes(tabId) || 
        b.innerText.toLowerCase().includes(label.toLowerCase())
      );
      if (target) {
        target.click();
      }
    }, id, labelPart);
    await new Promise(r => setTimeout(r, 2500));
  }

  // 2. Query Workspace
  console.log('Capturing 02_query_workspace.png...');
  await clickTab('query_workspace', 'query workspace');
  // Click Run Query button inside workspace to render results & visual plan
  await page.evaluate(() => {
    const runBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.innerText.includes('Execute Query') || b.innerText.includes('Run Query') || b.innerText.includes('Execute')
    );
    if (runBtn) runBtn.click();
  });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_query_workspace.png') });

  // 3. Adaptive Optimizer
  console.log('Capturing 03_adaptive_optimizer.png...');
  await clickTab('optimizer', 'adaptive optimizer');
  // Click Run Analysis button
  await page.evaluate(() => {
    const optBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.innerText.includes('Analyze Query Plan') || b.innerText.includes('Analyze') || b.innerText.includes('Run Benchmark')
    );
    if (optBtn) optBtn.click();
  });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_adaptive_optimizer.png') });

  // 4. Predictive Analytics
  console.log('Capturing 04_predictive_analytics.png...');
  await clickTab('predictive_analytics', 'predictive risk');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_predictive_analytics.png') });

  // 5. Live Telemetry Monitoring
  console.log('Capturing 05_live_monitoring.png...');
  await clickTab('live_monitoring', 'live icu');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_live_monitoring.png') });

  // 6. Patient Registry & Longitudinal EMR
  console.log('Capturing 06_patient_registry.png...');
  await clickTab('patients', 'patient registry');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_patient_registry.png') });

  // 7. Admissions & Ward Bed Census
  console.log('Capturing 07_admissions_bed_management.png...');
  await clickTab('admissions', 'admissions');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_admissions_bed_management.png') });

  // 8. Clinical Alerts Center
  console.log('Capturing 08_clinical_alerts.png...');
  await clickTab('alerts', 'alerts center');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_clinical_alerts.png') });

  // 9. Security Audit Log
  console.log('Capturing 09_audit_logs.png...');
  await clickTab('audit_log', 'security audit');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_audit_logs.png') });

  // 10. System Administration & Database Telemetry
  console.log('Capturing 10_system_admin.png...');
  await clickTab('system_admin', 'system administration');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_system_admin.png') });

  console.log('✓ All 10 healthcare screenshots captured successfully!');
  await browser.close();
}

run().catch(console.error);
