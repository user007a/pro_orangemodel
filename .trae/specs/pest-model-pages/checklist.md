# 病虫害模型子页面体系 - 验证清单

## 侧边栏与导航
- [x] Checkpoint 1: index.html 侧边栏"病虫害模型"菜单下显示8个子菜单项（模型说明、监测数据、参数配置、预测计算、风险诊断、预测报告、数据校准、防控方案配置）
- [x] Checkpoint 2: 每个子菜单项点击后正确跳转到对应页面
- [x] Checkpoint 3: 子菜单图标与功能语义匹配

## 模型说明页面 (pest_model.html)
- [x] Checkpoint 4: 页面展示统一预测公式 Pd(t+h) 和 Cd(v)，而非AI检测模型列表
- [x] Checkpoint 5: 页面展示8大要素说明卡片
- [x] Checkpoint 6: 6种病虫害对比表（关键因子、主要耦合、时间窗口）数据与memo第6节一致
- [x] Checkpoint 7: 模型核心逻辑流程图完整展示
- [x] Checkpoint 8: 统计概览卡片（监测区域、病虫害种类、预警数）正确显示
- [x] Checkpoint 9: "刷新状态"按钮功能正常
- [x] Checkpoint 10: "模型说明"按钮可打开 pest_model_memo.html

## 监测数据管理页面 (pest_data.html)
- [x] Checkpoint 11: 5个Tab（气象数据、物候数据、病情虫情、虫源基数、历史数据）均可切换
- [x] Checkpoint 12: 每个Tab的数据录入表单字段完整
- [x] Checkpoint 13: 数据列表支持新增/编辑/删除操作
- [x] Checkpoint 14: 乡镇筛选功能正常
- [x] Checkpoint 15: 数据可视化图表正确展示
- [x] Checkpoint 16: Mock数据使用南丰县12个乡镇名称

## 模型参数配置页面 (pest_params.html)
- [x] Checkpoint 17: 4个Tab（因子权重、耦合系数、时间窗口、θ权重）均可切换
- [x] Checkpoint 18: 参数按6种病虫害分组展示
- [x] Checkpoint 19: 参数编辑保存功能正常
- [x] Checkpoint 20: 参数数据与memo算法描述一致

## 预测计算引擎页面 (pest_engine.html)
- [x] Checkpoint 21: 3个Tab（计算调度、手动计算、计算日志）均可切换
- [x] Checkpoint 22: 7步计算流程可视化展示
- [x] Checkpoint 23: 每步计算可独立执行并显示中间结果
- [x] Checkpoint 24: 单乡镇/批量计算模式可切换
- [x] Checkpoint 25: 定时任务配置功能正常

## 风险诊断分析页面 (pest_diagnosis.html)
- [x] Checkpoint 26: 3个Tab（因子归因、耦合分析、传播追踪）均可切换
- [x] Checkpoint 27: 主要风险因子排名正确展示
- [x] Checkpoint 28: 耦合贡献分析图表正确
- [x] Checkpoint 29: 传播来源追踪逻辑合理
- [x] Checkpoint 30: 风险等级标注正确

## 预测报告页面 (pest_report.html)
- [x] Checkpoint 31: 3个Tab（3天预测、7天预测、历史报告）均可切换
- [x] Checkpoint 32: 各乡镇发生概率列表正确展示
- [x] Checkpoint 33: 风险等级分布可视化正确
- [x] Checkpoint 34: 重点风险乡镇列表完整
- [x] Checkpoint 35: 防控建议清单按优先级排序

## 模型校准页面 (pest_calibration.html)
- [x] Checkpoint 36: 历史数据对比图表正确展示预测vs实际
- [x] Checkpoint 37: 模型精度指标（准确率、召回率、F1）正确计算
- [x] Checkpoint 38: 参数微调功能正常
- [x] Checkpoint 39: 校准前后对比图表清晰

## 防控方案配置页面 (pest_scheme.html)
- [x] Checkpoint 40: 按病虫害类型分组展示方案
- [x] Checkpoint 41: 方案表单字段完整（防控措施、优先级、复查周期、复查指标）
- [x] Checkpoint 42: 方案CRUD操作正常
- [x] Checkpoint 43: 方案启停状态管理正常

## 视觉与交互一致性
- [x] Checkpoint 44: 所有子页面视觉风格与生长模型子页面一致
- [x] Checkpoint 45: Tailwind CSS + Chart.js 正确引入
- [x] Checkpoint 46: content-wrapper 布局模式统一
- [x] Checkpoint 47: Modal 弹窗 max-height: 85vh, 0.3s ease 动画
- [x] Checkpoint 48: 响应式布局正常（1200px+宽度）
- [x] Checkpoint 49: 所有操作按钮使用文字标签
- [x] Checkpoint 50: Mock数据符合南丰县病虫害发生实际情况
