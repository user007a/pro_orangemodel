/* ============================================
 * 南丰县地图渲染模块 (Nanfeng Map)
 * 生长模型大屏 与 病虫害大屏 共用，避免样式漂移
 *
 * 设计规范：
 *   - 单一青色系 5 级色阶，数值由填充深浅表达
 *   - 描边只有一种颜色，不参与数值编码
 *   - 选中 / 告警 用绿色环，全局仅此处保留发光
 *   - 无 3D 投影层、无扫描圈、无扫描线
 * ============================================ */
(function (global) {
    'use strict';

    var MAP_NAME = 'nanfeng';
    var PROVINCE = '江西省';
    var CITY = '抚州市';
    var COUNTY = '南丰县';

    /* 单一青色系 5 级色阶（浅 → 深） */
    var RAMP = ['#123A6E', '#16528F', '#1E7FB8', '#35B4DE', '#5AD7F0'];

    var STROKE = '#7FE4F5';          /* 区域描边：固定亮青 */
    var STROKE_WIDTH = 1.5;
    var LABEL_COLOR = '#FFFFFF';     /* 区域名称：白字 + 深色细描边 */
    var LABEL_HALO = 'rgba(3, 12, 26, 0.85)';
    var LABEL_SIZE = 16;
    var HIGHLIGHT = '#33D69F';       /* 选中 / 告警：绿色 */
    /* 无数据区域（长红垦殖场、南丰工业园区）用中性灰 + 虚线边，
     * 与「青色系色阶」在色相上彻底区分，避免被读成最低档。 */
    var NODATA_FILL = '#3F4A5C';
    var MARKER_FILL = '#0A1A2F';
    var TEXT_PRIMARY = '#E6F1FF';
    var TEXT_SECONDARY = '#94A3B8';

    var NO_DATA_REGIONS = ['南丰县长红垦殖场', '南丰工业园区'];

    /* ---------- 长名称缩写 ----------
     * 「南丰县长红垦殖场」8 个字放在地图上会横穿邻区，
     * 缩为「长红垦殖场 / 工业园区」，图例 tooltip 仍保留全称。 */
    var SHORT_NAME = {
        '南丰县长红垦殖场': '长红垦殖场',
        '南丰工业园区': '工业园区'
    };
    var FULL_NAME = {};
    Object.keys(SHORT_NAME).forEach(function (k) { FULL_NAME[SHORT_NAME[k]] = k; });

    function shortName(n) { return SHORT_NAME[n] || n; }

    /* ---------- 标签微调（像素） ----------
     * 县城所在的中部（琴城 / 市山 / 工业园区 / 莱溪）区域面积小且相邻，
     * 自动布局会让名称互相压叠，因此按区域手工错开。 */
    var LABEL_NUDGE = {
        '南丰工业园区': [28, -24],   /* 让开下方的市山镇 */
        '琴城镇':       [2, 54],     /* 县城是狭长小区域，向下让开监测点 */
        '莱溪乡':       [42, 20],    /* 向下右让开监测点 */
        '太源乡':       [26, 16],
        '桑田镇':       [0, 22],     /* 监测点压在字上，向下让开 */
        '三溪乡':       [0, 22],
        '紫霄镇':       [0, 22],
        '洽湾镇':       [6, -14],
        '东坪乡':       [14, -6]
    };

    var registered = false;

    /* ---------- 注册地图 ---------- */
    function register() {
        if (registered) { return true; }
        if (!global.echarts) {
            console.error('[NFMap] ECharts 未加载');
            return false;
        }
        if (!global.NANFENG_GEOJSON) {
            console.error('[NFMap] data/nanfeng-map.js 未加载');
            return false;
        }
        global.echarts.registerMap(MAP_NAME, global.NANFENG_GEOJSON);
        registered = true;
        return true;
    }

    /* ---------- 取某乡镇的标签锚点（供标注点定位使用） ---------- */
    function centerOf(name) {
        var fc = global.NANFENG_GEOJSON;
        if (!fc) { return null; }
        for (var i = 0; i < fc.features.length; i++) {
            if (fc.features[i].properties.name === name) {
                return fc.features[i].properties.cp;
            }
        }
        return null;
    }

    /* 在乡镇锚点基础上按偏移量取点，偏移单位：经纬度 */
    function pointIn(name, dLng, dLat) {
        var cp = centerOf(name);
        if (!cp) { return [116.52, 27.20]; }
        return [Number((cp[0] + (dLng || 0)).toFixed(5)),
                Number((cp[1] + (dLat || 0)).toFixed(5))];
    }

    /* ---------- 柱状图专用配色 ----------
     * 柱形需要有最低对比度，因此只取色阶的中亮区间，
     * 避免最低值落到最深的 #123A6E 而在深色面板上几乎不可见。 */
    function barColor(v) {
        if (v >= 85) { return RAMP[4]; }
        if (v >= 70) { return RAMP[3]; }
        if (v >= 55) { return RAMP[2]; }
        if (v >= 40) { return '#2A7FB5'; }
        return '#1E6EA0';
    }

    /* 同一维度、多条柱子时按排名取色：
     * 只用一个色相、以亮度表达大小，和地图的表达方式保持一致。
     * 不要用「红黄绿」给同类目上色 —— 那会让色相变成装饰而非信息。 */
    var BAR_STEPS = ['#1E6EA0', '#288EC1', '#329CCB', '#3CABD4',
                     '#46BADD', '#50C8E7', '#5AD7F0'];
    var BAR_MIN_RGB = [30, 110, 160];   /* #1E6EA0 起点：保证在深色面板上仍有对比度 */
    var BAR_MAX_RGB = [90, 215, 240];   /* #5AD7F0 终点 */

    /* 按排名在青色区间内连续插值，条目数任意都不会出现重色 */
    function rampByRank(values) {
        var n = values.length;
        var order = values.map(function (v, i) { return i; })
            .sort(function (a, b) { return values[a] - values[b]; });
        var out = new Array(n);
        var span = Math.max(1, n - 1);
        order.forEach(function (i, rank) {
            var t = rank / span;
            var c = BAR_MIN_RGB.map(function (v, k) {
                return Math.round(v + (BAR_MAX_RGB[k] - v) * t);
            });
            out[i] = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
        });
        return out;
    }

    /* ---------- 色阶定义 ---------- */
    /* 5 级：用于生长模型评分（越高越亮） */
    function scorePieces() {
        return [
            { min: 85, max: 100, label: '85 – 100  优秀', color: RAMP[4] },
            { min: 70, max: 85, label: '70 – 85  良好', color: RAMP[3] },
            { min: 55, max: 70, label: '55 – 70  中等', color: RAMP[2] },
            { min: 40, max: 55, label: '40 – 55  偏低', color: RAMP[1] },
            { min: 0, max: 40, label: '0 – 40  较差', color: RAMP[0] }
        ];
    }

    /* 5 级：用于病虫害风险（越高越亮，语义不同但同一套色阶） */
    function riskPieces() {
        return [
            { min: 85, max: 100, label: '85 – 100  高风险', color: RAMP[4] },
            { min: 70, max: 85, label: '70 – 85  较高风险', color: RAMP[3] },
            { min: 55, max: 70, label: '55 – 70  中等风险', color: RAMP[2] },
            { min: 40, max: 55, label: '40 – 55  较低风险', color: RAMP[1] },
            { min: 0, max: 40, label: '0 – 40  低风险', color: RAMP[0] }
        ];
    }

    /* ---------- 生成完整 ECharts option ---------- */
    /*
     * cfg:
     *   pieces           visualMap 分段（scorePieces / riskPieces）
     *   data             [{ name, value, ... }]
     *   markers          [{ name, coord:[lng,lat], count, value, alert:Boolean, size:Number }]
     *   markerUnit       标注内数字的含义，用于 tooltip
     *   emphasisLabel    点击/悬停时的标签内容 formatter(params) => string
     *   tooltip          透传给 ECharts 的 tooltip 配置
     *   legendTitle      图例标题
     */
    function option(cfg) {
        cfg = cfg || {};
        var pieces = cfg.pieces || scorePieces();
        var data = cfg.data || [];
        var markers = cfg.markers || [];

        /* 把「无数据」区域也并入 data（value:null），
         * 这样它们可以被单独赋予斜线填充与灰字，而不会占用色阶。 */
        var merged = data.slice();
        var has = {};
        merged.forEach(function (d) { has[d.name] = true; });
        NO_DATA_REGIONS.forEach(function (n) {
            if (has[n]) { return; }
            merged.push({
                name: n,
                /* 用 -1 这个落在所有分档之外的哨兵值，
                 * 让 visualMap 走 outOfRange，同时数据项被真正保留，
                 * 使下面的斜线填充 / 灰字能够生效（value:null 时会被丢弃）。 */
                value: -1,
                itemStyle: {
                    areaColor: NODATA_FILL,
                    borderColor: 'rgba(203, 213, 225, 0.75)',
                    borderWidth: 1.2,
                    borderType: 'dashed'
                },
                label: { color: 'rgba(203, 213, 225, 0.90)' }
            });
        });

        var nudge = function (p) {
            var full = FULL_NAME[p.text] || p.text;
            var d = LABEL_NUDGE[full];
            return d ? { dx: d[0], dy: d[1] } : {};
        };

        /* 标注点：普通 = 青色环；告警 / 选中 = 绿色环 + 发光（全局唯一发光点） */
        var markerData = markers.map(function (m) {
            return {
                name: m.name,
                value: m.coord,
                count: m.count,
                alert: !!m.alert,
                size: m.size || 9,
                raw: m
            };
        });

        return {
            backgroundColor: 'transparent',
            animationDuration: 600,
            animationEasing: 'cubicOut',

            geo: {
                map: MAP_NAME,
                roam: false,
                zoom: 1,
                aspectScale: 0.89,
                label: { show: false },
                itemStyle: {
                    areaColor: 'transparent',
                    borderColor: 'transparent',
                    borderWidth: 0
                },
                silent: true,
                z: 0
            },

            visualMap: {
                type: 'piecewise',
                show: true,
                pieces: pieces,
                left: 18,
                bottom: 18,
                itemWidth: 14,
                itemHeight: 10,
                itemGap: 8,
                textStyle: {
                    color: TEXT_SECONDARY,
                    fontSize: 12,
                    fontFamily: 'inherit'
                },
                outOfRange: { color: NODATA_FILL },
                seriesIndex: 0
            },

            series: [
                /* ===== 主体：数值色阶（唯一的地图层） ===== */
                {
                    name: cfg.seriesName || '数值分布',
                    type: 'map',
                    map: MAP_NAME,
                    layoutCenter: ['50%', '50%'],
                    layoutSize: '96%',
                    data: merged,
                    selectedMode: false,
                    label: {
                        show: true,
                        color: LABEL_COLOR,
                        fontSize: LABEL_SIZE,
                        fontWeight: 500,
                        textBorderColor: LABEL_HALO,
                        textBorderWidth: 3,
                        formatter: function (p) { return shortName(p.name); }
                    },
                    labelLayout: nudge,
                    itemStyle: {
                        areaColor: NODATA_FILL,
                        borderColor: STROKE,
                        borderWidth: STROKE_WIDTH,
                        shadowBlur: 26,
                        shadowColor: 'rgba(0, 0, 0, 0.55)',
                        shadowOffsetX: 0,
                        shadowOffsetY: 6
                    },
                    emphasis: {
                        label: {
                            show: true,
                            color: '#FFFFFF',
                            fontSize: LABEL_SIZE + 2,
                            fontWeight: 500,
                            textBorderColor: 'rgba(3, 12, 26, 0.95)',
                            textBorderWidth: 3,
                            formatter: cfg.emphasisLabel || function (p) { return shortName(p.name); }
                        },
                        itemStyle: {
                            borderColor: HIGHLIGHT,
                            borderWidth: 2.5,
                            shadowBlur: 18,
                            shadowColor: 'rgba(51, 214, 159, 0.55)'
                        }
                    },
                    z: 2
                },

                /* ===== 标注点：无涟漪、无扫描，仅圆点 + 环 ===== */
                {
                    name: cfg.markerName || '监测点',
                    type: 'scatter',
                    coordinateSystem: 'geo',
                    data: markerData,
                    symbol: 'circle',
                    symbolSize: function (val, params) {
                        var d = (params && params.data) || {};
                        return d.alert ? d.size * 2.2 : d.size * 1.8;
                    },
                    itemStyle: {
                        color: MARKER_FILL,
                        borderColor: STROKE,
                        borderWidth: 2
                    },
                    label: {
                        show: true,
                        position: 'inside',
                        color: TEXT_PRIMARY,
                        fontSize: 12,
                        fontWeight: 500,
                        formatter: function (p) {
                            return (p.data && p.data.count != null) ? p.data.count : '';
                        }
                    },
                    emphasis: {
                        scale: 1.15,
                        itemStyle: { borderColor: HIGHLIGHT, borderWidth: 2.5 }
                    },
                    z: 10
                }
            ],

            tooltip: cfg.tooltip || {
                trigger: 'item',
                backgroundColor: 'rgba(10, 28, 60, 0.96)',
                borderColor: STROKE,
                borderWidth: 1,
                textStyle: { color: TEXT_PRIMARY, fontSize: 13 },
                extraCssText: 'border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.45);'
            }
        };
    }

    /* 告警 / 选中标注点的样式（绿色环 + 唯一发光） */
    function alertMarkerStyle() {
        return {
            itemStyle: {
                color: MARKER_FILL,
                borderColor: HIGHLIGHT,
                borderWidth: 2.5,
                shadowBlur: 14,
                shadowColor: 'rgba(51, 214, 159, 0.8)'
            }
        };
    }

    global.NFMap = {
        MAP_NAME: MAP_NAME,
        PROVINCE: PROVINCE,
        CITY: CITY,
        COUNTY: COUNTY,
        RAMP: RAMP,
        STROKE: STROKE,
        HIGHLIGHT: HIGHLIGHT,
        NODATA_FILL: NODATA_FILL,
        NO_DATA_REGIONS: NO_DATA_REGIONS,
        SHORT_NAME: SHORT_NAME,
        LABEL_NUDGE: LABEL_NUDGE,
        shortName: shortName,
        register: register,
        option: option,
        scorePieces: scorePieces,
        riskPieces: riskPieces,
        barColor: barColor,
        rampByRank: rampByRank,
        BAR_STEPS: BAR_STEPS,
        centerOf: centerOf,
        pointIn: pointIn,
        alertMarkerStyle: alertMarkerStyle
    };
})(window);
