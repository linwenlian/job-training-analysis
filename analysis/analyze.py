# -*- coding: utf-8 -*-
"""全职岗位「培训福利」现状与趋势分析：单次流式扫描全量 CSV，仅输出聚合统计。"""
import csv, json, re, sys, time, collections, os
from array import array

PATH = "raw/fulltime_jobs_202601_202609.csv"
OUT = "out/stats.json"
LIMIT = int(os.environ.get("LIMIT", "0") or 0)
if os.environ.get("OUTPATH"):
    OUT = os.environ["OUTPATH"]
sys.stdout.reconfigure(encoding="utf-8")
T0 = time.time()


def log(*a):
    print("[%7.1fs]" % (time.time() - T0), *a, flush=True)


CAT_MAP = {
    "财务": "财务/金融/法务", "保险": "财务/金融/法务", "银行及金融服务": "财务/金融/法务",
    "证券/基金/期货": "财务/金融/法务", "投融资": "财务/金融/法务", "合规风控/法务/律师": "财务/金融/法务",
    "信托/担保/拍卖/典当": "财务/金融/法务", "专业分析": "财务/金融/法务",
    "销售顾问": "销售/营销", "市场/品牌推广": "销售/营销", "商务拓展": "销售/营销",
    "销售管理": "销售/营销", "汽车销售与服务": "销售/营销", "医药市场/销售": "销售/营销",
    "市场调研": "销售/营销",
    "业务运营": "互联网运营", "新媒体运营": "互联网运营", "电商运营": "互联网运营",
    "运营管理": "互联网运营", "产品经理": "互联网运营", "线下运营": "互联网运营",
    "软件研发": "研发/技术", "工程开发技术人员": "研发/技术", "机械设计/制造": "研发/技术",
    "电子/电器/自动化": "研发/技术", "通信及硬件研发": "研发/技术", "运维支持": "研发/技术",
    "测试工程师": "研发/技术", "生物/医药研发": "研发/技术", "人工智能": "研发/技术",
    "数据工程师": "研发/技术", "前端开发": "研发/技术", "移动研发": "研发/技术",
    "半导体/芯片": "研发/技术", "科研/学术研究": "研发/技术",
    "普工/技工": "生产制造", "生产管理": "生产制造", "生产质量管理": "生产制造",
    "化工": "生产制造", "汽车制造": "生产制造", "印刷包装": "生产制造",
    "机械设备维修": "生产制造", "能源/矿产/地质": "生产制造", "服装/纺织/皮革": "生产制造",
    "配送理货": "物流/配送/仓储", "交通运输": "物流/配送/仓储", "仓储管理": "物流/配送/仓储",
    "物流管理": "物流/配送/仓储",
    "人事": "人力/行政", "行政": "人力/行政", "文员/助理": "人力/行政", "档案管理": "人力/行政",
    "客服": "客服", "售前售后工程师": "客服",
    "餐饮服务": "零售/餐饮/生活服务", "家政/维修": "零售/餐饮/生活服务", "物业/安保": "零售/餐饮/生活服务",
    "零售百货": "零售/餐饮/生活服务", "健康/美容": "零售/餐饮/生活服务", "酒店服务": "零售/餐饮/生活服务",
    "旅游服务": "零售/餐饮/生活服务", "运动健身": "零售/餐饮/生活服务",
    "工程管理": "建筑/工程/房地产", "建筑/室内设计": "建筑/工程/房地产", "施工员": "建筑/工程/房地产",
    "工程安全/工程质检": "建筑/工程/房地产", "房地产规划开发": "建筑/工程/房地产",
    "房地产交易": "建筑/工程/房地产",
    "医疗器械": "医疗/健康", "医生/药剂师": "医疗/健康", "护士/医助": "医疗/健康",
    "临床研究/试验": "医疗/健康", "药店": "医疗/健康", "医务管理": "医疗/健康",
    "教务管理": "教育培训", "中小学课程辅导": "教育培训", "职业培训": "教育培训",
    "才艺特长培训": "教育培训", "语言培训": "教育培训", "早教/幼教": "教育培训",
    "IT培训": "教育培训", "留学辅导": "教育培训", "特殊教育": "教育培训",
    "高等教育": "教育培训", "考研辅导": "教育培训",
    "视觉/交互设计": "设计/传媒/文化", "影视制作": "设计/传媒/文化", "主播/演艺人员/经纪人": "设计/传媒/文化",
    "策划": "设计/传媒/文化", "公关媒介": "设计/传媒/文化", "工业设计": "设计/传媒/文化",
    "编辑/编校/作家": "设计/传媒/文化", "动画动效设计": "设计/传媒/文化", "广告": "设计/传媒/文化",
    "场务/剧务": "设计/传媒/文化", "舞美设计": "设计/传媒/文化", "陈列展示设计": "设计/传媒/文化",
    "游戏策划/制作": "设计/传媒/文化", "记者/采编": "设计/传媒/文化", "发行": "设计/传媒/文化",
    "采购/供应链/材料管理": "供应链/采购", "关务": "供应链/采购",
    "高级管理": "管理/战略", "项目管理": "管理/战略", "管培生/储备干部": "管理/战略",
    "农/林/牧/渔": "农林牧渔",
    "环境科学/环保": "其他专业服务", "商务服务": "其他专业服务", "翻译": "其他专业服务",
    "政府事务": "其他专业服务", "会展会务": "其他专业服务", "专业服务": "其他专业服务",
    "政府及非盈利机构从业者": "其他专业服务", "社工": "其他专业服务",
}

TIER1 = {"北京", "上海", "广州", "深圳"}
TIER_NEW1 = {"成都", "杭州", "重庆", "西安", "苏州", "武汉", "南京", "天津", "郑州", "长沙",
             "东莞", "佛山", "宁波", "青岛", "沈阳", "合肥"}
TIER2 = {"昆明", "福州", "无锡", "厦门", "哈尔滨", "长春", "南昌", "济南", "大连", "贵阳", "温州",
         "石家庄", "泉州", "南宁", "金华", "常州", "珠海", "惠州", "嘉兴", "南通", "中山", "保定",
         "台州", "徐州", "太原", "绍兴", "烟台", "廊坊", "海口", "汕头", "潍坊", "临沂", "洛阳",
         "乌鲁木齐", "呼和浩特", "银川", "西宁", "唐山", "扬州", "盐城", "湖州", "赣州", "漳州"}

EDU_ORDER = ["初中及以下", "高中", "中专/中技", "中技", "大专", "本科", "硕士", "MBA/EMBA", "EMBA",
             "博士", "学历不限", "其他"]
EXP_ORDER = ["无经验", "1年以下", "1-3年", "3-5年", "5-10年", "10年以上", "经验不限"]
SIZE_ORDER = ["20人以下", "20-99人", "100-299人", "300-499人", "500-999人", "1000-9999人", "10000人以上"]
SAL_BANDS = [("<3k", 0, 3000), ("3-5k", 3000, 5000), ("5-7k", 5000, 7000), ("7-10k", 7000, 10000),
             ("10-15k", 10000, 15000), ("15-20k", 15000, 20000), ("20k+", 20000, 10 ** 9)]

DESC_KW = {
    "培训": ["培训"], "带教师徒": ["带教", "师傅带", "师带徒", "师徒", "老带新", "以老带新", "学徒"],
    "晋升成长": ["晋升", "成长", "发展空间"],
    "绩效考核": ["绩效", "考核", "KPI"],
    "加班倒班": ["加班", "夜班", "倒班", "排班"],
    "出差外派": ["出差", "驻场", "外派"],
    "提成奖金": ["提成", "奖金", "佣金", "无责底薪"],
    "保险公积金": ["五险一金", "五险", "社保", "公积金"],
    "证书资格": ["证书", "资格证", "执业", "持证"],
    "应届实习": ["应届", "实习生", "校招", "管培"],
    "沟通协作": ["团队", "协作", "配合", "沟通"],
    "抗压吃苦": ["抗压", "吃苦", "责任心", "细致"],
    "办公软件": ["Excel", "excel", "办公软件", "office", "Office", "PPT"],
    "数据分析": ["数据分析", "SQL", "报表", "数据统计"],
    "AI与数字化": ["人工智能", "AI", "大模型", "机器学习", "数字化"],
    "外语能力": ["英语", "外语", "六级", "雅思"],
    "客户开发": ["客户", "拓客", "开发客户"],
    "住宿餐饮": ["包住", "提供住宿", "宿舍", "工作餐"],
    "双休法定": ["双休", "法定节假日"],
}

BENEFIT_KEYS = {
    "五险一金类": ["五险一金", "六险一金", "五险", "六险", "社保"],
    "周末双休": ["双休"],
    "包吃住/餐补": ["包吃", "包住", "工作餐", "餐补", "饭补", "食堂"],
    "住宿/宿舍": ["住宿", "宿舍", "公寓", "住房"],
    "奖金提成": ["年终奖", "绩效奖金", "全勤奖", "奖金", "季度奖", "提成", "无责底薪"],
    "带薪休假": ["年假", "带薪休假", "带薪年假", "带薪"],
    "节日/团建关怀": ["节日", "生日", "下午茶", "团建", "旅游", "体检"],
    "交通通讯补贴": ["交通", "车补", "油补", "通讯", "话补", "班车", "补贴"],
    "加班补助": ["加班"],
    "晋升空间": ["晋升", "发展空间", "转正"],
    "日结周结预支": ["日结", "周结", "月结", "预支", "不压工资"],
}

RE_TAGS = re.compile(r"'(.*?)'")
TRAIN_BROAD = ("带教", "师带徒", "师徒", "学徒", "培养", "进修", "老带新")
RE_SAL = re.compile(r"(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(万|元)")
RE_SAL1 = re.compile(r"(\d+(?:\.\d+)?)\s*(万|元)")


def parse_tags(s):
    s = s.strip()
    if not s or s in ("[]", "{}"):
        return []
    if s[0] in "[{" and s[-1] in "]}":
        s = s[1:-1]
    return [t.strip().strip('"') for t in RE_TAGS.findall(s) if t.strip()]


def parse_salary(s):
    s = s.strip()
    if not s or "面议" in s:
        return None, True, False
    if "小时" in s or "元/时" in s:
        return None, False, False
    thirteen = ("13薪" in s) or ("14薪" in s)
    m = RE_SAL.search(s)
    if m:
        lo, hi, unit = float(m.group(1)), float(m.group(2)), m.group(3)
    else:
        m = RE_SAL1.search(s)
        if not m:
            return None, False, thirteen
        lo = hi = float(m.group(1))
        unit = m.group(2)
    if unit == "万":
        lo, hi = lo * 10000, hi * 10000
    if lo > 300000 or hi > 300000:
        lo, hi = lo / 12, hi / 12
    return (lo + hi) / 2, False, thirteen


def band_of(v):
    for name, lo, hi in SAL_BANDS:
        if lo <= v < hi:
            return name
    return None


# ---------------------------------------------------------------- 统计容器
def C():
    return collections.defaultdict(lambda: [0, 0])


D = collections.defaultdict(C)
tag_all = collections.Counter()
tag_train = collections.Counter()
skill_all = collections.Counter()
skill_train = collections.Counter()
desc_hit = collections.defaultdict(lambda: [0, 0])
ben_hit = collections.defaultdict(lambda: [0, 0])
desc_all_hit = collections.Counter()
desc_train_hit = collections.Counter()
ben_all_hit = collections.Counter()
ben_train_hit = collections.Counter()
sal_t = array("i")
sal_nt = array("i")
macro_sal = collections.defaultdict(lambda: (array("i"), array("i")))
tot = {"n": 0, "t": 0, "broad": 0, "skill_n": 0, "skill_t": 0, "desc_len": 0, "desc_len_t": 0}
bad_rows = 0


def add(dim, key, is_train):
    v = D[dim][key]
    v[0] += 1
    if is_train:
        v[1] += 1


with open(PATH, "r", encoding="utf-8-sig", newline="") as f:
    rd = csv.reader(f)
    header = next(rd)
    for row in rd:
        if len(row) < 12:
            bad_rows += 1
            continue
        date, cat, city, sal, ben, edu, exp, sk, desc, comp, size, ind = row[:12]
        tot["n"] += 1
        month = date[:7]

        btags = parse_tags(ben)
        for t in btags:
            tag_all[t] += 1
        is_train = any("培训" in t for t in btags)
        if is_train:
            tot["t"] += 1
            for t in btags:
                tag_train[t] += 1
        elif any(any(w in t for w in TRAIN_BROAD) for t in btags):
            tot["broad"] += 1

        add("month", month, is_train)
        macro = CAT_MAP.get(cat, "其他")
        add("macro", macro, is_train)
        add("cat", cat, is_train)
        add("macro_month", macro + "|" + month, is_train)
        add("city", city, is_train)
        tier = ("一线城市" if city in TIER1 else "新一线城市" if city in TIER_NEW1
                else "二线城市" if city in TIER2 else "其他城市")
        add("tier", tier, is_train)
        add("tier_month", tier + "|" + month, is_train)

        mid, face, thirteen = parse_salary(sal)
        if mid is not None:
            b = band_of(mid)
            if b:
                add("salband", b, is_train)
            iv = int(mid)
            if is_train:
                sal_t.append(iv)
                macro_sal[macro][0].append(iv)
            else:
                sal_nt.append(iv)
                macro_sal[macro][1].append(iv)
        add("sal_kind", ("面议" if face else "13薪及以上" if thirteen else "常规月薪"), is_train)

        e2 = edu if edu in EDU_ORDER else "其他"
        x2 = exp if exp in EXP_ORDER else "其他"
        add("edu", e2, is_train)
        add("exp", x2, is_train)
        add("edu_exp", e2 + "|" + x2, is_train)
        add("size", size if size in SIZE_ORDER else "未知", is_train)

        for it in set(x.strip() for x in re.split(r"[,，/|]", ind) if x.strip()):
            add("ind", it, is_train)

        stags = parse_tags(sk)
        n_sk = len(stags)
        tot["skill_n"] += n_sk
        if n_sk == 0:
            add("skillcnt", "0 个", is_train)
        elif n_sk <= 5:
            add("skillcnt", "%d 个" % n_sk, is_train)
        else:
            add("skillcnt", "6 个及以上", is_train)
        for t in stags:
            skill_all[t] += 1
            if is_train:
                skill_train[t] += 1
        if is_train:
            tot["skill_t"] += n_sk

        tot["desc_len"] += len(desc)
        if is_train:
            tot["desc_len_t"] += len(desc)
        for name, kws in DESC_KW.items():
            if any(k in desc for k in kws):
                desc_all_hit[name] += 1
                if is_train:
                    desc_train_hit[name] += 1
        for name, kws in BENEFIT_KEYS.items():
            if any(k in t for t in btags for k in kws):
                ben_all_hit[name] += 1
                if is_train:
                    ben_train_hit[name] += 1

        if tot["n"] % 1000000 == 0:
            log("rows", tot["n"], "train", tot["t"])
        if LIMIT and tot["n"] >= LIMIT:
            log("stopped at LIMIT", LIMIT)
            break

log("scan done. rows=%d bad=%d train=%d" % (tot["n"], bad_rows, tot["t"]))


def rows(dim, min_n=1):
    out = []
    for k, (n, t) in D[dim].items():
        out.append({"k": k, "n": n, "t": t, "rate": (t / n) if n >= min_n else None})
    out.sort(key=lambda r: -r["n"])
    return out


def rows_by_key(dim, min_n=1):
    out = []
    for k, (n, t) in D[dim].items():
        out.append({"k": k, "n": n, "t": t, "rate": (t / n) if n >= min_n else None})
    out.sort(key=lambda r: r["k"])
    return out


def stat(a):
    if len(a) == 0:
        return None
    s = sorted(a)
    n = len(s)
    return {"n": n, "mean": round(sum(s) / n, 1), "median": s[n // 2],
            "p25": s[n // 4], "p75": s[(3 * n) // 4]}


res = {
    "meta": {
        "rows": tot["n"], "bad_rows": bad_rows,
        "train": tot["t"], "train_rate": tot["t"] / tot["n"],
        "broad_extra": tot["broad"],
        "months": [{"m": m, "n": D["month"][m][0], "t": D["month"][m][1]} for m in sorted(D["month"])],
        "distinct_benefit_tags": len(tag_all), "distinct_roles": len(D["cat"]),
        "distinct_cities": len(D["city"]), "distinct_industries": len(D["ind"]),
        "avg_skill_train": tot["skill_t"] / max(1, tot["t"]),
        "avg_skill_all": tot["skill_n"] / max(1, tot["n"]),
        "avg_declen_train": tot["desc_len_t"] / max(1, tot["t"]),
        "avg_declen_all": tot["desc_len"] / max(1, tot["n"]),
        "generated_at": time.strftime("%Y-%m-%d %H:%M"),
    },
    "month": rows_by_key("month"), "macro": rows("macro"), "cat": rows("cat"),
    "macro_month": rows_by_key("macro_month"), "city": rows("city"), "tier": rows("tier"),
    "tier_month": rows_by_key("tier_month"), "salband": rows("salband"), "sal_kind": rows("sal_kind"),
    "edu": rows("edu"), "exp": rows("exp"), "edu_exp": rows("edu_exp"),
    "size": rows("size"), "ind": rows("ind"), "skillcnt": rows("skillcnt"),
    "salary": {
        "train": stat(sal_t), "nontrain": stat(sal_nt),
        "by_macro": {k: {"train": stat(v[0]), "nontrain": stat(v[1])} for k, v in macro_sal.items()},
    },
    "skill": {
        "top_all": [[t, n] for t, n in skill_all.most_common(300)],
        "top_train": [[t, skill_train.get(t, 0), n] for t, n in skill_all.most_common(300)],
    },
    "benefit": {
        "top_all": [[t, n, tag_train.get(t, 0)] for t, n in tag_all.most_common(300)],
        "train_top": [[t, n] for t, n in tag_train.most_common(60)],
        "train_strings": [[t, n] for t, n in tag_all.most_common() if "培训" in t][:40],
        "broad_strings": [[t, n] for t, n in tag_all.most_common()
                          if any(w in t for w in TRAIN_BROAD)][:25],
        "other_keys": [{"name": k, "n_all": ben_all_hit.get(k, 0), "n_train": ben_train_hit.get(k, 0)}
                       for k in BENEFIT_KEYS],
    },
    "desc": [{"name": k, "n_all": desc_all_hit.get(k, 0), "n_train": desc_train_hit.get(k, 0)}
             for k in DESC_KW],
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(res, f, ensure_ascii=False)
log("written %s  %.0f KB" % (OUT, os.path.getsize(OUT) / 1024))
log("overall train rate = %.4f%%  (%d / %d)" % (100 * tot["t"] / tot["n"], tot["t"], tot["n"]))

