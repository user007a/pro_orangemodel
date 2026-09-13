import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = ['growth_dashboard.html', 'pest_dashboard.html'];
const OUT = [];
const log = (s) => OUT.push(s);

const BAD = [
  ['头陂镇', '旧乡镇名（应为紫霄镇）'],
  ['#166534', '浅色主题遗留深绿'],
  ['#16a34a', '浅色主题遗留绿'],
  ['#15803d', '浅色主题遗留绿'],
  ['#1e293b', '浅色主题深灰字'],
  ['#334155', '浅色主题深灰字'],
  ['#475569', '浅色主题灰字'],
  ['#e2e8f0', '浅色主题描边'],
  ['#f8fafc', '浅色主题底'],
  ['#ffffff', '纯白底'],
  ['DIN Alternate', '未收敛的数字字体'],
];

const DECL_PROP = /^-{0,2}[a-zA-Z_][\w-]*$/;

function lintCss(src) {
  let bad = 0;
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m, k = 0;
  while ((m = re.exec(src))) {
    k++;
    const css = m[1].replace(/\/\*[\s\S]*?\*\//g, '');
    const b = (css.match(/\{/g) || []).length - (css.match(/\}/g) || []).length;
    if (b !== 0) { log('  [FAIL] style#' + k + ' 花括号不平衡 (' + b + ')'); bad++; }
    const p = (css.match(/\(/g) || []).length - (css.match(/\)/g) || []).length;
    if (p !== 0) { log('  [FAIL] style#' + k + ' 圆括号不平衡 (' + p + ')'); bad++; }

    // 只检查 { } 内部的声明
    let bm;
    const bre = /\{([^{}]*)\}/g;
    while ((bm = bre.exec(css))) {
      for (const decl of bm[1].split(';')) {
        const d = decl.trim();
        if (!d) continue;
        const i = d.indexOf(':');
        if (i < 0) continue;                    // 嵌套或残缺，跳过
        const prop = d.slice(0, i).trim();
        if (!DECL_PROP.test(prop)) {
          log('  [FAIL] 非法 CSS 属性: "' + prop.slice(0, 50) + '"');
          bad++;
        }
      }
    }
    if (/rgba\([^)]*\)-[a-z]/.test(css)) { log('  [FAIL] 存在被破坏的属性名 rgba(...)-x'); bad++; }
  }
  return bad;
}

let fail = 0;
for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  log('\n===== ' + f + ' =====');
  fail += lintCss(src);

  for (const [needle, why] of BAD) {
    const n = src.split(needle).length - 1;
    if (n) { log('  [FAIL] ' + why + ' "' + needle + '" x' + n); fail++; }
  }

  let i = 0;
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(src))) {
    i++;
    try { new vm.Script(m[1]); }
    catch (e) { log('  [FAIL] script#' + i + ' 语法错误: ' + e.message); fail++; }
  }
  log('  内联 script: ' + i + ' 块，语法 OK');

  for (const dep of ['css/fonts.css', 'data/nanfeng-map.js', 'js/nf-map.js',
                     'css/cockpit-theme.css', 'css/dashboard-design-system.css']) {
    if (!fs.existsSync(path.join(dir, dep))) { log('  [FAIL] 缺少 ' + dep); fail++; }
    else if (src.indexOf(dep) < 0) { log('  [WARN] 未引用 ' + dep); }
  }
  if (!/NFMap\.register\(\)/.test(src)) { log('  [FAIL] 未调用 NFMap.register()'); fail++; }
  if (!/NFMap\.option\(/.test(src)) { log('  [FAIL] 未调用 NFMap.option()'); fail++; }
}

// 字体资源
log('\n===== 字体资源 =====');
for (const f of fs.readdirSync(path.join(dir, 'fonts'))) {
  log('  ' + f + '  ' + fs.statSync(path.join(dir, 'fonts', f)).size);
}

// 地图数据
const geo = fs.readFileSync(path.join(dir, 'data/nanfeng-map.js'), 'utf8');
const gj = JSON.parse(geo.slice(geo.indexOf('{'), geo.lastIndexOf('}') + 1));
log('\n===== 地图数据 =====');
log('  区域数: ' + gj.features.length);
log('  ' + gj.features.map((x) => x.properties.name).join('、'));
for (const k of ['紫霄镇', '傅坊乡', '琴城镇', '白舍镇']) {
  if (!gj.features.some((x) => x.properties.name === k)) { log('  [FAIL] 缺少 ' + k); fail++; }
}

/* ============================================================
 * 数据口径一致性
 * 目的：KPI 与数据源曾经各写一套数字，导致同一指标在多处对不上。
 * 现在把「数据源 → KPI」的一致性做成硬校验，防止再次漂移。
 * ============================================================ */

function extractLiteral(src, varName) {
  const key = 'var ' + varName + ' = ';
  const at = src.indexOf(key);
  if (at < 0) return null;
  const b1 = src.indexOf('{', at + key.length - 1);
  const b2 = src.indexOf('[', at + key.length - 1);
  let from, open, close;
  if (b2 >= 0 && (b1 < 0 || b2 < b1)) { from = b2; open = '['; close = ']'; }
  else { from = b1; open = '{'; close = '}'; }
  if (from < 0) return null;
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return src.slice(from, i + 1); }
  }
  return null;
}

const lit = (t) => vm.runInNewContext('(' + t + ')', {});

function kpiValue(src, label) {
  const re = new RegExp('<h4>' + label + '</h4>\\s*<div class="kpi-number" data-value="([\\d.]+)"');
  const m = src.match(re);
  return m ? m[1] : null;
}

/* ============================================================
 * 弹窗数据完整性 + 数据源引用完整性
 * 背景（真实事故）：alertDataSource.types 在 P0 口径改造中被删除，但
 * renderModalStats 内还残留 5 处 alertDataSource.types.* 引用。
 * JS 语法检查抓不到（引用语法合法），后果是：该 stats 字面量在求值时抛 TypeError，
 * renderModalStats 中断，openModal 里紧随其后的 renderModalDetails 也不再执行 ——
 * 8 个 KPI 弹窗的「核心指标 / 详情数据」全空，而 ECharts 图表照常渲染，极易漏测。
 * 对策：引用键必须 ⊆ 定义键；每个 openModal 入口必须在 stats / details 两处都有配置。
 * ============================================================ */

const BUILTIN_MEMBERS = new Set([
  'length', 'map', 'filter', 'forEach', 'reduce', 'slice', 'sort', 'concat', 'join',
  'push', 'pop', 'shift', 'unshift', 'indexOf', 'lastIndexOf', 'includes', 'find',
  'findIndex', 'some', 'every', 'keys', 'values', 'entries', 'toLocaleString',
  'toString', 'at', 'flat', 'flatMap', 'reverse', 'splice', 'fill', 'hasOwnProperty',
  'replace', 'split', 'trim', 'toFixed', 'prototype', 'call', 'apply', 'bind',
]);

/* 字符串感知地去注释：长度与换行严格保持不变，因此报出的行号仍准确。
 * 否则「注释里提到某字段」会被误判成真实引用。 */
function stripComments(src) {
  let out = '', i = 0;
  const n = src.length;
  let state = 0; // 0=code 1=行注释 2=块注释 3='..' 4=".." 5=`..`
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (state === 0) {
      if (c === '/' && d === '/') { state = 1; out += '  '; i += 2; continue; }
      if (c === '/' && d === '*') { state = 2; out += '  '; i += 2; continue; }
      if (c === "'") state = 3;
      else if (c === '"') state = 4;
      else if (c === '`') state = 5;
      out += c; i++; continue;
    }
    if (state === 1) { out += (c === '\n' ? c : ' '); if (c === '\n') state = 0; i++; continue; }
    if (state === 2) {
      if (c === '*' && d === '/') { state = 0; out += '  '; i += 2; continue; }
      out += (c === '\n' ? c : ' '); i++; continue;
    }
    if (c === '\\') { out += c + (d || ''); i += 2; continue; }
    if ((state === 3 && c === "'") || (state === 4 && c === '"') || (state === 5 && c === '`')) state = 0;
    out += c; i++;
  }
  return out;
}

function auditDataRefs(rawSrc, varName, definedKeys) {
  const src = stripComments(rawSrc);
  const re = new RegExp(varName + '\\.([A-Za-z_$][\\w$]*)', 'g');
  const hits = new Set();
  let m, bad = 0;
  while ((m = re.exec(src))) {
    const k = m[1];
    if (BUILTIN_MEMBERS.has(k) || definedKeys.has(k)) continue;
    const line = src.slice(0, m.index).split('\n').length;
    if (hits.has(k + '@' + line)) continue;
    hits.add(k + '@' + line);
    log('  [FAIL] ' + varName + '.' + k + ' 引用了不存在的数据字段（第 ' + line + ' 行）');
    bad++;
  }
  return bad;
}

function checkModalCoverage(rawSrc) {
  const src = stripComments(rawSrc);
  const statsAt = src.indexOf('function renderModalStats');
  const detailsAt = src.indexOf('function renderModalDetails');
  if (statsAt < 0 || detailsAt < 0) {
    log('  [FAIL] 未找到 renderModalStats / renderModalDetails');
    return 1;
  }
  const statsSeg = src.slice(statsAt, detailsAt);
  const detailsSeg = src.slice(detailsAt);
  const uniq = [...new Set([...src.matchAll(/openModal\('([^']+)'\)/g)].map((x) => x[1]))];
  let bad = 0;
  for (const k of uniq) {
    const inStats = statsSeg.includes("'" + k + "':");
    const inDetails = detailsSeg.includes("'" + k + "':");
    if (!inStats || !inDetails) {
      const miss = [!inStats && '核心指标', !inDetails && '详情数据'].filter(Boolean).join(' + ');
      log('  [FAIL] 弹窗「' + k + '」在 renderModalStats/renderModalDetails 中缺少：' + miss);
      bad++;
    }
  }
  if (!bad) log('  弹窗数据完整性：' + uniq.length + ' 个 openModal 入口均有核心指标与详情数据');
  return bad;
}

/* 在沙箱里真跑一遍弹窗渲染函数：语法检查看不出的「字段缺失 → TypeError → 弹窗空白」
 * 这类运行时事故，只有实际执行才会暴露。用真实数据源喂进去，逐个 openModal 入口执行。 */
function checkModalRender(rawSrc, dataLiteral) {
  const src = rawSrc;
  const detailsAt = src.indexOf('function renderModalDetails');
  const statsAt = src.indexOf('function renderModalStats');
  const endAt = src.indexOf('</script>', detailsAt);
  if (statsAt < 0 || detailsAt < 0 || endAt < 0) {
    log('  [FAIL] 未找到弹窗渲染函数定义');
    return 1;
  }
  let ctx;
  try {
    ctx = vm.createContext({ alertDataSource: lit(dataLiteral) });
    vm.runInContext(src.slice(statsAt, endAt), ctx);
  } catch (e) {
    log('  [FAIL] 弹窗渲染函数加载失败：' + e.message);
    return 1;
  }
  const keys = [...new Set([...src.matchAll(/openModal\('([^']+)'\)/g)].map((x) => x[1]))];
  let bad = 0;
  for (const k of keys) {
    for (const [cn, fn] of [['核心指标', 'renderModalStats'], ['详情数据', 'renderModalDetails']]) {
      const box = { innerHTML: '' };
      try {
        ctx[fn](k, box);
        if (!box.innerHTML) { log('  [FAIL] 弹窗「' + k + '」' + cn + '渲染结果为空'); bad++; }
      } catch (e) {
        log('  [FAIL] 弹窗「' + k + '」' + cn + '渲染抛错：' + e.message);
        bad++;
      }
    }
  }
  if (!bad) log('  弹窗渲染实测：' + keys.length + ' 个入口 × 2 个区块，全部有内容且无异常');
  return bad;
}

log('\n===== 数据口径一致性 =====');

const pestSrc = fs.readFileSync(path.join(dir, 'pest_dashboard.html'), 'utf8');
const pestLit = extractLiteral(pestSrc, 'alertDataSource');
if (!pestLit) {
  log('  [FAIL] 未找到 alertDataSource');
  fail++;
} else {
  const A = lit(pestLit);
  const lv = A.levels;

  const sum = { red: 0, orange: 0, yellow: 0, blue: 0 };
  A.alertByType.forEach((r) => {
    sum.red += r.red; sum.orange += r.orange; sum.yellow += r.yellow; sum.blue += r.blue;
  });
  let colsOk = true;
  for (const k of ['red', 'orange', 'yellow', 'blue']) {
    if (sum[k] !== lv[k]) {
      log('  [FAIL] 预警等级 ' + k + '：按类型分解合计 ' + sum[k] + ' ≠ 等级口径 ' + lv[k]);
      fail++; colsOk = false;
    }
  }
  const alertTotal = lv.red + lv.orange + lv.yellow + lv.blue;
  if (colsOk) log('  预警分解矩阵与等级口径一致，合计 ' + alertTotal + ' 条');

  const weatherCount = A.alertByType.filter((r) => r.group === 'weather').length;
  if (weatherCount !== A.weatherDisasterKinds) {
    log('  [FAIL] 气象灾害类型数 ' + A.weatherDisasterKinds + ' ≠ 矩阵中实际 ' + weatherCount + ' 种');
    fail++;
  }

  const dArea = A.occurByKind.disease.reduce((a, r) => a + r.area, 0);
  const pArea = A.occurByKind.pest.reduce((a, r) => a + r.area, 0);
  if (dArea + pArea !== A.control.occurArea) {
    log('  [FAIL] 发生面积分项之和 ' + (dArea + pArea) + ' ≠ 在田发生面积 ' + A.control.occurArea);
    fail++;
  } else {
    log('  发生面积分解与 KPI 一致：' + dArea + ' + ' + pArea + ' = ' + A.control.occurArea + ' 亩');
  }
  if (A.occurByKind.disease.length !== A.activeKinds.disease
      || A.occurByKind.pest.length !== A.activeKinds.pest) {
    log('  [FAIL] 活跃种类数与发生面积分解条目数不一致');
    fail++;
  }

  const kpiPairs = [
    ['在田发生面积', A.control.occurArea],
    ['活跃病害', A.activeKinds.disease],
    ['活跃虫害', A.activeKinds.pest],
    ['预警总数', alertTotal],
    ['红色预警', lv.red],
    ['预警处置完成率', A.disposeRate],
    ['已防治面积', A.control.controlledArea],
    ['挽回损失', A.control.savedLoss],
  ];
  for (const [label, val] of kpiPairs) {
    const shown = kpiValue(pestSrc, label);
    if (shown === null) { log('  [FAIL] 未找到 KPI「' + label + '」'); fail++; }
    else if (parseFloat(shown) !== val) {
      log('  [FAIL] KPI「' + label + '」显示 ' + shown + '，数据源为 ' + val);
      fail++;
    }
  }
  log('  KPI 与数据源一致性：' + kpiPairs.length + ' 项已核对');

  fail += checkModalCoverage(pestSrc);
  fail += auditDataRefs(pestSrc, 'alertDataSource', new Set(Object.keys(A)));
  fail += checkModalRender(pestSrc, pestLit);
}

const growthSrc = fs.readFileSync(path.join(dir, 'growth_dashboard.html'), 'utf8');
const growthLit = extractLiteral(growthSrc, 'plantMapData');
if (!growthLit) {
  log('  [FAIL] 未找到 plantMapData');
  fail++;
} else {
  const rows = lit(growthLit);
  const totalSamples = rows.reduce((a, r) => a + (r.samples || 0), 0);
  const kpiPlants = kpiValue(growthSrc, '监测植株数量');
  if (String(totalSamples) !== String(kpiPlants)) {
    log('  [FAIL] 各乡镇样本量合计 ' + totalSamples + ' ≠ KPI 监测植株数量 ' + kpiPlants);
    fail++;
  } else {
    log('  样本量合计与 KPI 一致：' + totalSamples + ' 株');
  }
  rows.forEach((r) => {
    if (!r.samples && typeof r.score === 'number') {
      log('  [FAIL] ' + r.name + ' 无监测点却带评分 ' + r.score);
      fail++;
    }
  });
}

/* growth 数据源引用完整性（同样防止「字段被删、引用残留」） */
const gLit = extractLiteral(growthSrc, 'growthDataSource');
if (!gLit) {
  log('  [FAIL] 未找到 growthDataSource');
  fail++;
} else {
  try {
    const G = lit(gLit);
    fail += auditDataRefs(growthSrc, 'growthDataSource', new Set(Object.keys(G)));
  } catch (e) {
    log('  [WARN] growthDataSource 无法静态求值，跳过引用校验：' + e.message);
  }
}

log('\n结果: ' + (fail ? fail + ' 项未通过' : '全部通过'));
console.log(OUT.join('\n'));
process.exitCode = fail ? 1 : 0;
