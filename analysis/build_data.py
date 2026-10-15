# -*- coding: utf-8 -*-
"""把聚合统计 stats.json 打包为站点可直接加载的 data/stats.js（仅含聚合量）。"""
import json, os, sys

SRC = "out/stats.json"
DENSITY = "out/benefit_density.json"
DST = "data/stats.js"

sys.stdout.reconfigure(encoding="utf-8")

with open(SRC, encoding="utf-8") as f:
    d = json.load(f)

# 合并「福利标签填写密度」控制项
if os.path.exists(DENSITY):
    with open(DENSITY, encoding="utf-8") as f:
        den = json.load(f)
    d["meta"]["benefit_tags_avg_train"] = round(den["train"]["avg_tags"], 3)
    d["meta"]["benefit_tags_avg_nontrain"] = round(den["nontrain"]["avg_tags"], 3)
    d["meta"]["benefit_empty_share_train"] = round(den["train"]["empty_share"], 4)
    d["meta"]["benefit_empty_share_nontrain"] = round(den["nontrain"]["empty_share"], 4)

body = ("/* 聚合统计量（自动生成，请勿手工编辑）——仅含维度合计与比例，不含任何原始岗位记录 */\n"
        "window.STATS = " + json.dumps(d, ensure_ascii=False, separators=(",", ":")) + ";\n")

os.makedirs(os.path.dirname(DST), exist_ok=True)
with open(DST, "w", encoding="utf-8") as f:
    f.write(body)

print("wrote %s  %.0f KB" % (DST, os.path.getsize(DST) / 1024))
print("rows=%d train=%d rate=%.4f%%" % (d["meta"]["rows"], d["meta"]["train"],
                                        100 * d["meta"]["train_rate"]))

