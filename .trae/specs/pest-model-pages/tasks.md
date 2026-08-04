# 病虫害模型子页面体系 - 实现计划

## [x] Task 1: 更新侧边栏导航结构
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `index.html` 的"病虫害模型"菜单下添加7个子菜单项
  - 子菜单项：监测数据、参数配置、预测计算、风险诊断、预测报告、数据校准、防控方案配置
  - 创建 `html/backhand/pest/` 目录
  - 菜单项路径指向新目录下的页面
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: 侧边栏"病虫害模型"菜单展开后显示8个子菜单项
  - `programmatic` TR-1.2: 每个子菜单项的 onclick 事件指向正确的页面路径
  - `human-judgement` TR-1.3: 菜单图标与功能语义匹配

## [x] Task 2: 重构模型说明页面 (pest_model.html)
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 移除原有10个AI检测模型列表内容
  - 展示统一预测公式 Pd(t+h) 和 Cd(v)
  - 展示8大要素说明卡片
  - 展示6种病虫害参数对比表（关键因子、主要耦合、时间窗口）
  - 展示模型核心逻辑流程图
  - 展示统计概览卡片（监测区域、病虫害种类、预警数）
  - 保留"刷新状态"和"模型说明"按钮
  - 保留打开 pest_model_memo.html 的链接
- **Acceptance Criteria Addressed**: AC-1, AC-4
- **Test Requirements**:
  - `programmatic` TR-2.1: 页面不再包含AI检测模型列表内容
  - `programmatic` TR-2.2: 页面展示统一预测公式和Cd耦合公式
  - `programmatic` TR-2.3: 6种病虫害对比表数据与memo第6节一致
  - `human-judgement` TR-2.4: 页面视觉风格与生长模型说明页一致

## [x] Task 3: 创建监测数据管理页面 (pest_data.html)
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - Tab切换：气象数据、物候数据、病情虫情、虫源基数、历史数据
  - 每个Tab展示对应的数据录入表单和数据列表
  - 支持按乡镇/日期筛选
  - 数据可视化：气象趋势图、物候分布图、虫情热力图
  - Mock数据使用南丰县12个乡镇的真实数据
- **Acceptance Criteria Addressed**: AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-3.1: 5个Tab页面均可切换且内容正确
  - `programmatic` TR-3.2: 数据列表支持新增/编辑/删除操作
  - `human-judgement` TR-3.3: 图表展示清晰，数据合理

## [x] Task 4: 创建模型参数配置页面 (pest_params.html)
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - Tab切换：因子权重(w)配置、耦合系数(β/γ)配置、时间窗口(L/h)配置、θ权重配置
  - 按病虫害类型（红蜘蛛、黄龙病、炭疽病、潜叶蛾、溃疡病、疮痂病）分组
  - 参数编辑表单，支持实时保存
  - 参数变更历史记录
  - 每种病虫害的参数基于memo第6节的表格数据
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: 参数配置与memo算法描述一致
  - `programmatic` TR-4.2: 参数编辑后立即生效（前端状态更新）
  - `human-judgement` TR-4.3: 参数分组清晰，编辑体验流畅

## [x] Task 5: 创建预测计算引擎页面 (pest_engine.html)
- **Priority**: high
- **Depends On**: Task 3, Task 4
- **Description**: 
  - Tab切换：计算调度、手动计算、计算日志
  - 7步计算流程可视化：输入数据→适宜度计算→耦合计算→时间累积→虫源/历史/传播修正→概率校准→输出预测
  - 每步展示中间计算结果
  - 支持单乡镇/批量计算
  - 定时任务配置（每日自动执行）
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-5.1: 7步计算流程可逐步执行
  - `programmatic` TR-5.2: 每步计算结果正确显示
  - `human-judgement` TR-5.3: 流程可视化清晰直观

## [x] Task 6: 创建风险诊断分析页面 (pest_diagnosis.html)
- **Priority**: high
- **Depends On**: Task 5
- **Description**: 
  - Tab切换：因子归因、耦合分析、传播追踪
  - 主要风险因子排名（按贡献度排序）
  - 两因子/三因子耦合贡献分析图表
  - 空间传播来源追踪（邻接乡镇、主导风向）
  - 历史累积影响分析
  - 风险等级标注
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-6.1: 风险因子排名可动态更新
  - `programmatic` TR-6.2: 耦合分析图表正确展示
  - `human-judgement` TR-6.3: 诊断分析逻辑清晰

## [x] Task 7: 创建预测报告页面 (pest_report.html)
- **Priority**: high
- **Depends On**: Task 5
- **Description**: 
  - Tab切换：3天预测、7天预测、历史报告
  - 各乡镇发生概率列表（按病虫害类型分Tab）
  - 风险等级分布（低/中/高/极高）可视化
  - 重点风险乡镇列表
  - 防控建议清单（按优先级排序）
  - 支持报告导出（模拟功能）
- **Acceptance Criteria Addressed**: AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-7.1: 3天和7天预测数据独立展示
  - `programmatic` TR-7.2: 风险等级分布可视化正确
  - `human-judgement` TR-7.3: 报告内容完整，可读性强

## [x] Task 8: 创建模型校准页面 (pest_calibration.html)
- **Priority**: medium
- **Depends On**: Task 5
- **Description**: 
  - 历史数据对比图表（预测值 vs 实际值）
  - 模型精度指标卡片（准确率、召回率、F1）
  - 参数微调表单
  - 校准前后对比图表
  - 校准进度条
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-8.1: 校准图表正确展示预测vs实际对比
  - `human-judgement` TR-8.2: 精度指标展示清晰

## [x] Task 9: 创建防控方案配置页面 (pest_scheme.html)
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 按病虫害类型配置防控方案
  - 方案表单：防控措施、优先级、复查周期、复查指标
  - 方案启停状态管理
  - 方案版本记录
  - 方案与预警等级关联
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-9.1: 每种病虫害可配置独立方案
  - `programmatic` TR-9.2: 方案CRUD操作正常
  - `human-judgement` TR-9.3: 方案表单布局清晰

## [x] Task 10: 视觉一致性与整体验证
- **Priority**: high
- **Depends On**: Task 2-9
- **Description**: 
  - 检查所有子页面的视觉风格一致性
  - 检查响应式布局
  - 检查交互功能完整性
  - 验证Mock数据合理性
- **Acceptance Criteria Addressed**: AC-3, AC-6
- **Test Requirements**:
  - `human-judgement` TR-10.1: 所有页面视觉风格与生长模型子页面一致
  - `human-judgement` TR-10.2: 响应式布局正常
  - `programmatic` TR-10.3: 所有交互功能正常
