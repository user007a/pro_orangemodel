/* ============================================================
 * 决策层增强脚本 (Decision Layer)
 * 生长模型大屏 与 病虫害大屏 共用
 *
 * 职责（全部是纯渲染，不引入新的业务数据）：
 *   DL.sparkline()      迷你趋势线（A2）
 *   DL.todo()           待办 / 派工清单（A1）
 *   DL.rank()           乡镇排行 + 地图联动（A3）
 *   DL.bubbleSeries()   地图气泡层（B3）
 *   DL.highlightRegion()地图区块高亮（A3）
 *   DL.bindEstTips()    推算值悬浮说明（A4）
 *   DL.stampUpdate()    数据更新时间（B6）
 *
 * 不依赖 ECharts —— 只有 bubbleSeries / highlightRegion 需要传入已初始化的图表实例。
 * ============================================================ */
(function (global) {
    'use strict';

    var COLOR_UP = '#33D69F';     /* 向好 */
    var COLOR_DOWN = '#ff6b6b';   /* 需关注 */
    var COLOR_LINE = '#5AD7F0';
    var COLOR_AXIS = 'rgba(148,163,184,0.28)';

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* ------------------------------------------------------------
     * A2 迷你趋势线
     * values: 数值数组；opts: { color, unit, label }
     * 用纯 SVG 绘制，不占用 ECharts 实例，成本极低。
     * ------------------------------------------------------------ */
    function sparkline(el, values, opts) {
        if (!el || !values || values.length < 2) { return; }
        opts = opts || {};
        var W = 100, H = 30, PAD = 2;
        var min = Math.min.apply(null, values);
        var max = Math.max.apply(null, values);
        var span = (max - min) || 1;
        var n = values.length;

        var pts = values.map(function (v, i) {
            var x = PAD + (W - PAD * 2) * (i / (n - 1));
            var y = H - PAD - (H - PAD * 2) * ((v - min) / span);
            return [x, y];
        });

        var line = pts.map(function (p, i) {
            return (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2);
        }).join(' ');
        var area = line + ' L' + pts[n - 1][0].toFixed(2) + ' ' + H + ' L' + pts[0][0].toFixed(2) + ' ' + H + ' Z';

        var rising = values[n - 1] >= values[0];
        var color = opts.color || (rising ? COLOR_UP : COLOR_DOWN);
        var gid = 'spk' + Math.random().toString(36).slice(2, 8);

        el.innerHTML =
            '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img">' +
              '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.34"/>' +
                '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>' +
              '</linearGradient></defs>' +
              '<path d="' + area + '" fill="url(#' + gid + ')"/>' +
              '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="1.6" ' +
                    'stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
              '<circle cx="' + pts[n - 1][0].toFixed(2) + '" cy="' + pts[n - 1][1].toFixed(2) + '" r="2.2" ' +
                    'fill="' + color + '" stroke="#050d1a" stroke-width="1" vector-effect="non-scaling-stroke"/>' +
            '</svg>';

        var first = values[0], last = values[n - 1];
        var delta = last - first;
        var pct = first ? (delta / Math.abs(first) * 100) : 0;
        /* 紧凑布局：趋势线与同比标签同行，说明文字收进悬浮 title，不再占独立一行 */
        el.title = (opts.label || '近30天') + '走势：' +
            (delta >= 0 ? '↑' : '↓') + Math.abs(pct).toFixed(1) + '%';
    }

    /* 批量渲染：页面里所有 [data-spark] 容器 */
    function renderSparklines(map) {
        Object.keys(map || {}).forEach(function (key) {
            var nodes = document.querySelectorAll('[data-spark="' + key + '"]');
            for (var i = 0; i < nodes.length; i++) { sparkline(nodes[i], map[key].values, map[key]); }
        });
    }

    /* ------------------------------------------------------------
     * A1 待办 / 派工清单
     * items: [{ title, town, owner, due, state }]
     *   state: 'overdue' | 'doing' | 'done'
     * 逾期项自动置顶。
     * ------------------------------------------------------------ */
    var STATE_TEXT = { pending: '待派发', overdue: '逾期', doing: '执行中', reviewing: '待复查', done: '已完成' };
    var STATE_ORDER = { overdue: 0, pending: 1, doing: 2, reviewing: 3, done: 4 };
    /* 流转顺序（'overdue' 视为 'doing' 的逾期态，不单独占线性序位） */
    var FLOW = ['pending', 'doing', 'reviewing', 'done'];
    function statePos(s) { return (s === 'overdue' || s === 'doing') ? 2 : (FLOW.indexOf(s) < 0 ? 2 : FLOW.indexOf(s) + 1); }
    /* 相对今天的逾期天数：due 形如 'MM-DD'；>0 逾期，0 今日到期，<0 还剩天数，null 无日期 */
    function dueDays(dueStr, now) {
        if (!dueStr) return null;
        var p = String(dueStr).split('-');
        if (p.length < 2) return null;
        var m = parseInt(p[0], 10), d = parseInt(p[1], 10);
        if (isNaN(m) || isNaN(d)) return null;
        var due = new Date(now.getFullYear(), m - 1, d);
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return Math.round((today - due) / 86400000);
    }

    function todo(container, items, opts) {
        if (!container) { return; }
        opts = opts || {};
        var now = new Date();
        var list = (items || []).slice().sort(function (a, b) {
            return (STATE_ORDER[a.state] - STATE_ORDER[b.state]) ||
                   String(a.due || '').localeCompare(String(b.due || ''));
        });
        var overdue = list.filter(function (r) {
            return r.state === 'overdue' || (r.due && dueDays(r.due, now) > 0 && r.state !== 'done');
        }).length;

        var html = '<div class="dl-todo-head">' +
            '<span class="dl-todo-count">重点待办 <b>' + list.length + '</b> 项，其中逾期 <b>' + overdue + '</b> 项</span>' +
            '<span class="dl-todo-count">' + esc(opts.scope || '') + '</span></div>' +
            '<div class="dl-todo-list">';

        list.forEach(function (r) {
            var days = dueDays(r.due, now);
            var dueTxt = esc(r.due || '');
            if (days !== null) {
                if (days > 0) { dueTxt += ' <span class="dl-overdue">逾期' + days + '天</span>'; }
                else if (days === 0) { dueTxt += ' <span class="dl-overdue">今日到期</span>'; }
                else if (r.state !== 'done') { dueTxt += ' <span class="dl-todo-left">剩' + (-days) + '天</span>'; }
            }
            var pos = statePos(r.state);
            var flow = '';
            for (var i = 1; i <= 4; i++) { flow += '<i class="' + (i <= pos ? 'on' : '') + '"></i>'; }
            /* 阶段一扩展（#4 强化督办）：
             *  - urgent: 自动从 due+state 派生（逾期/今日到期），也可显式 true
             *  - supervised: 已督办次数；>0 显示「已督办 X 次」
             *  - village/gridman: 责任村组 + 网格员（数据缺时显示 —）
             *  - id: 存在时加【一键督办】按钮；非工作时间 22:00–08:00 暂存至次日 08:00 发送 */
            var autoUrgent = (r.state === 'overdue' || (days !== null && days >= 0 && r.state !== 'done'));
            var isUrgent = r.urgent === true || (r.urgent !== false && autoUrgent);
            var supervised = r.supervised || 0;
            var villageLine = '';
            if (r.village || r.gridman) {
                villageLine = '<span class="dl-todo-village">村组：' + esc(r.village || '—') +
                              ' · 网格员：' + esc(r.gridman || '—') + '</span>';
            }
            var superviseBtn = (r.id && r.state !== 'done')
                ? ' <button class="dl-supervise-btn" data-id="' + esc(r.id) +
                  '" onclick="onSupervise(\'' + esc(r.id) + '\')">' +
                  '<span class="dl-supervise-text">督办</span>' +
                  '</button>' : '';
            var supervisedTag = (r.id && supervised > 0)
                ? '<span class="dl-supervised-count">已督办 ' + supervised + ' 次</span>'
                : '';
            html += '<div class="dl-todo-item ' + esc(r.state) + (isUrgent ? ' urgent' : '') + '">' +
                '<div class="dl-todo-main">' +
                    '<div class="dl-todo-title" title="' + esc(r.title) + '">' + esc(r.title) + '</div>' +
                    '<div class="dl-todo-meta">' +
                        '<span>' + esc(r.town) + '</span><span>' + esc(r.owner) + '</span>' +
                    '</div>' +
                    villageLine +
                '</div>' +
                '<div class="dl-todo-right">' +
                    '<div class="dl-todo-due">' + dueTxt + '</div>' +
                    '<div class="dl-todo-pill-row">' +
                        '<span class="dl-pill s-' + esc(r.state) + '">' + (STATE_TEXT[r.state] || r.state) + '</span>' +
                        superviseBtn +
                        supervisedTag +
                        '<span class="dl-todo-flow" title="流转：待派发 → 执行中 → 待复查 → 已完成">' + flow + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>';
        });
        html += '</div>';
        if (opts.note) { html += '<div class="dl-foot-note">' + esc(opts.note) + '</div>'; }
        container.innerHTML = html;
    }

    /* ------------------------------------------------------------
     * A3 乡镇排行 + 地图联动
     * rows: [{ name, value, display, nodata }]，按 value 降序
     * onHover(name|null) 用于联动高亮地图区块
     * ------------------------------------------------------------ */
    function rank(container, rows, opts) {
        if (!container) { return; }
        opts = opts || {};
        var list = (rows || []).slice().sort(function (a, b) {
            if (a.nodata !== b.nodata) { return a.nodata ? 1 : -1; }
            return (b.value || 0) - (a.value || 0);
        });
        var max = list.reduce(function (m, r) { return Math.max(m, r.value || 0); }, 0) || 1;

        /* 大屏可见性取舍：排行区高度有限，滚动等于看不见。
         * 传 headN + tailN 时只渲染「前 N + 折叠行 + 后 M」，
         * 保证「最好的」和「最差的」同时可见，中间段交给地图。
         * 不传则保持全量渲染（pest 屏行为不变）。 */
        var seq = list.map(function (r, i) { return { row: r, rank: i + 1 }; });
        var hN = opts.headN || 0, tN = opts.tailN || 0;
        if (hN > 0 && tN > 0 && list.length > hN + tN) {
            var mid = list.slice(hN, list.length - tN);
            seq = seq.slice(0, hN).concat([{
                gap: true,
                hiddenCount: mid.length,
                hiddenNames: mid.map(function (r) { return r.name; }).join('、')
            }]).concat(seq.slice(list.length - tN));
        }

        var html = '<div class="dl-rank-list">';
        seq.forEach(function (item) {
            if (item.gap) {
                html += '<div class="dl-rank-gap" title="' +
                    esc('已折叠 ' + item.hiddenCount + ' 个：' + item.hiddenNames) + '">' +
                    '···&nbsp;中间 ' + item.hiddenCount + ' 个乡镇（图上看）</div>';
                return;
            }
            var r = item.row;
            var top = item.rank <= 3 && !r.nodata ? ' top' + item.rank : '';
            var w = r.nodata ? 0 : Math.max(4, (r.value / max) * 100);
            html += '<div class="dl-rank-row' + top + (r.nodata ? ' nodata' : '') + '" data-town="' + esc(r.name) + '">' +
                '<span class="dl-rank-no">' + (r.nodata ? '–' : item.rank) + '</span>' +
                '<span class="dl-rank-name">' + esc(r.name) + '</span>' +
                '<span class="dl-rank-bar-wrap"><span class="dl-rank-bar" style="width:' + w.toFixed(1) + '%;"></span></span>' +
                '<span class="dl-rank-val">' + (r.nodata ? '无监测点' : r.display) + '</span>' +
            '</div>';
        });
        html += '</div>';
        if (opts.note) { html += '<div class="dl-foot-note">' + esc(opts.note) + '</div>'; }
        container.innerHTML = html;

        var rowsEl = container.querySelectorAll('.dl-rank-row');
        var fire = function (name) {
            for (var i = 0; i < rowsEl.length; i++) {
                rowsEl[i].classList.toggle('active', rowsEl[i].getAttribute('data-town') === name);
            }
            if (typeof opts.onHover === 'function') { opts.onHover(name); }
        };
        for (var i = 0; i < rowsEl.length; i++) {
            (function (node) {
                var nm = node.getAttribute('data-town');
                node.addEventListener('mouseenter', function () { fire(nm); });
                node.addEventListener('mouseleave', function () { fire(null); });
            })(rowsEl[i]);
        }
    }

    /* ------------------------------------------------------------
     * A3 地图区块高亮（配合排行 hover）
     * ------------------------------------------------------------ */
    function highlightRegion(chart, name, seriesIndex) {
        if (!chart) { return; }
        var si = seriesIndex == null ? 0 : seriesIndex;
        chart.dispatchAction({ type: 'downplay', seriesIndex: si });
        if (name) {
            chart.dispatchAction({ type: 'highlight', seriesIndex: si, name: name });
        }
    }

    /* ------------------------------------------------------------
     * B3 地图气泡层：大小编码规模，颜色编码等级
     * 用第三个 series 追加，不影响 visualMap（seriesIndex: 0）对主地图的着色。
     * ------------------------------------------------------------ */
    function bubbleSeries(items, opts) {
        opts = opts || {};
        var max = items.reduce(function (m, d) { return Math.max(m, d.value || 0); }, 0) || 1;
        return {
            name: opts.name || '规模气泡',
            type: 'scatter',
            coordinateSystem: 'geo',
            z: 6,
            symbol: 'circle',
            symbolSize: function (val, p) {
                var v = (p && p.data && p.data.value) || 0;
                return (opts.min || 14) + (v / max) * ((opts.max || 46) - (opts.min || 14));
            },
            itemStyle: {
                color: opts.color || 'rgba(90, 215, 240, 0.22)',
                borderColor: opts.borderColor || 'rgba(127, 228, 245, 0.75)',
                borderWidth: 1.2
            },
            label: {
                show: true, position: 'inside',
                color: '#e6f1ff', fontSize: 11, fontWeight: 600,
                formatter: function (p) { return (p.data && p.data.show != null) ? p.data.show : ''; }
            },
            emphasis: { scale: 1.08, itemStyle: { borderColor: '#33D69F', borderWidth: 2 } },
            data: items,
            tooltip: opts.tooltip || undefined
        };
    }

    /* ------------------------------------------------------------
     * A4 推算值悬浮说明
     * ------------------------------------------------------------ */
    function bindEstTips() {
        var tip = document.createElement('div');
        tip.className = 'dl-tip';
        document.body.appendChild(tip);

        function show(e) {
            var t = e.currentTarget;
            var title = t.getAttribute('data-est-title') || '推算值';
            var body = t.getAttribute('data-est') || '';
            tip.innerHTML = '<div class="dl-tip-title">' + esc(title) + '</div>' + esc(body);
            tip.classList.add('show');
            var r = t.getBoundingClientRect();
            var left = Math.min(r.left, window.innerWidth - 320);
            var top = r.bottom + 8;
            if (top + 120 > window.innerHeight) { top = Math.max(8, r.top - 110); }
            tip.style.left = left + 'px';
            tip.style.top = top + 'px';
        }
        function hide() { tip.classList.remove('show'); }

        var nodes = document.querySelectorAll('[data-est]');
        for (var i = 0; i < nodes.length; i++) {
            nodes[i].addEventListener('mouseenter', show);
            nodes[i].addEventListener('mouseleave', hide);
        }
    }

    /* ------------------------------------------------------------
     * B6 数据更新时间：统一格式 HH:MM
     * ------------------------------------------------------------ */
    function stampUpdate(el, d) {
        if (!el) { return; }
        var t = d || new Date();
        var p = function (x) { return (x < 10 ? '0' : '') + x; };
        el.textContent = p(t.getHours()) + ':' + p(t.getMinutes());
    }

    global.DL = {
        sparkline: sparkline,
        renderSparklines: renderSparklines,
        todo: todo,
        rank: rank,
        highlightRegion: highlightRegion,
        bubbleSeries: bubbleSeries,
        bindEstTips: bindEstTips,
        stampUpdate: stampUpdate
    };
})(window);
