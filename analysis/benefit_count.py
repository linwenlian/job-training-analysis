# -*- coding: utf-8 -*-
"""控制变量：有/无培训福利岗位的「福利标签填写密度」。
若培训岗位的福利标签平均条数明显更高，则其它福利类别显示率更高可能部分来自填写完整度。"""
import csv, json, re, sys, time

PATH = "raw/fulltime_jobs_202601_202609.csv"
OUT = "out/benefit_density.json"
sys.stdout.reconfigure(encoding="utf-8")
RE_TAGS = re.compile(r"'(.*?)'")
T0 = time.time()

agg = {True: {"rows": 0, "tags": 0, "empty": 0}, False: {"rows": 0, "tags": 0, "empty": 0}}

with open(PATH, "r", encoding="utf-8-sig", newline="") as f:
    rd = csv.reader(f)
    next(rd)
    for row in rd:
        if len(row) < 12:
            continue
        s = row[4].strip()
        if s in ("", "[]", "{}"):
            tags = []
        else:
            if s[0] in "[{" and s[-1] in "]}":
                s = s[1:-1]
            tags = [t for t in RE_TAGS.findall(s) if t.strip()]
        is_train = any("培训" in t for t in tags)
        a = agg[is_train]
        a["rows"] += 1
        a["tags"] += len(tags)
        if not tags:
            a["empty"] += 1
        if (a["rows"] + agg[not is_train]["rows"]) % 2000000 == 0:
            print("[%6.1fs] %d rows" % (time.time() - T0, a["rows"] + agg[not is_train]["rows"]), flush=True)

res = {}
for k, name in ((True, "train"), (False, "nontrain")):
    a = agg[k]
    res[name] = {"rows": a["rows"], "avg_tags": a["tags"] / a["rows"],
                 "empty_share": a["empty"] / a["rows"]}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(res, f, ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))

