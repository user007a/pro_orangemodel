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
                     'css/cockpit-theme.css', 'css/dashboard-design-system.css',
                     'css/decision-layer.css', 'js/decision-layer.js']) {
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

/* KPI 名称后面可能跟「推算」角标等内联标签，正则要放行，
 * 但不能因此放宽到跨标签匹配（否则会取到相邻卡片的数值）。 */
function kpiValue(src, label) {
  const re = new RegExp('<h4>' + label + '(?:\\s*<span\\b[^>]*>\\s*</span>)*\\s*</h4>\\s*<div class="kpi-number" data-value="([\\d.]+)"');
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
    log('  [FAIL] 发生面积分项之和 ' + (dArea + pArea) + ' ≠ 在园发生面积 ' + A.control.occurArea);
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
    ['在园发生面积', A.control.occurArea],
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

  /* 乡镇维度口径：排行上线后，任何一处改数字都会立刻暴露矛盾 */
  const towns = A.riskByTown;
  if (!Array.isArray(towns) || !towns.length) {
    log('  [FAIL] alertDataSource.riskByTown 缺失或为空');
    fail++;
  } else {
    const tArea = towns.reduce((a, r) => a + r.occurArea, 0);
    const tWarn = towns.reduce((a, r) => a + r.warningCount, 0);
    const tOrch = towns.reduce((a, r) => a + r.orchardArea, 0);
    if (tArea !== A.control.occurArea) {
      log('  [FAIL] 乡镇发生面积之和 ' + tArea + ' ≠ 在园发生面积 ' + A.control.occurArea);
      fail++;
    } else {
      log('  乡镇发生面积合计与 KPI 一致：' + tArea + ' 亩');
    }
    if (tWarn !== alertTotal) {
      log('  [FAIL] 乡镇预警数之和 ' + tWarn + ' ≠ 预警总数 ' + alertTotal);
      fail++;
    } else {
      log('  乡镇预警数合计与等级口径一致：' + tWarn + ' 条');
    }
    if (tOrch !== A.orchardAreaTotal) {
      log('  [FAIL] 乡镇果园面积之和 ' + tOrch + ' ≠ orchardAreaTotal ' + A.orchardAreaTotal);
      fail++;
    }
    const rt = A.riskTowns;
    if (rt.high + rt.mid + rt.low !== towns.length) {
      log('  [FAIL] 风险乡镇分档之和 ' + (rt.high + rt.mid + rt.low) + ' ≠ 乡镇数 ' + towns.length);
      fail++;
    }
    /* 发病率必须由果园面积与发生面积算出，不能再各写一套 */
    towns.forEach((r) => {
      const calc = (r.occurArea / r.orchardArea * 100).toFixed(1) + '%';
      if (calc !== r.incidence) {
        log('  [FAIL] ' + r.name + ' 发病率标注 ' + r.incidence + ' ≠ 由面积算出 ' + calc);
        fail++;
      }
    });
    /* 旧字段名 affectedArea 已废弃，残留会让人误以为它就是发生面积。
     * 注释里提到旧名是允许的，所以要按「去掉注释后」的正文来判断。 */
    if (/affectedArea/.test(stripComments(pestSrc))) {
      log('  [FAIL] 仍存在已废弃字段 affectedArea（应为 orchardArea / occurArea）');
      fail++;
    }
  }

  /* 趋势线末位必须等于 KPI 当前值，否则趋势与现状对不上 */
  const tr = A.trends;
  if (!tr) {
    log('  [FAIL] alertDataSource.trends 缺失');
    fail++;
  } else {
    const expect = {
      occurArea: A.control.occurArea,
      controlledArea: A.control.controlledArea,
      alertTotal: alertTotal,
      redAlert: lv.red,
    };
    for (const [k, v] of Object.entries(expect)) {
      if (!tr[k]) { log('  [FAIL] 缺少趋势序列 ' + k); fail++; continue; }
      const last = tr[k].values[tr[k].values.length - 1];
      if (last !== v) { log('  [FAIL] 趋势「' + k + '」末位 ' + last + ' ≠ 当前值 ' + v); fail++; }
    }
    log('  趋势线末位与 KPI 对齐：' + Object.keys(expect).length + ' 条序列已核对');
  }

  /* 待办清单：状态值必须合法，否则渲染出的标签会变空白 */
  const STATES = new Set(['overdue', 'doing', 'done']);
  (A.todos || []).forEach((t) => {
    if (!STATES.has(t.state)) { log('  [FAIL] 待办「' + t.title + '」状态非法：' + t.state); fail++; }
    if (!t.town || !t.owner || !t.due) { log('  [FAIL] 待办「' + t.title + '」缺少乡镇/责任人/时限'); fail++; }
  });
  if (A.todos && A.todos.length) log('  待办清单字段完整性：' + A.todos.length + ' 项已核对');

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

/* ============================================================
 * growth：KPI 与数据源一致性 + 弹窗数据完整性
 * 病虫害侧这套校验抓到过「字段被删、引用残留 → 弹窗全空」的事故，
 * 生长侧此前没有覆盖，这里补齐同样的三道防线。
 * ============================================================ */
log('\n===== 生长大屏数据口径 =====');
if (!gLit) {
  log('  [FAIL] 无法解析 growthDataSource，跳过');
  fail++;
} else {
  const G = lit(gLit);
  const gPairs = [
    ['评价监测园面积', G.kpis.monitorArea],
    ['优质果率预期', G.kpis.qualityRate],
    ['监测植株数量', G.kpis.plants],
    ['全县预计产量', G.kpis.yield],
    ['长势综合评分', G.kpis.score],
    ['长势达标果园占比', G.kpis.qualifiedRate],
    ['农事采纳率', G.kpis.adoptRate],
    ['病虫管理得分', G.kpis.pestScore],
  ];
  for (const [label, val] of gPairs) {
    const shown = kpiValue(growthSrc, label);
    if (shown === null) { log('  [FAIL] 未找到 KPI「' + label + '」'); fail++; }
    else if (parseFloat(shown) !== val) {
      log('  [FAIL] KPI「' + label + '」显示 ' + shown + '，数据源为 ' + val);
      fail++;
    }
  }
  log('  KPI 与数据源一致性：' + gPairs.length + ' 项已核对');

  const gtr = G.trends;
  if (!gtr) {
    log('  [FAIL] growthDataSource.trends 缺失');
    fail++;
  } else {
    const gExpect = { score: G.kpis.score, qualityRate: G.kpis.qualityRate, pestScore: G.kpis.pestScore };
    for (const [k, v] of Object.entries(gExpect)) {
      if (!gtr[k]) { log('  [FAIL] 缺少趋势序列 ' + k); fail++; continue; }
      const last = gtr[k].values[gtr[k].values.length - 1];
      if (last !== v) { log('  [FAIL] 趋势「' + k + '」末位 ' + last + ' ≠ 当前值 ' + v); fail++; }
    }
    log('  趋势线末位与 KPI 对齐：' + Object.keys(gExpect).length + ' 条序列已核对');
  }

  const GSTATES = new Set(['overdue', 'doing', 'done']);
  (G.todos || []).forEach((t) => {
    if (!GSTATES.has(t.state)) { log('  [FAIL] 待办「' + t.title + '」状态非法：' + t.state); fail++; }
    if (!t.town || !t.owner || !t.due) { log('  [FAIL] 待办「' + t.title + '」缺少乡镇/责任人/时限'); fail++; }
  });
  if (G.todos && G.todos.length) log('  农事待办字段完整性：' + G.todos.length + ' 项已核对');

  fail += checkModalCoverage(growthSrc);
  fail += checkGrowthModalRender(growthSrc, gLit, growthLit);
}

/* 生长侧弹窗同样在沙箱里真跑一遍。
 * 它的 details 里引用了 plantMapData（乡镇评分），所以上下文要一并注入。 */
function checkGrowthModalRender(rawSrc, dsLiteral, mapLiteral) {
  const statsAt = rawSrc.indexOf('function renderModalStats');
  const detailsAt = rawSrc.indexOf('function renderModalDetails');
  const endAt = rawSrc.indexOf('</script>', detailsAt);
  if (statsAt < 0 || detailsAt < 0 || endAt < 0) {
    log('  [FAIL] 未找到生长侧弹窗渲染函数定义');
    return 1;
  }
  let ctx;
  try {
    ctx = vm.createContext({
      growthDataSource: lit(dsLiteral),
      plantMapData: lit(mapLiteral),
    });
    vm.runInContext(rawSrc.slice(statsAt, endAt), ctx);
  } catch (e) {
    log('  [FAIL] 生长侧弹窗渲染函数加载失败：' + e.message);
    return 1;
  }
  const keys = [...new Set([...rawSrc.matchAll(/openModal\('([^']+)'\)/g)].map((x) => x[1]))];
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
  if (!bad) log('  生长侧弹窗渲染实测：' + keys.length + ' 个入口 × 2 个区块，全部有内容且无异常');
  return bad;
}

/* ============================================================
 * DOM 引用完整性
 * 删卡片时最容易漏掉「HTML 删了、JS 还在取」的 getElementById，
 * 浏览器里表现为 echarts.init(null) 或 textContent 赋值抛错，
 * 而且一旦抛在 IIFE 顶部，后面所有渲染都会中断 —— 静态语法检查完全看不出来。
 * ============================================================ */
log('\n===== DOM 引用完整性 =====');
for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const body = stripComments(src);
  const ids = new Set([...body.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  /* 只报「未做空值保护」的取用。
   * 形如 `var el = getElementById('x'); if (!el) return;` 的写法是安全的，
   * 属于改造后残留的死代码，提醒即可，不应阻断。 */
  const guarded = new Set();
  const varRe = /var\s+([A-Za-z_$][\w$]*)\s*=\s*document\.getElementById\(\s*'([^']+)'\s*\)/g;
  let vm2;
  while ((vm2 = varRe.exec(body))) {
    const v = vm2[1], id = vm2[2];
    const tail = body.slice(vm2.index, vm2.index + 1200);
    /* 只要是出现在某个 if 条件里（无论是 `if (!el)`、`if (el)` 还是 `if (!a || !b)`），
     * 都视为已做空值保护。 */
    if (new RegExp('if\\s*\\([^)]*\\b' + v + '\\b').test(tail)) {
      guarded.add(id);
    }
  }
  let bad = 0, warned = 0;
  for (const id of [...new Set([...body.matchAll(/getElementById\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]))]) {
    if (ids.has(id)) { continue; }
    if (guarded.has(id)) {
      log('  [WARN] ' + f + ' 引用了已移除的 id: ' + id + '（已有空值保护，属死代码）');
      warned++;
    } else {
      log('  [FAIL] ' + f + ' 无保护地取用了不存在的 id: ' + id);
      bad++;
    }
  }
  if (warned) { log('    → 以上 ' + warned + ' 处建议清理；当前不会抛错，但会误导后续维护'); }
  /* data-spark 引用键必须存在于 trends，否则趋势线会静默不渲染 */
  const sparkKeys = [...new Set([...body.matchAll(/data-spark="([^"]+)"/g)].map((m) => m[1]))];
  const trendsKeys = [...new Set([...body.matchAll(/^\s{12}(\w+):\s*\{\s*values:/gm)].map((m) => m[1]))];
  for (const k of sparkKeys) {
    if (!trendsKeys.includes(k)) { log('  [FAIL] ' + f + ' data-spark="' + k + '" 在 trends 中没有对应序列'); bad++; }
  }
  if (!bad) {
    const all = [...new Set([...body.matchAll(/getElementById\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]))];
    log('  ' + f + '：' + all.length + ' 个 getElementById 目标均存在或已做空值保护' +
        (sparkKeys.length ? '，' + sparkKeys.length + ' 条趋势线键均已定义' : ''));
  }
  fail += bad;
}

/* ============================================================
 * 运行时冒烟测试：在极简 DOM 沙箱里把内联脚本真跑一遍
 *
 * 为什么必须有这一层：语法检查、引用检查、口径检查都是静态的，
 * 拦不住「变量提升导致的 undefined」——它在脚本中间抛 TypeError，
 * 之后所有渲染代码（地图 / KPI / 待办 / 排行 / 趋势线）静默不执行，
 * 页面表现就是「整屏数据消失」而控制台之外毫无征兆。
 * 这是唯一能在提交前抓到这类故障的检查。
 * ============================================================ */
function mockEl(id) {
  const e = {
    id: id || '', className: '', children: [], _html: '', _text: '', style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    get innerHTML() { return this._html; }, set innerHTML(v) { this._html = String(v); },
    get textContent() { return this._text; }, set textContent(v) { this._text = String(v); },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    appendChild(c) { this.children.push(c); return c; },
    insertBefore(c) { this.children.push(c); return c; },
    addEventListener() {}, removeEventListener() {}, dispatchAction() {},
    querySelector() { return mockEl(''); }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, bottom: 0, right: 0, width: 0, height: 0 }; },
    focus() {}, click() {}, closest() { return null; }, remove() {},
    parentNode: null, offsetWidth: 100, offsetHeight: 100,
  };
  return e;
}

function runtimeSmoke(f) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const blocks = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(src))) {
    blocks.push({ code: m[1], at: src.slice(0, m.index).split('\n').length });
  }
  const ext = [...src.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map((x) => x[1]);

  const reg = new Map();
  const pick = (id) => { if (!reg.has(id)) reg.set(id, mockEl(id)); return reg.get(id); };

  /* 统计 HTML 里每个 data-spark 键有几个承接容器，供 querySelectorAll 返回对应数量的节点，
   * 这样执行完就能断言「趋势线真的画出来了」，而不只是「没报错」。 */
  const sparkCounts = new Map();
  for (const mm of src.matchAll(/data-spark="([^"]+)"/g)) {
    sparkCounts.set(mm[1], (sparkCounts.get(mm[1]) || 0) + 1);
  }
  const sparkNodes = new Map();

  const doc = {
    documentElement: mockEl('html'), body: mockEl('body'), head: mockEl('head'),
    /* 策略：假定元素都存在（缺失由「DOM 引用完整性」检查负责），
     * 这里只关心「会不会抛错」。 */
    getElementById: pick,
    querySelector: () => mockEl(''),
    querySelectorAll(sel) {
      const m2 = /^\[data-spark="([^"]+)"\]$/.exec(String(sel || ''));
      if (m2) {
        const key = m2[1];
        if (!sparkNodes.has(key)) {
          sparkNodes.set(key, Array.from({ length: sparkCounts.get(key) || 0 }, () => mockEl('')));
        }
        return sparkNodes.get(key);
      }
      return [];
    },
    createElement: () => mockEl(''),
    addEventListener() {}, removeEventListener() {},
    getElementsByClassName: () => [],
  };
  const win = {
    document: doc, navigator: { userAgent: 'node' },
    location: { href: 'file:///' + f, search: '' },
    innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {},
    requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
    setTimeout() { return 0; }, clearTimeout() {}, setInterval() { return 0; }, clearInterval() {},
    matchMedia() { return { matches: false, addListener() {}, addEventListener() {} }; },
    getComputedStyle() { return { getPropertyValue: () => '' }; },
    console: { log() {}, warn() {}, info() {}, error() {} },
    Intl,
  };
  win.window = win; win.self = win; win.global = win; win.top = win;
  win.echarts = {
    init: () => ({
      setOption() {}, resize() {}, on() {}, off() {}, dispatchAction() {},
      clear() {}, dispose() {}, getZr() { return { on() {}, off() {} }; }, getDataURL() { return ''; },
    }),
    registerMap() {}, graphic: { LinearGradient: function () {} }, getInstanceByDom: () => null,
  };
  const ctx = vm.createContext(win);

  let bad = 0;
  for (const rel of ext) {
    if (/^(https?:)?\/\//.test(rel)) { continue; }
    const p = path.join(dir, rel);
    if (!fs.existsSync(p)) { log('  [FAIL] ' + f + ' 引用了不存在的脚本: ' + rel); bad++; continue; }
    try {
      vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: rel });
    } catch (e) {
      log('  [FAIL] ' + f + ' 外链脚本 ' + rel + ' 运行时异常: ' + e.message);
      bad++;
    }
  }
  blocks.forEach((b, i) => {
    try {
      vm.runInContext(b.code, ctx, { filename: f + '#inline' + (i + 1) });
    } catch (e) {
      const where = String(e.stack || '').split('\n').slice(1, 3).join(' | ').trim();
      log('  [FAIL] ' + f + ' 内联块 ' + (i + 1) + '（HTML 第 ' + b.at + ' 行起）运行时抛错：' +
          e.name + ': ' + e.message);
      if (where) { log('    ↳ ' + where.replace(/^at\s+/, '')); }
      bad++;
    }
  });
  /* ---- 渲染结果断言：不报错 ≠ 渲染出来了 ---- */
  const rendered = [];
  for (const [key, nodes] of sparkNodes) {
    if (!nodes.length) { continue; }
    const ok = nodes.every((n) => n.innerHTML.includes('<svg'));
    if (!ok) {
      log('  [FAIL] ' + f + ' 趋势线容器 data-spark="' + key + '" 执行后未渲染出图形');
      bad++;
    } else {
      rendered.push(key);
    }
  }
  for (const id of ['todoList', 'townRank', 'disasterList']) {
    if (!new RegExp('id="' + id + '"').test(src)) { continue; }
    const el = reg.get(id);
    if (!el || !el.innerHTML.trim()) {
      log('  [FAIL] ' + f + ' 区块 #' + id + ' 执行后仍为空（渲染被中断？）');
      bad++;
    } else {
      rendered.push('#' + id);
    }
  }
  if (!bad) {
    log('  ' + f + '：' + blocks.length + ' 段内联脚本在沙箱中全部执行完成，无运行时异常；' +
        '已渲染 ' + rendered.length + ' 处：' + rendered.join('、'));
  }
  return bad;
}

log('\n===== 运行时冒烟（沙箱实跑内联脚本） =====');
for (const f of files) { fail += runtimeSmoke(f); }

log('\n结果: ' + (fail ? fail + ' 项未通过' : '全部通过'));
console.log(OUT.join('\n'));
process.exitCode = fail ? 1 : 0;
