/**
 * 病虫害数据库公共模块
 * 适用于病害库 disease_db.html 和虫害库 insect_db.html
 *
 * 业务库（非 AI 训练数据集），面向病虫害查询、小程序/APP知识库、
 * 农事处方、专家系统、档案管理场景。
 */

(function (global) {
  'use strict';

  // ============================================================
  // 1. 枚举配置（业务字典）
  // ============================================================

  // 物候期字典（南丰蜜桔）
  const PHENOLOGY_OPTIONS = [
    '休眠期', '萌芽期', '现蕾期', '开花期', '春梢期',
    '幼果期', '夏梢期', '生理落果期', '膨大期', '秋梢期',
    '着色期', '成熟期', '采后期'
  ];

  // 发病部位字典（柑橘）
  const PART_OPTIONS = ['叶片', '果实', '枝干', '根系', '花'];

  // 危害等级
  const HARM_LEVEL_OPTIONS = ['轻', '中', '重'];

  // 状态
  const STATUS_OPTIONS = ['启用', '禁用'];

  // 病害类型
  const DISEASE_TYPE_OPTIONS = ['真菌性', '细菌性', '病毒性', '生理性', '药害', '缺素'];

  // 虫害分类（保留原有 4 类，业务未要求改）
  const INSECT_TYPE_OPTIONS = ['螨类', '蛾类', '虱类', '其他'];

  // 柑橘品种
  const VARIETY_OPTIONS = [
    '南丰蜜桔', '砂糖橘', '沃柑', '脐橙', '温州蜜柑',
    '椪柑', '红美人', '冰糖橙', '柚类', '柠檬'
  ];

  // 表单 Tab 配置
  const FORM_TABS = [
    { key: 'basic',     label: '基础识别', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'symptom',   label: '症状表现', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
    { key: 'condition', label: '发生条件', icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z' },
    { key: 'control',   label: '防治方案', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { key: 'images',    label: '图片素材', icon: 'M4 16l4.586-4L11 14m0 0l3-3 4 4m-4-4l-3 3M3 6h18M3 6v12a2 2 0 002 2h14a2 2 0 002-2V6' }
  ];

  // ============================================================
  // 2. 字段 schema 定义（统一必填校验）
  // ============================================================

  const DISEASE_SCHEMA = {
    basic: {
      required: ['id', 'name', 'type', 'pathogen', 'hostVarieties'],
      fields: {
        id:            { label: '病害ID',       type: 'text',     placeholder: '如：B-001', hint: '系统内部编码，唯一主键' },
        name:          { label: '病害标准名称', type: 'text',     placeholder: '如：柑橘黄龙病' },
        aliases:       { label: '别名',         type: 'text',     placeholder: '多个别名用 / 分隔，如：黄梢病/黄化病', required: false },
        type:          { label: '病害类型',     type: 'select',   options: DISEASE_TYPE_OPTIONS },
        pathogen:      { label: '病原/诱因',    type: 'textarea', placeholder: '病原菌名或生理诱因（如缺镁、日灼）', rows: 2 },
        hostVarieties: { label: '危害柑橘品种', type: 'chips',    options: VARIETY_OPTIONS, hint: '可多选' }
      }
    },
    symptom: {
      required: ['parts', 'leafSymptom', 'fruitSymptom', 'branchSymptom', 'typicalFeature'],
      fields: {
        parts:          { label: '发病部位',     type: 'chips',  options: PART_OPTIONS },
        leafSymptom:    { label: '叶片症状',     type: 'textarea', rows: 2, placeholder: '叶片颜色、斑点、畸形、脱落等' },
        fruitSymptom:   { label: '果实症状',     type: 'textarea', rows: 2, placeholder: '果面斑点、腐烂、畸形、落果等；无则填"无危害果实"' },
        branchSymptom:  { label: '枝干/根系症状',type: 'textarea', rows: 2, placeholder: '流胶、溃疡、腐烂、根腐等；无则填"无明显症状"' },
        typicalFeature: { label: '典型识别特征', type: 'textarea', rows: 2, placeholder: '最关键区分点，用于和相似病害鉴别（如黄龙病"红鼻子果"）', highlight: true },
        confusedWith:   { label: '易混淆病害',   type: 'text', required: false, placeholder: '关联病害ID，用 / 分隔，如：B-002/B-005' }
      }
    },
    condition: {
      required: ['peakSeason', 'environment', 'transmission'],
      fields: {
        peakSeason:  { label: '高发时期',   type: 'chips', options: PHENOLOGY_OPTIONS, hint: '物候期优先，可多选' },
        monthNote:   { label: '月份备注',   type: 'text', required: false, placeholder: '如：4-6月、9-11月' },
        environment: { label: '适宜环境',   type: 'textarea', rows: 2, placeholder: '温度、湿度、雨水、光照、土壤pH等' },
        transmission:{ label: '传播途径',   type: 'textarea', rows: 2, placeholder: '虫害传播、风雨、农事操作、土壤、嫁接；生理性填"非传染性"' },
        trigger:     { label: '发病诱因',   type: 'textarea', rows: 2, required: false, placeholder: '树势弱、偏施氮肥、排水差、修剪不当等' }
      }
    },
    control: {
      required: ['agriControl', 'bioControl', 'chemControl', 'keyPeriod'],
      fields: {
        agriControl: { label: '农业防治',   type: 'textarea', rows: 3, placeholder: '修剪、清园、排水、增施有机肥、选无病苗等' },
        bioControl:  { label: '物理/生物防治', type: 'textarea', rows: 2, placeholder: '诱杀、天敌、生物菌剂；没有则填"无"' },
        chemControl: { label: '化学防治',   type: 'textarea', rows: 3, placeholder: '药剂名称、使用时期、注意事项', warning: '为规避合规风险，请勿填写具体剂量（如克、毫升等数值）。如需写用药建议，请改写为"低浓度"等模糊表述。' },
        keyPeriod:   { label: '防治关键节点', type: 'textarea', rows: 2, placeholder: '如：新梢抽发期、谢花幼果期' },
        notes:       { label: '注意事项',   type: 'textarea', rows: 2, required: false, placeholder: '避开花期、安全间隔期、抗药性提醒、禁止使用药剂等' }
      }
    }
  };

  // 虫害 schema（与病害共用结构，字段名做相应替换）
  const INSECT_SCHEMA = {
    basic: {
      required: ['id', 'name', 'type', 'pathogen', 'hostVarieties'],
      fields: {
        id:            { label: '虫害ID',       type: 'text',     placeholder: '如：I-001' },
        name:          { label: '虫害标准名称', type: 'text',     placeholder: '如：柑橘红蜘蛛' },
        aliases:       { label: '别名',         type: 'text',     required: false, placeholder: '多个别名用 / 分隔' },
        type:          { label: '虫害分类',     type: 'select',   options: INSECT_TYPE_OPTIONS },
        pathogen:      { label: '虫原/形态',    type: 'textarea', rows: 2, placeholder: '学名、形态特征、世代' },
        hostVarieties: { label: '危害柑橘品种', type: 'chips',    options: VARIETY_OPTIONS }
      }
    },
    symptom: {
      required: ['parts', 'leafSymptom', 'fruitSymptom', 'branchSymptom', 'typicalFeature'],
      fields: {
        parts:          { label: '危害部位',     type: 'chips', options: PART_OPTIONS },
        leafSymptom:    { label: '叶片危害',     type: 'textarea', rows: 2, placeholder: '叶片失绿、卷曲、虫道、缺刻等' },
        fruitSymptom:   { label: '果实危害',     type: 'textarea', rows: 2, placeholder: '果皮伤痕、蛀孔、蜜露污染等；无则填"无危害果实"' },
        branchSymptom:  { label: '枝干/根系危害',type: 'textarea', rows: 2, placeholder: '蛀干、根部啃食等；无则填"无明显危害"' },
        typicalFeature: { label: '典型识别特征', type: 'textarea', rows: 2, placeholder: '形态特征、为害状等关键识别点', highlight: true },
        confusedWith:   { label: '易混淆虫害',   type: 'text', required: false, placeholder: '关联虫害ID，用 / 分隔' }
      }
    },
    condition: {
      required: ['peakSeason', 'environment', 'transmission'],
      fields: {
        peakSeason:  { label: '高发时期',   type: 'chips', options: PHENOLOGY_OPTIONS },
        monthNote:   { label: '月份备注',   type: 'text', required: false, placeholder: '如：4-6月、9-11月' },
        environment: { label: '适宜环境',   type: 'textarea', rows: 2, placeholder: '温度、湿度、干湿条件等' },
        transmission:{ label: '传播/扩散方式',type: 'textarea', rows: 2, placeholder: '迁飞、爬行、风力扩散、随苗木调运等' },
        trigger:     { label: '大发生诱因', type: 'textarea', rows: 2, required: false, placeholder: '天敌数量少、气候适宜、滥用农药等' }
      }
    },
    control: {
      required: ['agriControl', 'bioControl', 'chemControl', 'keyPeriod'],
      fields: {
        agriControl: { label: '农业防治',     type: 'textarea', rows: 3, placeholder: '清园、修剪、合理密植等' },
        bioControl:  { label: '物理/生物防治', type: 'textarea', rows: 2, placeholder: '诱杀、保护天敌、生物菌剂等' },
        chemControl: { label: '化学防治',     type: 'textarea', rows: 3, placeholder: '药剂名称、使用时期、注意事项', warning: '为规避合规风险，请勿填写具体剂量（如克、毫升等数值）。' },
        keyPeriod:   { label: '防治关键节点', type: 'textarea', rows: 2, placeholder: '如：新梢抽发期、谢花幼果期' },
        notes:       { label: '注意事项',     type: 'textarea', rows: 2, required: false, placeholder: '避开花期、安全间隔期、抗药性提醒等' }
      }
    }
  };

  // 公共辅助字段
  const EXTRA_FIELDS = {
    harmLevel:    { label: '危害等级', type: 'select', options: HARM_LEVEL_OPTIONS, required: false },
    lossImpact:   { label: '损失影响', type: 'textarea', rows: 2, required: false, placeholder: '落果、品质下降、树体死亡、绝收' },
    source:       { label: '来源依据', type: 'text', required: false, placeholder: '如：《柑橘病虫害防治手册》' },
    status:       { label: '状态',     type: 'select', options: STATUS_OPTIONS, default: '启用' },
    images:       { label: '图片',     type: 'images', required: false, maxCount: 8 }
  };

  // ============================================================
  // 3. 校验工具
  // ============================================================

  /**
   * 校验表单数据
   * @param {object} schema - DISEASE_SCHEMA 或 INSECT_SCHEMA
   * @param {object} data - 表单数据
   * @returns {{ok: boolean, missing: string[], firstMissing: string|null}}
   */
  function validate(schema, data) {
    const missing = [];
    FORM_TABS.forEach(function (tab) {
      const tabSchema = schema[tab.key];
      if (!tabSchema || !tabSchema.required) return;
      tabSchema.required.forEach(function (key) {
        const v = data[key];
        if (v === undefined || v === null) { missing.push(tabSchema.fields[key].label); return; }
        if (typeof v === 'string' && v.trim() === '') { missing.push(tabSchema.fields[key].label); return; }
        if (Array.isArray(v) && v.length === 0) { missing.push(tabSchema.fields[key].label); }
      });
    });
    return {
      ok: missing.length === 0,
      missing: missing,
      firstMissing: missing[0] || null
    };
  }

  // ============================================================
  // 4. 模态工具
  // ============================================================

  function showModal(id) {
    const m = document.getElementById(id);
    if (m) { m.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
  }
  function hideModal(id) {
    const m = document.getElementById(id);
    if (m) { m.style.display = 'none'; document.body.style.overflow = ''; }
  }

  // ============================================================
  // 5. 通用表单渲染（4-Tab）
  // ============================================================

  /**
   * 渲染 Tab 头按钮组（用于填入 #form-tabs 容器）
   * @returns {string}
   */
  function renderFormTabs() {
    return FORM_TABS.map(function (t, idx) {
      const active = idx === 0;
      return `<button type="button" data-tab="${t.key}" class="form-tab-btn px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${active ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${t.icon}"/></svg>
        ${t.label}
      </button>`;
    }).join('');
  }

  /**
   * 渲染 Tab 面板内容（用于填入 #form-body 容器）
   * @param {object} schema - DISEASE_SCHEMA 或 INSECT_SCHEMA
   * @param {object} data - 回填数据
   * @param {string} mode - 'add' | 'edit' | 'detail'
   * @returns {string}
   */
  function renderFormPanels(schema, data, mode) {
    data = data || {};
    const isReadonly = mode === 'detail';
    return FORM_TABS.map(function (t, idx) {
      // 图片 Tab 走专门逻辑
      if (t.key === 'images') {
        const hidden = idx === 0 ? '' : 'hidden';
        return '<div class="form-tab-panel ' + hidden + '" data-panel="images">' +
               renderImagesSection(data.images || [], isReadonly) +
               '</div>';
      }
      const tabSchema = schema[t.key];
      if (!tabSchema) return '';
      let body = '';
      Object.keys(tabSchema.fields).forEach(function (key) {
        const f = tabSchema.fields[key];
        const v = data[key] !== undefined ? data[key] : '';
        const fieldHtml = renderField(key, f, v, isReadonly);
        const warningHtml = f.warning
          ? `<p class="text-xs text-amber-600 mt-1 flex items-start gap-1"><svg class="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.66 1.732-3L13.732 4c-.77-1.34-2.694-1.34-3.464 0L3.34 16c-.77 1.34.192 3 1.732 3z"/></svg>${f.warning}</p>`
          : '';
        body += fieldHtml + warningHtml;
      });
      const hidden = idx === 0 ? '' : 'hidden';
      return `<div class="form-tab-panel ${hidden}" data-panel="${t.key}">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${body}</div>
      </div>`;
    }).join('');
  }

  /**
   * 渲染图片素材 Tab 面板
   * @param {string[]} images - 图片 URL 列表
   * @param {boolean} isReadonly - 查看模式只读
   * @returns {string}
   */
  function renderImagesSection(images, isReadonly) {
    const list = Array.isArray(images) ? images : [];
    const MAX = 8;
    const grid = list.map(function (url, idx) {
      const safe = (url || '').replace(/'/g, "\\'");
        // data-img-url 放在外层 div 上，方便取；删除按钮由页面 saveForm 处理
        const thumb = '<img src="' + url + '" alt="图片' + (idx + 1) + '" class="w-full h-28 object-cover rounded-md border border-gray-200 bg-gray-50 cursor-pointer" onclick="window.__previewFormImage(\'' + safe + '\')" onerror="this.style.display=\'none\'" />';
        const delBtn = isReadonly
          ? ''
          : '<button type="button" onclick="window.__removeFormImage(' + idx + ')" class="absolute top-1 right-1 w-7 h-7 rounded-full bg-red-500 text-white text-xs hover:bg-red-600 shadow flex items-center justify-center" title="删除图片">×</button>';
        const cover = '<div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition rounded-md flex items-center justify-center pointer-events-none">' +
                      '<span class="text-white text-xs opacity-0 hover:opacity-100">预览</span></div>';
        return '<div class="relative group">' + thumb + delBtn + cover + '</div>';
      }).join('');

    const emptyState = '<div class="col-span-full text-center py-10 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">暂无图片，点击下方按钮或拖拽上传</div>';

    const uploadArea = isReadonly
      ? ''
      : '<div class="mt-3 flex items-center gap-3 flex-wrap">' +
        '<label class="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm cursor-pointer hover:bg-green-700">' +
        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>' +
        '上传图片' +
        '<input type="file" multiple accept="image/*" class="hidden" onchange="window.__handleFormImages(this.files)" />' +
        '</label>' +
        '<span class="text-xs text-gray-500" data-image-counter>共 ' + list.length + ' / ' + MAX + ' 张（最多 ' + MAX + ' 张）</span>' +
        '</div>';

    return '<div class="space-y-3">' +
           '<p class="text-sm text-gray-600">用于在卡片上展示典型症状/形态。建议上传早期/中期/严重期/防治后 4 张代表图片。</p>' +
           '<div class="grid grid-cols-2 md:grid-cols-4 gap-3" data-images-grid>' + (list.length ? grid : emptyState) + '</div>' +
           uploadArea +
           '</div>';
  }

  /**
   * 兼容旧调用：返回 Tabs HTML + Panels HTML 拼接（不推荐，请改用 renderFormTabs / renderFormPanels）
   */
  function renderFormModal(schema, data, mode) {
    return renderFormTabs() + renderFormPanels(schema, data, mode);
  }

  function renderField(key, f, v, isReadonly) {
    const ro = isReadonly ? 'readonly' : '';
    const dis = isReadonly ? 'disabled' : '';
    const baseInputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-600';
    const fullSpanCls = f.type === 'textarea' || f.type === 'images' ? 'md:col-span-2' : '';
    const labelHtml = `<label class="block text-sm font-medium text-gray-700 mb-1">${f.label}${f.required ? '' : '<span class="text-gray-400 text-xs ml-1">(可选)</span>'}<span class="text-red-500 ml-1">*</span></label>`;

    let inputHtml = '';
    if (f.type === 'select') {
      const opts = f.options.map(function (o) {
        return `<option value="${o}" ${v === o ? 'selected' : ''}>${o}</option>`;
      }).join('');
      inputHtml = `<select data-field="${key}" ${dis} class="${baseInputCls}">${opts}</select>`;
    } else if (f.type === 'textarea') {
      inputHtml = `<textarea data-field="${key}" rows="${f.rows || 3}" placeholder="${f.placeholder || ''}" ${ro} class="${baseInputCls} resize-y">${escapeHtml(v)}</textarea>`;
    } else if (f.type === 'chips') {
      const chipsHtml = (f.options || []).map(function (o) {
        const checked = Array.isArray(v) && v.indexOf(o) !== -1;
        return `<label class="inline-flex items-center px-3 py-1 border ${checked ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 text-gray-700 bg-white'} rounded-full text-xs cursor-pointer hover:border-green-400">
          <input type="checkbox" data-chip-field="${key}" value="${o}" ${checked ? 'checked' : ''} ${dis} class="hidden">
          <span>${o}</span>
        </label>`;
      }).join('');
      // chips 也保留一个隐藏的 JSON 容器用于序列化
      inputHtml = `<div data-chips-field="${key}" class="flex flex-wrap gap-2">${chipsHtml}</div>
                   <input type="hidden" data-field="${key}" value='${escapeAttr(Array.isArray(v) ? v.join(',') : '')}'>`;
    } else if (f.type === 'images') {
      inputHtml = `<div data-images-field="${key}" class="space-y-2">
        <input type="file" multiple accept="image/*" ${dis} class="${baseInputCls}">
        <div class="grid grid-cols-4 gap-2" data-images-preview></div>
      </div>`;
    } else {
      inputHtml = `<input type="text" data-field="${key}" value="${escapeAttr(v)}" placeholder="${f.placeholder || ''}" ${ro} class="${baseInputCls}">`;
    }

    return `<div class="${fullSpanCls}">${labelHtml}${inputHtml}${f.hint ? `<p class="text-xs text-gray-400 mt-1">${f.hint}</p>` : ''}</div>`;
  }

  // ============================================================
  // 6. 表单数据收集与回填
  // ============================================================

  function collectFormData() {
    const data = {};
    document.querySelectorAll('[data-field]').forEach(function (el) {
      const key = el.getAttribute('data-field');
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' && el.type === 'hidden') {
        // chips 隐藏字段
        data[key] = el.value ? el.value.split(',').filter(Boolean) : [];
      } else if (tag === 'input' || tag === 'textarea') {
        data[key] = el.value;
      } else if (tag === 'select') {
        data[key] = el.value;
      }
    });
    return data;
  }

  function collectChipData() {
    // chips 字段以 checkbox 状态为准，回写到 hidden
    document.querySelectorAll('[data-chips-field]').forEach(function (wrap) {
      const key = wrap.getAttribute('data-chips-field');
      const checked = [];
      wrap.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) { checked.push(cb.value); });
      const hidden = wrap.parentElement.querySelector('input[data-field="' + key + '"]');
      if (hidden) hidden.value = checked.join(',');
    });
  }

  // ============================================================
  // 7. HTML 转义
  // ============================================================

  function escapeHtml(s) {
    if (s === undefined || s === null) return '';
    return String(s).replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }
  function escapeAttr(s) {
    if (s === undefined || s === null) return '';
    return String(s).replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  // ============================================================
  // 8. 类型色 / 风险色
  // ============================================================

  function getTypeColor(type, kind) {
    // kind: 'disease' | 'insect'
    const map = kind === 'disease'
      ? {
          '真菌性': 'bg-orange-100 text-orange-700',
          '细菌性': 'bg-blue-100 text-blue-700',
          '病毒性': 'bg-red-100 text-red-700',
          '生理性': 'bg-purple-100 text-purple-700',
          '药害':   'bg-gray-100 text-gray-700',
          '缺素':   'bg-yellow-100 text-yellow-700'
        }
      : {
          '螨类': 'bg-green-100 text-green-700',
          '蛾类': 'bg-purple-100 text-purple-700',
          '虱类': 'bg-blue-100 text-blue-700',
          '其他': 'bg-orange-100 text-orange-700'
        };
    return map[type] || 'bg-gray-100 text-gray-700';
  }

  function getTypeBgColor(type, kind) {
    const map = kind === 'disease'
      ? {
          '真菌性': 'bg-orange-100',
          '细菌性': 'bg-blue-100',
          '病毒性': 'bg-red-100',
          '生理性': 'bg-purple-100',
          '药害':   'bg-gray-100',
          '缺素':   'bg-yellow-100'
        }
      : {
          '螨类': 'bg-green-100',
          '蛾类': 'bg-purple-100',
          '虱类': 'bg-blue-100',
          '其他': 'bg-orange-100'
        };
    return map[type] || 'bg-gray-100';
  }

  function getHarmLevelColor(level) {
    return level === '重' ? 'text-red' : (level === '中' ? 'text-yellow' : 'text-green');
  }

  // ============================================================
  // 9. 公共模态 HTML（4-Tab 模态 + 删除确认 + 顶部合规说明）
  // ============================================================

  function buildFormModalHtml(modalId, title) {
    return `<div id="${modalId}" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;align-items:center;justify-content:center">
      <div style="background:#fff;border-radius:12px;width:92%;max-width:760px;max-height:88vh;display:flex;flex-direction:column">
        <div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
          <h3 style="font-size:17px;font-weight:600;color:#1f2937" data-form-title>${title}</h3>
          <button type="button" data-form-close style="padding:4px;background:none;border:none;cursor:pointer;font-size:22px;color:#6b7280;line-height:1">&times;</button>
        </div>
        <!-- 顶部合规说明 -->
        <div class="bg-amber-50 border-b border-amber-100 px-5 py-2 text-xs text-amber-700 flex items-start gap-2">
          <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>本知识库用于业务查询与农事指导，<b>请勿填写具体药剂剂量</b>（如克、毫升、ppm 等数值），仅记录药剂名称、使用时期与注意事项，避免合规风险。</span>
        </div>
        <div style="padding:0 20px;border-bottom:1px solid #e5e7eb;flex-shrink:0">
          <div class="flex gap-1 -mb-px" data-form-tabs></div>
        </div>
        <div style="padding:20px;overflow-y:auto;flex:1" data-form-body></div>
        <div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:12px;flex-shrink:0">
          <button type="button" data-form-cancel style="padding:8px 18px;border:1px solid #d1d5db;background:#fff;color:#374151;border-radius:8px;font-size:14px;cursor:pointer">关闭</button>
          <button type="button" data-form-save style="padding:8px 18px;background:#16a34a;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">保存</button>
        </div>
      </div>
    </div>`;
  }

  function buildDeleteModalHtml(modalId, kindLabel) {
    return `<div id="${modalId}" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;align-items:center;justify-content:center">
      <div style="background:#fff;border-radius:12px;width:90%;max-width:400px">
        <div style="padding:20px;text-align:center">
          <div style="width:64px;height:64px;background:#fee2e2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
            <svg style="width:32px;height:32px;color:#ef4444" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.66 1.732-3L13.732 4c-.77-1.34-2.694-1.34-3.464 0L3.34 16c-.77 1.34.192 3 1.732 3z"/></svg>
          </div>
          <h3 style="font-size:18px;font-weight:600;color:#1f2937;margin-bottom:8px">确认删除</h3>
          <p style="font-size:14px;color:#6b7280;margin-bottom:24px">确定要删除${kindLabel} <strong style="color:#1f2937" data-delete-name></strong> 吗？此操作不可撤销。</p>
          <div style="display:flex;justify-content:center;gap:12px">
            <button type="button" data-delete-cancel style="padding:8px 18px;border:1px solid #d1d5db;background:#fff;color:#374151;border-radius:8px;font-size:14px;cursor:pointer">取消</button>
            <button type="button" data-delete-confirm style="padding:8px 18px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">确认删除</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  // ============================================================
  // 12. 通用列表卡片（折叠 5 层：基础/症状/条件/防治/图片）
  // ============================================================

  /**
   * 渲染病害/虫害卡片（统一结构，P2 折叠式）
   * @param {object} d - 数据
   * @param {object} opts - { kind: 'disease'|'insect', actions: { onView, onEdit, onDelete } }
   * @returns {string} HTML
   */
  function renderItemCard(d, opts) {
    opts = opts || {};
    const kind = opts.kind || 'disease';
    const kw = (opts.keyword || '').trim();
    // 本卡片用的文本高亮函数（带转义 + 命中加黄色背景）
    const h = function (text) {
      if (text === undefined || text === null) return '';
      return highlight(String(text), kw);
    };
    const isDisabled = d.status === '禁用';
    const typeColor = getTypeColor(d.type, kind);
    const typeBg = getTypeBgColor(d.type, kind);
    const aliasText = d.aliases ? `<p class="text-xs text-gray-500 mt-0.5">别名：${h(d.aliases)}</p>` : '';

    const a = opts.actions || {};
    const viewAct = a.onView || ('openFormModal(\'' + d.id + '\', \'detail\')');
    const editAct = a.onEdit || ('openFormModal(\'' + d.id + '\', \'edit\')');
    const delAct  = a.onDelete  || ('openDeleteModal(\'' + d.id + '\')');

    const harmBadge = d.harmLevel === '重'
      ? '<span class="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">危害等级：重</span>'
      : d.harmLevel === '中'
        ? '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">危害等级：中</span>'
        : d.harmLevel === '轻'
          ? '<span class="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">危害等级：轻</span>'
          : '<span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">危害等级：未评估</span>';

    const phenologyChips = (d.peakSeason || []).map(function (s) {
      return '<span class="px-1.5 py-0.5 bg-green-50 text-green-700 rounded">' + h(s) + '</span>';
    }).join('');
    const partChips = (d.parts || []).map(function (s) {
      return '<span class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">' + h(s) + '</span>';
    }).join('');
    const varietyChips = (d.hostVarieties || []).map(function (s) {
      return '<span class="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">' + h(s) + '</span>';
    }).join('');

    const hasSymptom = (d.parts && d.parts.length) || d.leafSymptom || d.fruitSymptom || d.branchSymptom;
    const hasCondition = (d.peakSeason && d.peakSeason.length) || d.environment || d.transmission;
    const hasControl = d.agriControl || d.bioControl || d.chemControl;
    const hasImage = d.images && d.images.length;

    const imgHtml = hasImage
      ? '<div class="grid grid-cols-4 gap-2">' + d.images.slice(0, 4).map(function (img, idx) {
          const safe = img.replace(/'/g, "\\'");
          return '<img src="' + img + '" alt="图片' + (idx + 1) + '" class="w-full h-20 object-cover rounded cursor-pointer" onclick="openImagePreview(\'' + safe + '\')" onerror="this.style.display=\'none\'" />';
        }).join('') + '</div>'
      : '<p class="text-xs text-gray-400">暂无图片</p>';

    return `
      <div class="border border-gray-200 rounded-xl hover:border-green-300 hover:shadow-md transition bg-white ${isDisabled ? 'opacity-60' : ''}">
        <!-- 头部：始终可见 -->
        <div class="p-4">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 ${typeBg} rounded-lg flex items-center justify-center flex-shrink-0">
                <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7h-9m0 0V5a3 3 0 016 0v2m-6 0a3 3 0 00-6 0v10a3 3 0 006 0m10-3a2 2 0 11-4 0 2 2 0 014 0zM17 10H7m0 0l3-3m-3 3l3 3"/></svg>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs text-gray-400 font-mono">${h(d.id)}</span>
                  <h3 class="font-semibold text-gray-800">${h(d.name)}</h3>
                  ${isDisabled ? '<span class="px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[10px] rounded">禁用</span>' : ''}
                </div>
                ${aliasText}
                <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span class="px-2 py-0.5 ${typeColor} text-xs rounded">${h(d.type)}</span>
                  ${harmBadge}
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-1 flex-shrink-0">
              <button onclick="${viewAct}" class="px-2 py-1 text-green-600 hover:bg-green-50 rounded text-xs font-medium transition-colors">查看</button>
              <button onclick="${editAct}" class="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs font-medium transition-colors">编辑</button>
              <button onclick="${delAct}" class="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs font-medium transition-colors">删除</button>
            </div>
          </div>
          <!-- 典型识别特征：始终高亮可见 -->
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3">
            <p class="text-xs text-amber-700 font-medium flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              识别特征 · ${phenologyChips || '<span class="text-amber-500/70 font-normal ml-1">未填写</span>'}
            </p>
            <p class="text-sm text-gray-800 mt-1.5 leading-relaxed">${h(d.typicalFeature || '（未填写）')}</p>
            ${d.confusedWith ? '<p class="text-xs text-gray-500 mt-1.5"><span class="text-amber-700">易混淆：</span>' + h(d.confusedWith) + '</p>' : ''}
          </div>
        </div>

        <!-- 折叠层 -->
        <div class="border-t border-gray-100">
          <!-- 基础识别 -->
          <details class="group border-b border-gray-100">
            <summary class="cursor-pointer list-none flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700">
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                基础识别
              </span>
              <svg class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div class="px-4 pb-3 pt-1 text-sm space-y-2">
              <div>
                <span class="text-xs text-gray-500">${kind === 'disease' ? '病原/诱因' : '虫原/形态'}：</span>
                <p class="text-gray-700 mt-0.5 leading-relaxed">${h(d.pathogen || '（未填写）')}</p>
              </div>
              <div>
                <span class="text-xs text-gray-500">危害柑橘品种：</span>
                <div class="flex flex-wrap gap-1 mt-1">${varietyChips || '<span class="text-xs text-gray-400">未填写</span>'}</div>
              </div>
              ${d.aliases ? '<div><span class="text-xs text-gray-500">别名：</span><span class="text-gray-700">' + h(d.aliases) + '</span></div>' : ''}
            </div>
          </details>

          <!-- 症状表现 -->
          <details class="group border-b border-gray-100" ${hasSymptom ? '' : 'disabled'}>
            <summary class="cursor-pointer list-none flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700">
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                症状表现
                <span class="text-xs text-gray-400 font-normal">${partChips || ''}</span>
              </span>
              <svg class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div class="px-4 pb-3 pt-1 space-y-2">
              ${d.parts && d.parts.length ? '<div><span class="text-xs text-gray-500">发病部位：</span><div class="flex flex-wrap gap-1 mt-1">' + partChips + '</div></div>' : ''}
              ${d.leafSymptom   ? '<div><span class="text-xs text-gray-500">' + (kind === 'disease' ? '叶片症状' : '叶片危害') + '：</span><p class="text-gray-700 mt-0.5 leading-relaxed">' + h(d.leafSymptom) + '</p></div>' : ''}
              ${d.fruitSymptom  ? '<div><span class="text-xs text-gray-500">' + (kind === 'disease' ? '果实症状' : '果实危害') + '：</span><p class="text-gray-700 mt-0.5 leading-relaxed">' + h(d.fruitSymptom) + '</p></div>' : ''}
              ${d.branchSymptom ? '<div><span class="text-xs text-gray-500">' + (kind === 'disease' ? '枝干/根系症状' : '枝干/根系危害') + '：</span><p class="text-gray-700 mt-0.5 leading-relaxed">' + h(d.branchSymptom) + '</p></div>' : ''}
              ${hasSymptom ? '' : '<p class="text-xs text-gray-400">暂无症状数据</p>'}
            </div>
          </details>

          <!-- 发生条件 -->
          <details class="group border-b border-gray-100" ${hasCondition ? '' : ''}>
            <summary class="cursor-pointer list-none flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700">
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
                发生条件
                <span class="text-xs text-gray-400 font-normal">${d.monthNote ? h(d.monthNote) : ''}</span>
              </span>
              <svg class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div class="px-4 pb-3 pt-1 space-y-2">
              ${d.peakSeason && d.peakSeason.length ? '<div><span class="text-xs text-gray-500">高发时期：</span><div class="flex flex-wrap gap-1 mt-1">' + phenologyChips + (d.monthNote ? '<span class="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">' + h(d.monthNote) + '</span>' : '') + '</div></div>' : ''}
              ${d.environment  ? '<div><span class="text-xs text-gray-500">适宜环境：</span><p class="text-gray-700 mt-0.5 leading-relaxed">' + h(d.environment) + '</p></div>' : ''}
              ${d.transmission ? '<div><span class="text-xs text-gray-500">' + (kind === 'disease' ? '传播途径' : '传播/扩散方式') + '：</span><p class="text-gray-700 mt-0.5 leading-relaxed">' + h(d.transmission) + '</p></div>' : ''}
              ${d.trigger      ? '<div><span class="text-xs text-gray-500">' + (kind === 'disease' ? '发病诱因' : '大发生诱因') + '：</span><p class="text-gray-700 mt-0.5 leading-relaxed">' + h(d.trigger) + '</p></div>' : ''}
              ${hasCondition ? '' : '<p class="text-xs text-gray-400">暂无条件数据</p>'}
            </div>
          </details>

          <!-- 防治方案 -->
          <details class="group border-b border-gray-100" ${hasControl ? '' : ''}>
            <summary class="cursor-pointer list-none flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700">
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                防治方案
                ${d.notes ? '<span class="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded">有注意事项</span>' : ''}
              </span>
              <svg class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div class="px-4 pb-3 pt-1 space-y-2.5">
              ${d.agriControl ? '<div><p class="text-xs text-green-700 font-medium flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>农业防治</p><p class="text-sm text-gray-700 mt-1 leading-relaxed whitespace-pre-line">' + h(d.agriControl) + '</p></div>' : ''}
              ${d.bioControl  ? '<div><p class="text-xs text-blue-700 font-medium flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>物理/生物防治</p><p class="text-sm text-gray-700 mt-1 leading-relaxed">' + h(d.bioControl) + '</p></div>' : ''}
              ${d.chemControl ? '<div><p class="text-xs text-red-700 font-medium flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.66 1.732-3L13.732 4c-.77-1.34-2.694-1.34-3.464 0L3.34 16c-.77 1.34.192 3 1.732 3z"/></svg>化学防治</p><p class="text-sm text-gray-700 mt-1 leading-relaxed">' + h(d.chemControl) + '</p></div>' : ''}
              ${d.keyPeriod   ? '<div><p class="text-xs text-purple-700 font-medium">防治关键节点</p><p class="text-sm text-gray-700 mt-1 leading-relaxed">' + h(d.keyPeriod) + '</p></div>' : ''}
              ${d.notes       ? '<div class="bg-amber-50 border border-amber-100 rounded p-2"><p class="text-xs text-amber-700 font-medium">⚠ 注意事项</p><p class="text-xs text-gray-700 mt-1 leading-relaxed">' + h(d.notes) + '</p></div>' : ''}
            </div>
          </details>

          <!-- 图片 -->
          ${hasImage ? `<details class="group">
            <summary class="cursor-pointer list-none flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700">
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4L11 14m0 0l3-3 4 4m-4-4l-3 3M3 6h18M3 6v12a2 2 0 002 2h14a2 2 0 002-2V6"/></svg>
                图片素材
                <span class="text-xs text-gray-400 font-normal">${d.images.length} 张</span>
              </span>
              <svg class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div class="px-4 pb-4 pt-1">${imgHtml}</div>
          </details>` : ''}

          ${d.source ? '<div class="px-4 py-2 border-t border-gray-100 bg-gray-50/50 text-[11px] text-gray-400 flex items-center justify-between"><span>来源：' + h(d.source) + '</span><span>更新于 ' + h(d.updatedAt || '-') + '</span></div>' : ''}
        </div>
      </div>
    `;
  }

  // ============================================================
  // 13. 全文检索 / 多维筛选（命中高亮）
  // ============================================================

  /**
   * 文本高亮：转义后用 <mark> 包裹命中片段（黄色背景）
   * @param {string} text
   * @param {string} keyword
   */
  function highlight(text, keyword) {
    const safe = escapeHtml(text);
    if (!keyword) return safe;
    let kw = String(keyword).trim();
    if (!kw) return safe;
    // 转义正则特殊字符
    const escKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 大小写不敏感 + 中文兼容
    const re = new RegExp(escKw, 'gi');
    return safe.replace(re, function (m) {
      return '<mark class="bg-yellow-200 text-gray-900 px-0.5 rounded">' + m + '</mark>';
    });
  }

  /**
   * 全文检索 + 多维筛选
   * @param {Array} list - 数据列表
   * @param {string} keyword - 检索词
   * @param {object} filters - { type, parts[], peakSeason[], harmLevel, status }
   * @returns {Array} 命中结果
   */
  function searchItems(list, keyword, filters) {
    keyword = (keyword || '').trim().toLowerCase();
    filters = filters || {};

    return (list || []).filter(function (d) {
      // 1. 全文检索：检索所有可能的长文本字段
      if (keyword) {
        const haystack = [
          d.id, d.name, d.aliases,
          d.type, d.pathogen, d.typicalFeature, d.confusedWith,
          d.leafSymptom, d.fruitSymptom, d.branchSymptom,
          d.environment, d.transmission, d.trigger, d.monthNote,
          d.agriControl, d.bioControl, d.chemControl, d.keyPeriod, d.notes,
          d.harmLevel, d.lossImpact, d.source, d.status,
          d.hostVarieties || [], d.parts || [], d.peakSeason || []
        ].map(function (x) {
          return Array.isArray(x) ? x.join(' ') : String(x || '');
        }).join(' ').toLowerCase();
        if (haystack.indexOf(keyword) === -1) return false;
      }
      // 2. 类型筛选
      if (filters.type && d.type !== filters.type) return false;
      // 3. 部位筛选（多选）
      if (filters.parts && filters.parts.length) {
        if (!d.parts || !filters.parts.some(function (p) { return d.parts.indexOf(p) !== -1; })) return false;
      }
      // 4. 物候期筛选（多选）
      if (filters.peakSeason && filters.peakSeason.length) {
        if (!d.peakSeason || !filters.peakSeason.some(function (p) { return d.peakSeason.indexOf(p) !== -1; })) return false;
      }
      // 5. 危害等级
      if (filters.harmLevel && d.harmLevel !== filters.harmLevel) return false;
      // 6. 状态
      if (filters.status && d.status !== filters.status) return false;
      return true;
    });
  }

  /**
   * 渲染"检索结果摘要"
   * @param {string} keyword
   * @param {number} total 命中数
   * @returns {string}
   */
  function renderSearchSummary(keyword, total, allCount) {
    if (!keyword && total === allCount) return '';
    const k = keyword ? '<span class="text-gray-700">关键词：</span><span class="font-medium text-gray-900 mx-1">' + escapeHtml(keyword) + '</span>' : '';
    return '<div class="text-xs text-gray-500 mb-3 px-1 flex items-center gap-3 flex-wrap">'
      + '<span class="text-gray-700">共 <b class="text-gray-900">' + total + '</b> / ' + allCount + ' 条记录</span>'
      + k
      + '</div>';
  }

  // ============================================================
  // 10. Tab 切换
  // ============================================================

  function bindFormTabs(root) {
    const modal = root || document;
    // 用事件委托，避免 innerHTML 重建后丢失 listener
    if (modal._formTabDelegated) return; // 只绑一次
    modal._formTabDelegated = true;
    modal.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('.form-tab-btn');
      if (!btn || !modal.contains(btn)) return;
      var key = btn.getAttribute('data-tab');
      if (!key) return;
      var tabBtns = modal.querySelectorAll('#form-tabs .form-tab-btn');
      var panels = modal.querySelectorAll('#form-body .form-tab-panel');
      for (var i = 0; i < tabBtns.length; i++) {
        var b = tabBtns[i];
        b.classList.remove('border-green-600', 'text-green-600');
        b.classList.add('border-transparent', 'text-gray-500');
      }
      btn.classList.remove('border-transparent', 'text-gray-500');
      btn.classList.add('border-green-600', 'text-green-600');
      for (var j = 0; j < panels.length; j++) {
        var p = panels[j];
        var match = p.getAttribute('data-panel') === key;
        if (match) p.classList.remove('hidden');
        else p.classList.add('hidden');
      }
    });

    // chip 点击切换样式
    root.querySelectorAll('[data-chips-field] label').forEach(function (lab) {
      lab.addEventListener('click', function () {
        if (lab.querySelector('input').disabled) return;
        setTimeout(function () {
          const checked = lab.querySelector('input').checked;
          lab.classList.toggle('border-green-500', checked);
          lab.classList.toggle('bg-green-50', checked);
          lab.classList.toggle('text-green-700', checked);
          lab.classList.toggle('border-gray-300', !checked);
          lab.classList.toggle('text-gray-700', !checked);
          lab.classList.toggle('bg-white', !checked);
          collectChipData();
        }, 0);
      });
    });
  }

  // ============================================================
  // 11. 导出
  // ============================================================

  global.DBCommon = {
    PHENOLOGY_OPTIONS: PHENOLOGY_OPTIONS,
    PART_OPTIONS: PART_OPTIONS,
    HARM_LEVEL_OPTIONS: HARM_LEVEL_OPTIONS,
    STATUS_OPTIONS: STATUS_OPTIONS,
    VARIETY_OPTIONS: VARIETY_OPTIONS,
    FORM_TABS: FORM_TABS,
    DISEASE_SCHEMA: DISEASE_SCHEMA,
    INSECT_SCHEMA: INSECT_SCHEMA,
    EXTRA_FIELDS: EXTRA_FIELDS,
    validate: validate,
    showModal: showModal,
    hideModal: hideModal,
    renderFormModal: renderFormModal,
    renderFormTabs: renderFormTabs,
    renderFormPanels: renderFormPanels,
    renderImagesSection: renderImagesSection,
    renderField: renderField,
    collectFormData: collectFormData,
    collectChipData: collectChipData,
    bindFormTabs: bindFormTabs,
    escapeHtml: escapeHtml,
    escapeAttr: escapeAttr,
    getTypeColor: getTypeColor,
    getTypeBgColor: getTypeBgColor,
    getHarmLevelColor: getHarmLevelColor,
    buildFormModalHtml: buildFormModalHtml,
    buildDeleteModalHtml: buildDeleteModalHtml,
    renderItemCard: renderItemCard,
    highlight: highlight,
    searchItems: searchItems,
    renderSearchSummary: renderSearchSummary
  };
})(window);