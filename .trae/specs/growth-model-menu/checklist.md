# 南丰蜜桔生长模型管理 - 验证清单

## 菜单结构
- [x] Checkpoint 1: 侧边栏「生长模型」一级菜单位于「模型管理」之后、「数据管理」之前
- [x] Checkpoint 2: 「生长模型」展开后显示6个子菜单：基础档案、因子采集、模型计算、诊断分析、评价报告、数据校准
- [x] Checkpoint 3: 各子菜单点击后iframe正确加载对应页面

## 基础档案管理
- [x] Checkpoint 4: 品系管理Tab展示品系列表，支持新增/编辑/删除
- [x] Checkpoint 5: 地块档案Tab展示地块列表，对象编码自动生成，CRUD完整
- [x] Checkpoint 6: 阶段参数Tab展示6个生育阶段切换，每阶段因子参数完整（最适区间、致命阈值、权重、扣分值）
- [x] Checkpoint 7: Mock数据贴合南丰蜜桔实际（小果系、桂花蒂、枳砧等）

## 因子数据采集
- [x] Checkpoint 8: 物联网实时数据Tab展示温度/湿度/土壤水/光照/降雨等核心因子，支持刷新
- [x] Checkpoint 9: 人工采样录入Tab包含果径、糖度、SPAD、PH、EC、氮磷钾、挂果量等字段
- [x] Checkpoint 10: 农事操作记录Tab支持7类农事类型（灌溉/施肥/疏果/修剪/遮阳/打药/排水）

## 模型计算中心
- [x] Checkpoint 11: 手动计算流程展示8个步骤（S(x)→Gth→E→生长迭代→扣分→评分→诊断→建议）
- [x] Checkpoint 12: 每步展示关键计算数值和公式
- [x] Checkpoint 13: 计算日志记录历史执行信息

## 诊断分析
- [x] Checkpoint 14: 综合评分面板展示总分+健康等级+升降对比
- [x] Checkpoint 15: 六维度雷达图展示PB/PL/PR/PF/PE/PM
- [x] Checkpoint 16: 扣分明细表展示因子、实测值、适宜区间、扣分值
- [x] Checkpoint 17: 因果原因链展示现象→直接原因→深层诱因三级推理
- [x] Checkpoint 18: 农事建议按一级/二级/三级优先级排序
- [x] Checkpoint 19: 品质预测展示果径/果重/糖度/产量/置信度

## 评价报告
- [x] Checkpoint 20: 报告预览包含全部9个模块
- [x] Checkpoint 21: 导出PDF按钮可触发浏览器打印
- [x] Checkpoint 22: 历史报告列表可查询和查看

## 数据校准
- [x] Checkpoint 23: 实测值vs预测值对比表格清晰展示
- [x] Checkpoint 24: 参数微调表单可编辑并保存

## 视觉风格
- [x] Checkpoint 25: 所有新页面配色、字号、组件样式与现有系统一致
- [x] Checkpoint 26: 全流程操作流畅无阻塞
- [x] Checkpoint 27: 响应式布局在1280px+屏幕上正常显示
