const puppeteer = require('C:/Users/Administrator/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const HTML = 'D:/dev/pro_orangemodel/html/';
const SHOT = 'D:/dev/pro_orangemodel/docs/screenshots/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TAB_PAGES = [
  'backhand/growth/growth_model.html',
  'backhand/growth/base_archive.html',
  'backhand/growth/factor_collect.html',
  'backhand/growth/farm_scheme_config.html',
  'backhand/growth/calibration.html',
  'backhand/pest/pest_data.html',
  'backhand/pest/pest_report.html',
  'backhand/pest/pest_diagnosis.html',
  'backhand/pest/pest_params.html',
  'mobile/mb_data.html',
  'mobile/mb_data_input.html',
  'mobile/mb_messages.html',
  'mobile/mb_profile_records.html',
];

const DASHBOARD_MODALS = ['主体','活跃度','植株','报告','评分','农事','采纳率','学习'];

function viewportFor(rel){
  return rel.startsWith('mobile/') ? {width:430,height:932} : {width:1920,height:1080};
}
const TAB_SEL = '[data-tab], .tab-item, .tab-btn, .msg-tab, button[onclick*="switchTab"]';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  const manifest = {};
  let total = 0;

  for (const rel of TAB_PAGES){
    const vp = viewportFor(rel);
    const base = rel.replace(/\//g,'__');
    try {
      await page.setViewport(vp);
      await page.goto('file:///' + HTML + rel, {waitUntil:'load', timeout:60000});
      await sleep(3500);
      const labels = await page.evaluate((sel) => {
        const els = [...document.querySelectorAll(sel)];
        const seen = new Set(); const out = [];
        for (const e of els){
          const t = (e.textContent||'').trim();
          if (!t) continue;
          if (seen.has(t)) continue;
          seen.add(t); out.push(t);
        }
        return out;
      }, TAB_SEL);
      if (labels.length < 2){ console.log('SKIP (tabs<2):', rel, labels); manifest[rel]=labels; continue; }
      manifest[rel] = labels;
      for (let i=0;i<labels.length;i++){
        await page.evaluate((sel,label) => {
          const els = [...document.querySelectorAll(sel)];
          const el = els.find(e => (e.textContent||'').trim() === label);
          if (el) el.click();
        }, TAB_SEL, labels[i]);
        await sleep(1500);
        const file = path.join(SHOT, base + '__tab' + (i+1) + '.png');
        await page.screenshot({path: file});
        total++;
        console.log('tab shot:', base + '__tab' + (i+1), '=>', labels[i]);
      }
    } catch (e){
      console.log('ERR', rel, e.message);
    }
  }

  // 生长大屏 KPI 弹窗
  try {
    await page.setViewport({width:1920,height:1080});
    await page.goto('file:///' + HTML + 'dataanlye/growth_dashboard.html', {waitUntil:'load', timeout:60000});
    await sleep(4000);
    manifest['__growth_dashboard_modal'] = DASHBOARD_MODALS;
    for (let i=0;i<DASHBOARD_MODALS.length;i++){
      await page.evaluate((t) => window.openModal(t), DASHBOARD_MODALS[i]);
      await sleep(1600);
      const file = path.join(SHOT, 'dataanlye__growth_dashboard__modal' + (i+1) + '.png');
      await page.screenshot({path: file});
      total++;
      console.log('modal shot:', 'dataanlye__growth_dashboard__modal' + (i+1), '=>', DASHBOARD_MODALS[i]);
      await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
      await sleep(300);
    }
  } catch (e){ console.log('ERR dashboard modal', e.message); }

  await browser.close();
  fs.writeFileSync(path.join(SHOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('DONE total new shots =', total);
})();
