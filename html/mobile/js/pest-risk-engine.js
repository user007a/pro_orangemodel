/**
 * 病虫害风险评估引擎
 * 基于环境数据（温度/湿度/降雨）和历史趋势，评估当前果园的病虫害风险等级
 */
window.PestRiskEngine = (function() {
  // 病虫害知识库：蜜桔常见病虫害的生态阈值
  var PEST_DB = {
    '红蜘蛛': {
      name: '红蜘蛛',
      icon: '🐞',
      tempRange: [22, 32],
      tempOptimal: [27, 30],
      humidityMax: 70,
      humidityMin: 30,
      rainfallMax: 50,
      accumulateTemp: 200,
      seasonMonths: [5, 6, 7, 8, 9],
      severity: 'high',
      summary: '高温干旱易爆发，叶片正面出现密集黄白色小点'
    },
    '蚧壳虫': {
      name: '蚧壳虫',
      icon: '🪲',
      tempRange: [20, 28],
      tempOptimal: [22, 26],
      humidityMin: 60,
      humidityMax: 85,
      rainfallMax: 30,
      accumulateTemp: 150,
      seasonMonths: [4, 5, 6, 9, 10],
      severity: 'medium',
      summary: '温暖湿润环境高发，附着枝叶吸食汁液'
    },
    '炭疽病': {
      name: '炭疽病',
      icon: '🍂',
      tempRange: [22, 30],
      tempOptimal: [25, 28],
      humidityMin: 80,
      rainfallMin: 30,
      accumulateTemp: 180,
      seasonMonths: [5, 6, 7, 8, 9],
      severity: 'medium',
      summary: '高温高湿多雨易流行，叶片病斑近圆形'
    },
    '黑点病': {
      name: '黑点病',
      icon: '⚫',
      tempRange: [18, 26],
      tempOptimal: [20, 24],
      humidityMin: 75,
      rainfallMin: 20,
      accumulateTemp: 160,
      seasonMonths: [4, 5, 6, 9, 10],
      severity: 'medium',
      summary: '果实表面散生黑点，低温高湿下活跃'
    },
    '木虱': {
      name: '柑桔木虱',
      icon: '🦟',
      tempRange: [22, 30],
      tempOptimal: [24, 28],
      humidityOptimal: [50, 70],
      rainfallMax: 60,
      accumulateTemp: 220,
      seasonMonths: [4, 5, 6, 7, 8, 9, 10],
      severity: 'high',
      summary: '传播黄龙病的媒介昆虫，需重点防控'
    },
    '蚜虫': {
      name: '蚜虫',
      icon: '🪰',
      tempRange: [16, 26],
      tempOptimal: [20, 24],
      humidityMin: 50,
      humidityMax: 80,
      accumulateTemp: 120,
      seasonMonths: [4, 5, 6, 9, 10],
      severity: 'medium',
      summary: '春季新梢抽发期高发，吸食嫩叶汁液'
    },
    '锈壁虱': {
      name: '锈壁虱',
      icon: '🟤',
      tempRange: [24, 32],
      tempOptimal: [26, 30],
      humidityMax: 70,
      rainfallMax: 40,
      accumulateTemp: 250,
      seasonMonths: [6, 7, 8, 9, 10],
      severity: 'high',
      summary: '高温干旱季节爆发，果实表面形成锈斑'
    }
  };

  /**
   * 主评估函数
   * @param {Object} envData - {temp, humidity, rainfall}
   * @param {Object} historyData - {dailyTemps:[], captures: {pestName: recent7day}}
   */
  function assess(envData, historyData) {
    envData = envData || {};
    historyData = historyData || {};
    var results = [];
    var now = new Date();
    var month = now.getMonth() + 1;

    Object.keys(PEST_DB).forEach(function(key) {
      var pest = PEST_DB[key];
      var score = 0;
      var factors = [];
      var matches = 0;
      var totalFactors = 0;

      // 1. 温度匹配（权重 40）
      if (envData.temp !== undefined && envData.temp !== null) {
        totalFactors++;
        if (pest.tempOptimal && envData.temp >= pest.tempOptimal[0] && envData.temp <= pest.tempOptimal[1]) {
          score += 40;
          matches++;
          factors.push({ name: '温度适宜', detail: envData.temp + '°C处于最适范围', positive: true });
        } else if (envData.temp >= pest.tempRange[0] && envData.temp <= pest.tempRange[1]) {
          score += 25;
          matches++;
          factors.push({ name: '温度适中', detail: envData.temp + '°C处于可发生范围', positive: true });
        }
      }

      // 2. 湿度匹配（权重 30）
      if (envData.humidity !== undefined && envData.humidity !== null) {
        totalFactors++;
        if (pest.humidityMin !== undefined && pest.humidityMax !== undefined) {
          // 湿度区间型
          if (envData.humidity >= pest.humidityMin && envData.humidity <= pest.humidityMax) {
            score += 30;
            matches++;
            factors.push({ name: '湿度适宜', detail: '湿度' + envData.humidity + '%在适宜范围', positive: true });
          }
        } else if (pest.humidityMin !== undefined) {
          // 高湿诱发型（如炭疽病）
          if (envData.humidity >= pest.humidityMin) {
            score += 30;
            matches++;
            factors.push({ name: '湿度偏高', detail: '湿度' + envData.humidity + '%, 高湿易发病', positive: true });
          }
        } else if (pest.humidityMax !== undefined) {
          // 干旱诱发型（如红蜘蛛）
          if (envData.humidity <= pest.humidityMax) {
            score += 30;
            matches++;
            factors.push({ name: '湿度适宜', detail: '湿度' + envData.humidity + '%干燥易发', positive: true });
          }
        }
      }

      // 3. 降雨抑制（权重 -20 到 +15）
      if (envData.rainfall !== undefined && envData.rainfall !== null) {
        totalFactors++;
        if (pest.rainfallMin !== undefined && envData.rainfall >= pest.rainfallMin) {
          // 多雨诱发型
          score += 15;
          matches++;
          factors.push({ name: '降雨充沛', detail: '近期降雨' + envData.rainfall + 'mm', positive: true });
        } else if (pest.rainfallMax !== undefined && envData.rainfall > pest.rainfallMax) {
          // 雨水抑制型
          score -= 20;
          factors.push({ name: '降雨抑制', detail: '近期降雨' + envData.rainfall + 'mm抑制虫害', positive: false });
        }
      }

      // 4. 季节匹配（权重 15）
      if (pest.seasonMonths.indexOf(month) >= 0) {
        score += 15;
        matches++;
        factors.push({ name: '高发季节', detail: month + '月为该虫害高发期', positive: true });
      }

      // 5. 历史捕获（权重 15）
      var captures = (historyData.captures || {})[key];
      if (captures && captures.recent7day > 5) {
        score += 15;
        matches++;
        factors.push({ name: '历史趋势', detail: '近7日测报灯捕获' + captures.recent7day + '只', positive: true });
      }

      // 6. 积温触发（权重 10）
      var accResult = calcAccumulatedTemp(historyData.dailyTemps || [], pest.accumulateTemp || 200);
      if (accResult.reached) {
        score += 10;
        matches++;
        factors.push({ name: '积温达标', detail: '有效积温' + accResult.value.toFixed(0) + '°C·d', positive: true });
      }

      // 等级划分
      var level = score >= 50 ? 'high' : score >= 30 ? 'medium' : 'low';
      // 严重度加成：严重病虫害即使中等评分也提高警示
      if (pest.severity === 'high' && score >= 35) level = 'high';

      results.push({
        key: key,
        name: pest.name,
        icon: pest.icon,
        severity: pest.severity,
        score: Math.max(0, Math.min(score, 100)),
        level: level,
        factors: factors,
        summary: pest.summary
      });
    });

    // 按风险评分降序
    results.sort(function(a, b) { return b.score - a.score; });
    return results;
  }

  /**
   * 有效积温计算（简化）
   * @param {Array} dailyTemps - [{date, temp}, ...]
   * @param {Number} threshold - 积温阈值
   */
  function calcAccumulatedTemp(dailyTemps, threshold) {
    var baseTemp = 10; // 蜜桔生物学零度
    if (!dailyTemps || !dailyTemps.length) return { value: 0, reached: false };
    var sum = 0;
    dailyTemps.forEach(function(t) {
      var temp = typeof t === 'object' ? t.temp : t;
      if (temp > baseTemp) sum += (temp - baseTemp);
    });
    return { value: sum, reached: sum >= threshold };
  }

  /**
   * 获取整体风险摘要
   */
  function getOverallRisk(results) {
    if (!results || !results.length) return { level: 'low', text: '暂无风险', color: '#52c41a', topPest: null };
    var top = results[0];
    return {
      level: top.level,
      text: top.level === 'high' ? '高风险' : top.level === 'medium' ? '中风险' : '低风险',
      color: top.level === 'high' ? '#ff4d4f' : top.level === 'medium' ? '#faad14' : '#52c41a',
      topPest: top
    };
  }

  /**
   * 获取病虫害详细信息（用于详情页）
   */
  function getPestDetail(key) {
    return PEST_DB[key] || null;
  }

  /**
   * 获取病虫害推荐用药
   */
  var DRUG_DB = {
    '红蜘蛛': [
      { name: '阿维菌素 1.8% EC', spec: '稀释 5000-6000 倍液', period: '16:00-18:00 喷施' },
      { name: '螺螨酯 24% SC', spec: '稀释 4000-5000 倍液', period: '叶片正反面均匀喷施' },
      { name: '哒螨灵 15% EC', spec: '稀释 3000 倍液', period: '与其它杀螨剂轮换使用' }
    ],
    '蚧壳虫': [
      { name: '毒死蜱 40% EC', spec: '稀释 1500-2000 倍液', period: '若虫孵化盛期喷施' },
      { name: '噻嗪酮 25% WP', spec: '稀释 1500 倍液', period: '清晨或傍晚喷施' }
    ],
    '炭疽病': [
      { name: '代森锰锌 80% WP', spec: '稀释 600-800 倍液', period: '发病初期喷施' },
      { name: '咪鲜胺 25% EC', spec: '稀释 1000 倍液', period: '7-10天连续2次' }
    ],
    '黑点病': [
      { name: '代森锰锌 80% WP', spec: '稀释 600-800 倍液', period: '幼果期预防' },
      { name: '百菌清 75% WP', spec: '稀释 600-800 倍液', period: '雨前雨后喷施' }
    ],
    '木虱': [
      { name: '吡虫啉 10% WP', spec: '稀释 2000-3000 倍液', period: '新梢抽发期喷施' },
      { name: '噻虫嗪 25% WG', spec: '稀释 3000-4000 倍液', period: '与速效杀虫剂混用' }
    ],
    '蚜虫': [
      { name: '吡虫啉 10% WP', spec: '稀释 3000 倍液', period: '新梢期预防' },
      { name: '啶虫脒 3% EC', spec: '稀释 1500 倍液', period: '清晨或傍晚喷施' }
    ],
    '锈壁虱': [
      { name: '阿维菌素 1.8% EC', spec: '稀释 5000 倍液', period: '幼果期开始预防' },
      { name: '丁硫克百威 20% EC', spec: '稀释 2000-3000 倍液', period: '与生物防治结合' }
    ]
  };

  function getDrugs(pestKey) {
    return DRUG_DB[pestKey] || [];
  }

  // ========== 蜜桔生长环境适宜性评估 ==========

  // 南丰蜜桔生长环境适宜范围（综合农艺学文献）
  var GROWTH_RULES = [
    { key: 'temp', name: '气温', valueKey: 'temp', unit: '°C',
      range: [15, 32],
      advice: { low: '气温偏低，需注意防寒', high: '气温偏高，建议果园喷水降温' } },
    { key: 'humidity', name: '空气湿度', valueKey: 'humidity', unit: '%',
      range: [60, 80],
      advice: { low: '空气干燥，建议叶面喷水增湿', high: '湿度过高，加强通风排湿' } },
    { key: 'windSpeed', name: '风速', valueKey: 'windSpeed', unit: ' m/s',
      range: [0, 8],
      advice: { low: null, high: '风速较大，注意防风防落果' } },
    { key: 'rainfall', name: '降雨量', valueKey: 'rainfall', unit: ' mm',
      range: [0, 50],
      advice: { low: null, high: '降雨量较大，及时排涝防积水' } },
    { key: 'light', name: '光照', valueKey: 'light', unit: ' lux',
      range: [10000, 50000],
      advice: { low: '光照不足，影响光合作用', high: null } },
    { key: 'soilMoisture', name: '土壤湿度', valueKey: 'soilMoisture', unit: '%',
      range: [50, 70],
      advice: { low: '土壤偏干，建议灌溉', high: '土壤过湿，注意排涝' } },
    { key: 'soilTemp', name: '土壤温度', valueKey: 'soilTemp', unit: '°C',
      range: [18, 28],
      advice: { low: '土温偏低，影响根系活性', high: '土温偏高，建议覆盖降温' } },
    { key: 'soilPh', name: '土壤pH', valueKey: 'soilPh', unit: '',
      range: [5.5, 6.5],
      advice: { low: 'pH偏低，建议施用石灰改良', high: 'pH偏高，建议施用硫磺粉改良' } },
    { key: 'soilEC', name: '土壤EC', valueKey: 'soilEC', unit: ' mS/cm',
      range: [0.8, 1.6],
      advice: { low: 'EC偏低，注意补充养分', high: 'EC偏高，注意盐害风险' } }
  ];

  /**
   * 蜜桔生长环境适宜性评估
   * @param {Object} envData - { temp, humidity, windSpeed, rainfall, light, soilMoisture, soilTemp, soilPh, soilEC }
   * @returns {Object} { overall: 'fit'|'risk', items: [{name, valueText, status, advice}] }
   */
  function assessGrowth(envData) {
    envData = envData || {};
    var items = [];

    GROWTH_RULES.forEach(function(rule) {
      var raw = envData[rule.valueKey];
      if (raw === undefined || raw === null || raw === '') return;

      // 风向特殊处理：字符串不参与数值判断
      if (typeof raw === 'string' && isNaN(parseFloat(raw))) return;

      var num = parseFloat(raw);
      var min = rule.range[0];
      var max = rule.range[1];
      var status = (num >= min && num <= max) ? 'fit' : 'risk';
      var direction = num < min ? 'low' : 'high';
      var advice = null;
      if (status === 'risk' && rule.advice) {
        advice = rule.advice[direction] || null;
      }

      // 数值格式化
      var valueText;
      if (rule.unit === '') {
        valueText = num.toFixed(1);
      } else if (rule.key === 'temp' || rule.key === 'soilTemp') {
        valueText = num.toFixed(1) + rule.unit;
      } else if (rule.key === 'soilPh') {
        valueText = num.toFixed(1);
      } else if (rule.key === 'soilEC') {
        valueText = num.toFixed(2) + rule.unit;
      } else if (rule.key === 'windSpeed') {
        valueText = num.toFixed(1) + rule.unit;
      } else {
        valueText = num.toFixed(1) + rule.unit;
      }

      items.push({
        key: rule.key,
        name: rule.name,
        valueText: valueText,
        status: status,
        advice: advice
      });
    });

    var riskCount = items.filter(function(i) { return i.status === 'risk'; }).length;
    return {
      overall: riskCount === 0 ? 'fit' : 'risk',
      riskCount: riskCount,
      items: items,
      summary: riskCount === 0
        ? '南丰蜜桔当前生长条件整体良好'
        : '存在 ' + riskCount + ' 项指标超出适宜范围，建议关注'
    };
  }

  return {
    assess: assess,
    calcAccumulatedTemp: calcAccumulatedTemp,
    getOverallRisk: getOverallRisk,
    getPestDetail: getPestDetail,
    getDrugs: getDrugs,
    assessGrowth: assessGrowth,
    GROWTH_RULES: GROWTH_RULES,
    PEST_DB: PEST_DB,
    DRUG_DB: DRUG_DB
  };
})();