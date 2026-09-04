# -*- coding: utf-8 -*-
"""生成第二章业务流程的黑白流程图（matplotlib + SimHei）。"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyArrowPatch
import os

plt.rcParams["font.sans-serif"] = ["SimHei"]
plt.rcParams["axes.unicode_minus"] = False

OUT = r"D:\dev\pro_orangemodel\docs\flowcharts"
os.makedirs(OUT, exist_ok=True)

def draw_flow(title, steps, outfile, cols=None):
    n = len(steps)
    cols = cols or min(n, 4)
    rows = (n + cols - 1) // cols
    fig_w = cols * 1.15 + 0.6
    fig_h = rows * 1.15 + 1.2
    fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=150)
    ax.set_xlim(-0.6, cols)
    ax.set_ylim(-rows, 0.9)
    ax.axis("off")

    pos = {}
    for i, s in enumerate(steps):
        r = i // cols
        c = i % cols
        if r % 2 == 1:          # snake: 奇数行反向
            c = cols - 1 - c
        x, y = c, -r
        pos[i] = (x, y)
        ax.add_patch(Rectangle((x - 0.5, y - 0.27), 1.0, 0.54,
                     facecolor="white", edgecolor="black", lw=1.3))
        ax.text(x, y, s, ha="center", va="center", fontsize=11, color="black")

    def conn(i, j):
        xi, yi = pos[i]; xj, yj = pos[j]
        if abs(yi - yj) < 0.01:   # 同行
            if xj > xi:
                a, b = (xi + 0.5, yi), (xj - 0.5, yj)
            else:
                a, b = (xi - 0.5, yi), (xj + 0.5, yj)
        else:                     # 行切换（snake 下 x 对齐）
            a, b = (xi, yi - 0.27), (xj, yj + 0.27)
        arr = FancyArrowPatch(a, b, arrowstyle="-|>", mutation_scale=14,
                              lw=1.3, color="black",
                              shrinkA=2, shrinkB=2)
        ax.add_patch(arr)

    for i in range(n - 1):
        conn(i, i + 1)

    ax.text(cols / 2 - 0.3, 0.75, title, ha="center", va="center",
            fontsize=13, fontweight="bold", color="black")
    fig.tight_layout()
    fig.savefig(outfile, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print("saved", outfile)

draw_flow("生长模型业务流程",
          ["数据采集", "因子归集", "模型计算", "诊断分析",
           "评价报告", "预警生成", "农事建议", "建议采纳\n(回灌)"],
          os.path.join(OUT, "flow_growth.png"), cols=4)

draw_flow("病虫害模型业务流程",
          ["数据输入\n(监测/气象/虫情)", "多因子耦合\n预测", "风险诊断",
           "预测报告", "预警生成", "防控方案", "处置反馈"],
          os.path.join(OUT, "flow_pest.png"), cols=4)

draw_flow("预警管理业务流程",
          ["规则配置", "触发判定", "预警生成",
           "多渠道推送", "处置反馈", "闭环归档"],
          os.path.join(OUT, "flow_alert.png"), cols=3)

draw_flow("移动端全链路业务流程",
          ["农户端操作\n(识别/上报/查看)", "服务端处理\n(模型计算/预警)",
           "建议与预警\n推送", "农户采纳\n反馈"],
          os.path.join(OUT, "flow_mobile.png"), cols=4)
print("ALL FLOWCHARTS DONE")
