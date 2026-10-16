/* 全职岗位「培训福利」分析看板 —— 纯静态渲染，数据来自 data/stats.js 的聚合统计 */
(function () {
  "use strict";

  var MIN_N = 30;        // 比率最小样本量
  var LIST_MIN_N = 100;  // 列表类维度展示门槛
  var S = window.STATS;
  if (!S) { document.body.insertAdjacentHTML("afterbegin",
    '<p style="padding:40px;font:16px sans-serif">聚合数据未加载。</p>'); return; }

  var M = S.meta, N = M.rows, T = M.train, NT = N - T, ALL = T / N;
  var nf = new Intl.NumberFormat("zh-CN");
  var fmtN = function (v) { return nf.format(Math.round(v)); };
  var pct = function (v, d) { return (v * 100).toFixed(d === undefined ? 1 : d) + "%"; };
  var money = function (v) { return v >= 10000 ? (v / 10000).toFixed(1).replace(/\.0$/, "") + "万" : fmtN(v); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var monthLab = function (m) { return parseInt(m.slice(5), 10) + "月"; };
  var el = function (id) { return document.getElementById(id); };

  var C = { train: "#e8590c", train2: "#f7a072", notrain: "#98a2b3", notrain2: "#d5dae2",
            blue: "#2f6feb", grid: "#eef1f5", ink: "#101828", ink2: "#344054", muted: "#98a2b3" };
  var SERIES = ["#e8590c", "#2f6feb", "#0d9488", "#7c5cff", "#d6336c", "#8a6d3b", "#2b8a3e", "#495057"];

  function svgEl(tag, attrs, txt) {
    var e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  function tip(node, text) { var t = svgEl("title"); t.textContent = text; node.appendChild(t); return node; }
  function clip(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  /* 每行数据统一成 {k,n,t,rate,share} */
  function rate(r) { return r.n >= MIN_N ? r.t / r.n : null; }
  function share(r) { return T ? r.t / T : 0; }

  function byPairs(rows, sep) {
    var o = {};
    rows.forEach(function (r) {
      var i = r.k.lastIndexOf(sep), a = r.k.slice(0, i), b = r.k.slice(i + 1);
      (o[a] = o[a] || {})[b] = r;
    });
    return o;
  }
  function orderBy(rows, order) {
    var idx = {}; order.forEach(function (k, i) { idx[k] = i; });
    return rows.slice().sort(function (a, b) {
      return (idx[a.k] === undefined ? 999 : idx[a.k]) - (idx[b.k] === undefined ? 999 : idx[b.k]); });
  }

  /* ================= 通用横向条形图 =================
     items: [{label, k, n, t, rate, share, sub}]  */
  function bars(host, items, opt) {
    opt = opt || {};
    var metric = opt.metric || "rate";
    var val = function (d) { return metric === "rate" ? d.rate : d.share; };
    items = items.filter(function (d) { return val(d) !== null && (d.n >= (opt.minN || 0)); });
    host.innerHTML = "";
    if (!items.length) { host.innerHTML = '<div class="hint">无可展示数据。</div>'; return; }

    var w = Math.max(340, host.clientWidth || 700);
    var labelW = w < 520 ? 88 : (opt.labelW || 132);
    var rightW = w < 520 ? 92 : 128;
    var rowH = opt.rowH || 27, top = 26, bot = 26;
    var plotW = w - labelW - rightW;
    var maxV = Math.max.apply(null, items.map(val).concat([0]));
    var ref = opt.ref === undefined ? null : opt.ref;
    if (ref !== null) maxV = Math.max(maxV, ref);
    maxV = maxV * 1.04 || 1;
    var h = top + items.length * rowH + bot;
    var s = svgEl("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, role: "img" });

    if (ref !== null) {
      var xr = labelW + plotW * (ref / maxV);
      s.appendChild(svgEl("line", { x1: xr, y1: top - 12, x2: xr, y2: h - bot + 4,
        stroke: C.blue, "stroke-width": 1, "stroke-dasharray": "4 3", opacity: .75 }));
      s.appendChild(svgEl("text", { x: xr + 4, y: top - 14, class: "nlab", fill: C.blue },
        "全站 " + pct(ref)));
    }
    s.appendChild(svgEl("line", { x1: labelW, y1: top - 12, x2: labelW, y2: h - bot + 4,
      class: "zero" }));

    items.forEach(function (d, i) {
      var y = top + i * rowH;
      var bw = Math.max(1, plotW * (val(d) / maxV));
      var col = opt.color || C.train;
      var bar = svgEl("rect", { x: labelW, y: y + 4, width: bw, height: rowH - 12, rx: 3, fill: col, opacity: .92 });
      s.appendChild(tip(bar, d.k + "：样本 " + fmtN(d.n) + "，其中培训岗位 " + fmtN(d.t) +
        (d.rate !== null ? "，培训率 " + pct(d.rate) : "，样本不足") + (d.sub ? "\n" + d.sub : "")));
      s.appendChild(svgEl("text", { x: labelW - 10, y: y + rowH / 2 + 4, class: "axl",
        "text-anchor": "end" }, clip(d.label, w < 520 ? 7 : 13)));
      var lab = metric === "rate" ? (d.rate === null ? "样本不足" : pct(d.rate)) : pct(d.share);
      s.appendChild(svgEl("text", { x: labelW + bw + 8, y: y + rowH / 2 + 4, class: "vlab" }, lab));
      s.appendChild(svgEl("text", { x: w - 6, y: y + rowH / 2 + 4, class: "nlab",
        "text-anchor": "end" }, "n=" + fmtN(d.n)));
    });
    host.appendChild(s);
  }

  /* ================= 分组双条（培训 vs 非培训） ================= */
  function pairedBars(host, items, opt) {
    opt = opt || {};
    host.innerHTML = "";
    items = items.filter(function (d) { return d.a !== null || d.b !== null; });
    if (!items.length) { host.innerHTML = '<div class="hint">无可展示数据。</div>'; return; }
    var w = Math.max(340, host.clientWidth || 700);
    var labelW = w < 520 ? 84 : (opt.labelW || 138);
    var rowH = opt.rowH || 40, top = 22, bot = 30;
    var plotW = w - labelW - 74;
    var maxV = Math.max.apply(null, items.map(function (d) { return Math.max(d.a || 0, d.b || 0); })) * 1.06 || 1;
    var h = top + items.length * rowH + bot;
    var s = svgEl("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, role: "img" });
    s.appendChild(svgEl("line", { x1: labelW, y1: top - 10, x2: labelW, y2: h - bot + 6, class: "zero" }));
    items.forEach(function (d, i) {
      var y = top + i * rowH;
      s.appendChild(svgEl("text", { x: labelW - 10, y: y + rowH / 2 + 1, class: "axl",
        "text-anchor": "end" }, clip(d.label, w < 520 ? 7 : 13)));
      [["a", C.train, 0, "培训岗位"], ["b", C.notrain, 1, "非培训岗位"]].forEach(function (p) {
        var v = d[p[0]];
        var by = y + 4 + p[2] * 15;
        var bw = v === null ? 0 : Math.max(1, plotW * (v / maxV));
        if (v !== null) {
          var rc = svgEl("rect", { x: labelW, y: by, width: bw, height: 12, rx: 3, fill: p[1], opacity: .92 });
          s.appendChild(tip(rc, d.label + " · " + p[3] + "：" + pct(v) + (d.tip ? "（n=" + fmtN(d.tip[p[0]]) + "）" : "")));
          s.appendChild(svgEl("text", { x: labelW + bw + 7, y: by + 10.5, class: "vlab",
            style: "font-size:11px" }, pct(v)));
        }
      });
    });
    s.appendChild(svgEl("text", { x: labelW, y: h - 10, class: "axl",
      style: "font-size:11.5px" }, "上条：培训岗位   下条：非培训岗位"));
    host.appendChild(s);
  }

  /* ================= 折线（可叠加柱形） ================= */
  function lineChart(host, labels, series, opt) {
    opt = opt || {};
    host.innerHTML = "";
    var w = Math.max(360, host.clientWidth || 900);
    var h = opt.height || 320;
    var L = w < 560 ? 40 : 52, R = 16, Tp = 26, B = 44;
    var plotW = w - L - R, plotH = h - Tp - B;
    var s = svgEl("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, role: "img" });
    var maxV = 0, minV = 1;
    series.forEach(function (g) { g.data.forEach(function (v) { if (v !== null) { maxV = Math.max(maxV, v); minV = Math.min(minV, v); } }); });
    var top = Math.max(0.02, maxV * 1.18);
    var x = function (i) { return L + (labels.length === 1 ? plotW / 2 : plotW * i / (labels.length - 1)); };
    var y = function (v) { return Tp + plotH * (1 - v / top); };

    // 柱形（岗位量）
    if (opt.volumes) {
      var vmax = Math.max.apply(null, opt.volumes);
      var bw = Math.min(34, plotW / labels.length * .52);
      var base = Tp + plotH;
      opt.volumes.forEach(function (v, i) {
        var bh = plotH * .34 * (v / vmax);
        var rc = svgEl("rect", { x: x(i) - bw / 2, y: base - bh, width: bw, height: bh, rx: 3,
          fill: "#dfe4ec" });
        s.appendChild(tip(rc, labels[i] + " 岗位量 " + fmtN(v)));
      });
      s.appendChild(svgEl("text", { x: L, y: base - plotH * .34 - 6, class: "nlab" }, "柱形＝当月岗位量"));
    }
    // 网格
    for (var g = 0; g <= 4; g++) {
      var vv = top * g / 4;
      s.appendChild(svgEl("line", { x1: L, y1: y(vv), x2: w - R, y2: y(vv), class: "gline" }));
      s.appendChild(svgEl("text", { x: L - 8, y: y(vv) + 4, class: "ax", "text-anchor": "end" }, (vv * 100).toFixed(0) + "%"));
    }
    labels.forEach(function (lb, i) {
      s.appendChild(svgEl("text", { x: x(i), y: h - B + 18, class: "ax", "text-anchor": "middle" }, lb));
    });
    series.forEach(function (g, si) {
      var col = g.color || SERIES[si % SERIES.length];
      var dpath = "";
      g.data.forEach(function (v, i) {
        if (v === null) return;
        dpath += (dpath ? " L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1);
      });
      if (dpath) s.appendChild(svgEl("path", { d: dpath, fill: "none", stroke: col,
        "stroke-width": opt.thin ? 1.8 : 2.4, "stroke-linejoin": "round" }));
      g.data.forEach(function (v, i) {
        if (v === null) return;
        var c = svgEl("circle", { cx: x(i), cy: y(v), r: opt.thin ? 2.6 : 3.6, fill: "#fff", stroke: col, "stroke-width": 2 });
        s.appendChild(tip(c, labels[i] + " · " + g.name + "：" + pct(v)));
      });
    });
    // 参考线：全站水平
    if (opt.ref !== undefined && opt.ref !== null) {
      s.appendChild(svgEl("line", { x1: L, y1: y(opt.ref), x2: w - R, y2: y(opt.ref),
        stroke: C.muted, "stroke-width": 1.2, "stroke-dasharray": "5 4" }));
      s.appendChild(svgEl("text", { x: w - R, y: y(opt.ref) - 5, class: "nlab", "text-anchor": "end" },
        "全站平均 " + pct(opt.ref)));
    }
    host.appendChild(s);
    var lg = document.createElement("div");
    lg.className = "legend";
    lg.innerHTML = series.map(function (g, i) {
      return '<span><i class="lg-line" style="background:' + (g.color || SERIES[i % SERIES.length]) + '"></i>' + esc(g.name) + "</span>";
    }).join("");
    host.appendChild(lg);
  }

  /* ================= 哑铃图（两个值对比） ================= */
  function dumbbell(host, items, opt) {
    opt = opt || {};
    host.innerHTML = "";
    if (!items.length) { host.innerHTML = '<div class="hint">无可展示数据。</div>'; return; }
    var w = Math.max(340, host.clientWidth || 700);
    var labelW = w < 520 ? 84 : (opt.labelW || 128);
    var rowH = opt.rowH || 30, top = 24, bot = 30, rightW = 66;
    var plotW = w - labelW - rightW;
    var vals = [];
    items.forEach(function (d) { if (d.a !== null) vals.push(d.a); if (d.b !== null) vals.push(d.b); });
    var maxV = Math.max.apply(null, vals) * 1.06 || 1;
    var minV = opt.zeroBase ? 0 : Math.min.apply(null, vals) * .86;
    var h = top + items.length * rowH + bot;
    var s = svgEl("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, role: "img" });
    var X = function (v) { return labelW + plotW * ((v - minV) / (maxV - minV)); };
    [minV, (minV + maxV) / 2, maxV].forEach(function (v) {
      s.appendChild(svgEl("line", { x1: X(v), y1: top - 10, x2: X(v), y2: h - bot + 4, class: "gline" }));
      s.appendChild(svgEl("text", { x: X(v), y: h - bot + 18, class: "ax", "text-anchor": "middle" },
        opt.fmt ? opt.fmt(v) : pct(v)));
    });
    items.forEach(function (d, i) {
      var yy = top + i * rowH + rowH / 2 - 2;
      s.appendChild(svgEl("text", { x: labelW - 10, y: yy + 4, class: "axl", "text-anchor": "end" },
        clip(d.label, w < 520 ? 7 : 13)));
      if (d.a !== null && d.b !== null) {
        s.appendChild(svgEl("line", { x1: X(d.a), y1: yy, x2: X(d.b), y2: yy, stroke: "#cbd3de",
          "stroke-width": 3, "stroke-linecap": "round" }));
      }
      [["b", C.notrain, "非培训"], ["a", C.train, "培训"]].forEach(function (p) {
        var v = d[p[0]];
        if (v === null) return;
        s.appendChild(tip(svgEl("circle", { cx: X(v), cy: yy, r: 5.4, fill: p[1], stroke: "#fff", "stroke-width": 1.6 }),
          d.label + " · " + p[2] + "：" + (opt.fmt ? opt.fmt(v) : pct(v)) + (d.tip ? "（n=" + fmtN(d.tip[p[0]]) + "）" : "")));
      });
      if (d.c !== undefined && d.c !== null) {
        s.appendChild(tip(svgEl("path", { d: "M" + X(d.c) + " " + (yy - 6) + " l6 10 l-12 0 z",
          fill: "#475467", stroke: "#fff", "stroke-width": 1 }),
          d.label + " · 非培训岗位中已填写福利标签者：" + (opt.fmt ? opt.fmt(d.c) : pct(d.c)) +
          (d.tip && d.tip.c ? "（n=" + fmtN(d.tip.c) + "）" : "")));
      }
      var dv = (d.a !== null && d.b !== null) ? d.a - d.b : null;
      if (dv !== null) s.appendChild(svgEl("text", { x: w - 4, y: yy + 4, class: "nlab", "text-anchor": "end" },
        (opt.fmt ? (dv > 0 ? "+" + opt.fmt(dv) : opt.fmt(dv)) : (dv > 0 ? "+" : "") + (dv * 100).toFixed(1) + "pt")));
    });
    var lg = document.createElement("div");
    lg.className = "legend";
    lg.innerHTML = '<span><i style="background:' + C.train + '"></i>培训岗位</span>' +
                   '<span><i style="background:' + C.notrain + '"></i>非培训岗位（全部）</span>' +
                   (items.some(function (x) { return x.c !== undefined && x.c !== null; })
                     ? '<span><i style="background:#475467;border-radius:2px"></i>非培训岗位（已填写福利标签）</span>' : "");
    host.appendChild(s); host.appendChild(lg);
  }

  /* ================= 热力图 ================= */
  function heat(host, rowKeys, colKeys, cell) {
    host.innerHTML = "";
    var w = Math.max(340, host.clientWidth || 500);
    var labelW = w < 520 ? 72 : 86, top = 40;
    var cw = (w - labelW - 8) / colKeys.length;
    var rowH = Math.min(38, Math.max(26, (w < 520 ? 30 : 34)));
    var h = top + rowKeys.length * rowH + 8;
    var s = svgEl("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, role: "img" });
    var vals = [];
    rowKeys.forEach(function (r) { colKeys.forEach(function (c) {
      var d = cell(r, c); if (d && d.rate !== null) vals.push(d.rate); }); });
    var maxV = vals.length ? Math.max.apply(null, vals) : .1;
    colKeys.forEach(function (c, j) {
      s.appendChild(svgEl("text", { x: labelW + cw * (j + .5), y: top - 22, class: "axl",
        "text-anchor": "middle", style: "font-size:11.5px" }, clip(c, 5)));
    });
    s.appendChild(svgEl("text", { x: labelW - 8, y: top - 22, class: "nlab", "text-anchor": "end" }, "学历＼经验"));
    rowKeys.forEach(function (r, i) {
      s.appendChild(svgEl("text", { x: labelW - 8, y: top + i * rowH + rowH / 2 + 4, class: "axl",
        "text-anchor": "end", style: "font-size:11.5px" }, clip(r, 6)));
      colKeys.forEach(function (c, j) {
        var d = cell(r, c);
        var x0 = labelW + cw * j + 1.2, y0 = top + i * rowH + 1.2;
        if (!d) { s.appendChild(svgEl("rect", { x: x0, y: y0, width: cw - 2.4, height: rowH - 2.4, rx: 4, fill: "#f4f6f9" }));
          s.appendChild(svgEl("text", { x: x0 + (cw - 2.4) / 2, y: y0 + rowH / 2 + 2, class: "nlab",
            "text-anchor": "middle" }, "—")); return; }
        if (d.rate === null) {
          s.appendChild(svgEl("rect", { x: x0, y: y0, width: cw - 2.4, height: rowH - 2.4, rx: 4, fill: "#f4f6f9" }));
          s.appendChild(tip(svgEl("text", { x: x0 + (cw - 2.4) / 2, y: y0 + rowH / 2 + 2, class: "nlab",
            "text-anchor": "middle" }, "样本不足"), r + " × " + c + "：样本 " + fmtN(d.n) + "，低于展示门槛"));
        } else {
          var a = .07 + .85 * (d.rate / maxV);
          var rc = svgEl("rect", { x: x0, y: y0, width: cw - 2.4, height: rowH - 2.4, rx: 4,
            fill: "rgba(232,89,12," + a.toFixed(3) + ")" });
          s.appendChild(tip(rc, r + " × " + c + "：样本 " + fmtN(d.n) + "，培训率 " + pct(d.rate)));
          s.appendChild(svgEl("text", { x: x0 + (cw - 2.4) / 2, y: y0 + rowH / 2 + 2,
            style: "font-size:11px", fill: a > .55 ? "#fff" : "#101828", "text-anchor": "middle",
            "font-weight": 600 }, (d.rate * 100).toFixed(1)));
        }
      });
    });
    host.appendChild(s);
  }

  /* ================= 维度配置 ================= */
  var EDU = ["初中及以下", "高中", "中专/中技", "大专", "本科", "硕士", "博士", "学历不限"];
  var EXP = ["无经验", "1年以下", "1-3年", "3-5年", "5-10年", "10年以上", "经验不限"];
  var SIZE = ["20人以下", "20-99人", "100-299人", "300-499人", "500-999人", "1000-9999人", "10000人以上"];
  var SALB = ["<3k", "3-5k", "5-7k", "7-10k", "10-15k", "15-20k", "20k+"];
  var SKC = ["0 个", "1 个", "2 个", "3 个", "4 个", "5 个", "6 个及以上"];
  var TIERO = ["一线城市", "新一线城市", "二线城市", "其他城市"];

  var DIMS = [
    { k: "macro", name: "职位大类", rows: function () { return S.macro; }, labelW: 132, rank: true },
    { k: "cat", name: "细分职业", rows: function () { return S.cat; }, labelW: 132, rank: true,
      note: "细分职业共 " + S.cat.length + " 类。" },
    { k: "city", name: "城市", rows: function () { return S.city; }, labelW: 96, rank: true,
      note: "城市共 " + S.city.length + " 个。" },
    { k: "ind", name: "行业", rows: function () { return S.ind; }, labelW: 132, rank: true,
      note: "行业为多值字段，一条岗位可计入多个行业，共 " + S.ind.length + " 个。" },
    { k: "tier", name: "城市等级", rows: function () { return orderBy(S.tier, TIERO); }, labelW: 110 },
    { k: "edu", name: "学历", rows: function () { return orderBy(S.edu, EDU.concat(["MBA/EMBA", "EMBA", "中技", "其他"])); }, labelW: 110 },
    { k: "exp", name: "经验", rows: function () { return orderBy(S.exp, EXP); }, labelW: 110 },
    { k: "size", name: "企业规模", rows: function () { return orderBy(S.size, SIZE); }, labelW: 110 },
    { k: "salband", name: "薪资档", rows: function () { return orderBy(S.salband, SALB); }, labelW: 96 },
    { k: "skillcnt", name: "技能标签数", rows: function () { return orderBy(S.skillcnt, SKC); }, labelW: 110 }
  ];
  var dimState = { k: "macro", metric: "rate", order: "rank", minN: 100 };
  var TOPN = 20;

  function renderDim() {
    var d = DIMS.filter(function (x) { return x.k === dimState.k; })[0];
    var all = d.rows().map(function (r) {
      return { label: r.k, k: r.k, n: r.n, t: r.t, rate: rate(r), share: share(r) };
    });
    var rows = all.filter(function (r) { return r.n >= dimState.minN; });
    var mode = "";
    if (dimState.metric === "share") {
      rows.sort(function (a, b) { return b.t - a.t; });
      mode = "按培训岗位数（培训岗位构成）排序";
    } else if (d.rank && dimState.order === "rank") {
      rows.sort(function (a, b) { return (b.rate === null ? -1 : b.rate) - (a.rate === null ? -1 : a.rate); });
      mode = "按培训率从高到低排序";
    } else if (d.rank && dimState.order === "rankdesc") {
      rows.sort(function (a, b) { return (a.rate === null ? 9 : a.rate) - (b.rate === null ? 9 : b.rate); });
      mode = "按培训率从低到高排序";
    } else {
      rows.sort(function (a, b) { return b.n - a.n; });
      mode = d.rank ? "按岗位量排序" : "按业务顺序排列";
    }
    var qualified = rows.length;
    rows = rows.slice(0, TOPN);
    bars(el("chartDim"), rows, { metric: dimState.metric, labelW: d.labelW,
      ref: dimState.metric === "rate" ? ALL : null,
      minN: dimState.metric === "rate" ? Math.min(dimState.minN, MIN_N) : MIN_N });
    el("dimHint").textContent = (d.note ? d.note + " " : "") +
      "当前口径：" + mode + "，样本量门槛 ≥ " + fmtN(dimState.minN) + " 条，符合门槛的类别共 " +
      fmtN(qualified) + " 个，展示前 " + Math.min(TOPN, rows.length) + " 个。" +
      (d.rank ? "" : "（该维度按业务顺序排列，排序按钮对其无效。）") +
      " 悬停可见样本量与培训岗位数。";
  }

  /* ================= 各区块渲染 ================= */
  var avgSkillNT = (M.avg_skill_all * N - M.avg_skill_train * T) / (NT || 1);
  var avgLenNT = (M.avg_declen_all * N - M.avg_declen_train * T) / (NT || 1);
  var kwTrain = S.desc.filter(function (x) { return x.name === "培训"; })[0];

  function kpis() {
    var medT = S.salary.train ? S.salary.train.median : null;
    var medNT = S.salary.nontrain ? S.salary.nontrain.median : null;
    var cards = [
      { lab: "全职岗位样本量", val: fmtN(N), note: M.months[0].m + " 至 " + M.months[M.months.length - 1].m + " 发布" },
      { lab: "标注培训福利的岗位", val: fmtN(T), note: "另有 " + fmtN(M.broad_extra) + " 条标注带教/师徒/学徒类福利", accent: true },
      { lab: "培训福利标注率", val: pct(ALL, 2), note: "全部岗位中的占比", accent: true },
      { lab: "中位月薪（培训 / 非培训）",
        val: money(medT) + ' <small>vs ' + money(medNT) + "</small>",
        note: "中位差 " + (medT > medNT ? "+" : "-") + fmtN(Math.abs(medT - medNT)) +
              " 元；两组均值近乎持平（" + fmtN(S.salary.train.mean) + " vs " + fmtN(S.salary.nontrain.mean) + "）" },
      { lab: "平均技能标签数（培训 / 非培训）",
        val: M.avg_skill_train.toFixed(2) + ' <small>vs ' + avgSkillNT.toFixed(2) + "</small>",
        note: M.avg_skill_train > avgSkillNT ? "培训岗位的技能标签要求反而更多" : "培训岗位技能标签要求更少" },
      { lab: "岗位描述提及「培训」", val: pct(kwTrain.n_train / T), note: "培训岗位中，岗位描述也出现「培训」的比例" }
    ];
    el("kpis").innerHTML = cards.map(function (c) {
      return '<div class="kpi' + (c.accent ? " accent" : "") + '"><div class="lab">' + esc(c.lab) +
        '</div><div class="val">' + c.val + '</div><div class="note">' + esc(c.note) + "</div></div>";
    }).join("");
  }

  function init() {
    el("minN").textContent = MIN_N;
    el("heroChips").innerHTML = [
      ["样本", fmtN(N) + " 条全职岗位"],
      ["区间", M.months[0].m + " ~ " + M.months[M.months.length - 1].m],
      ["字段", "岗位福利 / 职位 / 城市 / 薪资 / 学历 / 经验 / 企业规模 / 行业 / 技能标签 / 岗位描述"],
      ["口径", "聚合统计，最小样本 " + MIN_N]
    ].map(function (p) { return '<span class="chip">' + esc(p[0]) + "：<b>" + esc(p[1]) + "</b></span>"; }).join("");

    kpis();
    renderDim();
    renderTrend("all");
    renderPay(); renderBenefit(); renderSkillFam(); renderDesc(); renderCross(); renderMethod();
  }

  /* 控件只绑定一次，避免 resize 重复渲染时叠加监听 */
  function bindUI() {
    el("dimSeg").innerHTML = DIMS.map(function (d, i) {
      return '<button data-k="' + d.k + '"' + (i === 0 ? ' class="on"' : "") + ">" + d.name + "</button>";
    }).join("");
    function seg(host, onPick) {
      el(host).addEventListener("click", function (e) {
        if (e.target.tagName !== "BUTTON") return;
        [].forEach.call(this.children, function (b) { b.classList.toggle("on", b === e.target); });
        onPick(e.target.dataset.k);
      });
    }
    seg("dimSeg", function (k) { dimState.k = k; renderDim(); });
    seg("metricSeg", function (k) { dimState.metric = k; renderDim(); });
    seg("orderSeg", function (k) { dimState.order = k; renderDim(); });
    seg("minSeg", function (k) { dimState.minN = parseInt(k, 10); renderDim(); });
    seg("trendSeg", function (k) { renderTrend(k); });
  }

  /* ================= 趋势 ================= */
  function renderTrend(mode) {
    var months = S.month.map(function (r) { return r.k; });
    var labels = months.map(monthLab);
    var vols = S.month.map(function (r) { return r.n; });
    var series = [];
    if (mode === "all") {
      series.push({ name: "全部岗位培训率", color: C.train,
        data: S.month.map(function (r) { return r.t / r.n; }) });
      el("trendHint").textContent = "柱形为当月岗位量，折线为当月岗位中标注培训福利的比例。";
    } else if (mode === "tier") {
      var tm = byPairs(S.tier_month, "|");
      TIERO.forEach(function (t, i) {
        if (!tm[t]) return;
        series.push({ name: t, color: SERIES[i % SERIES.length],
          data: months.map(function (m) { return tm[t][m] && tm[t][m].n >= MIN_N ? tm[t][m].t / tm[t][m].n : null; }) });
      });
      el("trendHint").textContent = "按城市等级拆分。小城市当月样本不足时不做展示。";
    } else {
      var mm = byPairs(S.macro_month, "|");
      S.macro.slice(0, 6).forEach(function (mc, i) {
        if (!mm[mc.k]) return;
        series.push({ name: mc.k, color: SERIES[i % SERIES.length],
          data: months.map(function (m) { return mm[mc.k][m] && mm[mc.k][m].n >= MIN_N ? mm[mc.k][m].t / mm[mc.k][m].n : null; }) });
      });
      el("trendHint").textContent = "按岗位量前 6 的职位大类拆分，仅显示样本充足的月份。";
    }
    lineChart(el("chartTrend"), labels, series, { volumes: vols, ref: ALL, height: 330 });
  }

  /* ================= 薪酬 ================= */
  function renderPay() {
    var items = [];
    Object.keys(S.salary.by_macro).forEach(function (k) {
      var v = S.salary.by_macro[k];
      if (!v.train || !v.nontrain || v.train.n < MIN_N || v.nontrain.n < MIN_N) return;
      items.push({ label: k, a: v.train.median, b: v.nontrain.median, tip: { a: v.train.n, b: v.nontrain.n } });
    });
    items.sort(function (x, y) { return y.b - x.b; });
    dumbbell(el("chartPayMacro"), items, { fmt: money, labelW: 118, rowH: 29, zeroBase: true });

    var sk = orderBy(S.skillcnt, SKC).map(function (r) {
      return { k: r.k, n: r.n, t: r.t, rate: rate(r) };
    });
    var totT = 0, totNT = 0;
    sk.forEach(function (r) { totT += r.t; totNT += r.n - r.t; });
    pairedBars(el("chartSkillCount"), sk.map(function (r) {
      return { label: r.k, a: r.t / totT, b: (r.n - r.t) / totNT,
               tip: { a: r.t, b: r.n - r.t } };
    }), { labelW: 74, rowH: 34 });

    var rows = orderBy(S.salband, SALB).map(function (r) {
      return { label: r.k, k: r.k, n: r.n, t: r.t, rate: rate(r), share: share(r) };
    });
    bars(el("chartSalBand"), rows, { metric: "rate", ref: ALL, labelW: 74 }
    );
    el("salHint").textContent = "薪资档按岗位薪资区间中位数划分（面议、时薪岗位不计入）；比率展示门槛 " + MIN_N + " 条。";
  }

  /* ================= 福利联动 ================= */
  /* 技能类型：培训会与什么技能同时出现 */
  function renderSkillFam() {
    var fam = (S.skillfam || []).map(function (r) {
      return { label: r.k.replace("（出现在技能字段）", ""), k: r.k, n: r.n, t: r.t, rate: rate(r),
               a: r.t / T, b: (r.n - r.t) / NT, tip: { a: r.t, b: r.n - r.t },
               tags: (r.top_tags || []).map(function (p) { return p[0]; }) };
    }).filter(function (r) { return r.n >= 1000; });
    if (!fam.length) {
      ["chartSkillFam", "chartTrainFam", "chartSkillTop"].forEach(function (id) {
        el(id).innerHTML = '<div class="hint">技能类型统计尚未生成。</div>'; });
      el("skillFamHint").textContent = "技能类型统计尚未生成。";
      return;
    }
    fam.sort(function (x, y) { return (y.a - y.b) - (x.a - x.b); });
    dumbbell(el("chartSkillFam"), fam, { labelW: 146, rowH: 30 });

    var train1 = fam.slice().sort(function (x, y) { return y.t - x.t; });
    bars(el("chartTrainFam"), train1.map(function (r) {
      return { label: r.label, k: r.k, n: r.n, t: r.t, rate: r.rate, share: r.t / T,
               sub: "示例标签：" + r.tags.slice(0, 5).join("、") };
    }), { metric: "share", labelW: 146, minN: 1000 });

    var top = S.skill.top_all.slice(0, 14).map(function (p) {
      var tag = p[0], nAll = p[1], nT = 0;
      S.skill.top_train.forEach(function (q) { if (q[0] === tag) nT = q[1]; });
      return { label: tag, a: nT / T, b: (nAll - nT) / NT, tip: { a: nT, b: nAll - nT } };
    });
    pairedBars(el("chartSkillTop"), top, { labelW: 118, rowH: 34 });

    var up = fam[0], down = fam[fam.length - 1];
    var mid = fam.filter(function (r) { return r.k.indexOf("福利待遇") >= 0; })[0];
    el("skillFamHint").textContent =
      "与培训最同向的技能类型是「" + up.label + "」（培训岗位 " + pct(up.a) + " vs 非培训 " + pct(up.b) + "）、" +
      "最反向的是「" + down.label + "」（" + pct(down.a) + " vs " + pct(down.b) + "）。" +
      "技能标签字段在两类岗位中的填写率接近（96%~97%），差异不是填写率造成的。" +
      "另需注意：技能标签字段里混有大量行业/领域类与福利类标签" +
      (mid ? "（「" + mid.label + "」在培训岗位中的出现率达 " + pct(mid.a) + "）" : "") +
      "，归类为规则匹配，详情见方法说明。";
  }

  function renderBenefit() {
    var nonEmptyNT = NT * (1 - (M.benefit_empty_share_nontrain || 0));
    var items = S.benefit.other_keys.map(function (o) {
      return { label: o.name, a: o.n_train / T, b: o.n_all / N,
               c: (o.n_all - o.n_train) / nonEmptyNT,
               tip: { a: o.n_train, b: o.n_all, c: nonEmptyNT } };
    });
    items.sort(function (x, y) { return (y.a - y.b) - (x.a - x.b); });
    dumbbell(el("chartBenefit"), items, { labelW: 116, rowH: 30 });
    document.getElementById("benefitHint").textContent =
      "「非培训岗位（已填写福利标签）」是控制口径：非培训岗位中 " +
      pct(M.benefit_empty_share_nontrain || 0) + " 的福利标签为空，培训岗位则 " +
      pct(M.benefit_empty_share_train || 0) + "。培训岗位平均填写 " +
      (M.benefit_tags_avg_train || 0).toFixed(2) + " 个福利标签，非培训岗位仅 " +
      (M.benefit_tags_avg_nontrain || 0).toFixed(2) + " 个——换成同一口径后，两类岗位其它福利的差距明显收窄，但仍以培训岗位更高。";

    var tt = S.benefit.train_top.slice(0, 20).map(function (p) {
      var o = S.benefit.top_all.filter(function (q) { return q[0] === p[0]; })[0] || [p[0], p[1], p[1]];
      return { label: p[0], k: p[0], n: o[1], t: p[1], rate: p[1] / T, share: p[1] / T };
    });
    bars(el("chartTrainTags"), tt, { metric: "share", labelW: 118 });
    var ts = S.benefit.train_strings.slice(0, 18);
    el("tagHint").textContent = "共出现 " + fmtN(M.distinct_benefit_tags) + " 种不同的福利标签写法；" +
      "含「培训」字样的标签写法有 " + S.benefit.train_strings.length + " 种（下表列出高频者）。";
  }

  /* ================= 岗位描述 ================= */
  function descItems(cat) {
    var rename = { "形象与年龄等硬性条件": "形象/年龄等条件提及" };
    return S.desc.filter(function (d) { return d.cat === cat; }).map(function (d) {
      return { label: rename[d.name] || d.name, a: d.n_train / T, b: (d.n_all - d.n_train) / NT,
               tip: { a: d.n_train, b: d.n_all - d.n_train },
               diff: d.n_train / T - (d.n_all - d.n_train) / NT };
    }).filter(function (d) { return d.tip.a >= MIN_N && d.tip.b >= MIN_N; })
      .sort(function (x, y) { return y.diff - x.diff; });
  }
  function pick(items, name) {
    return items.filter(function (x) { return x.label === name; })[0];
  }

  function renderDesc() {
    var soft = descItems("软技能与任职要求");
    if (!soft.length) {
      ["chartDescSoft", "chartDescProf", "chartDescCond"].forEach(function (id) {
        el(id).innerHTML = '<div class="hint">岗位描述关键词分组尚未生成。</div>'; });
      return;
    }
    pairedBars(el("chartDescSoft"), soft, { labelW: 134, rowH: 36 });
    var learn = pick(soft, "学习能力"), serve = pick(soft, "服务意识"), worst = soft[soft.length - 1];
    el("descSoftHint").textContent = "回答第一个问题：「学习能力」在培训岗位的岗位描述中出现 " +
      (learn ? pct(learn.a) + "、非培训岗位 " + pct(learn.b) + "（相差 " +
               ((learn.a - learn.b) * 100).toFixed(1) + " 个百分点）" : "样本不足") +
      "；正向差值最大的是「" + soft[0].label + "」（" + pct(soft[0].a) + " vs " + pct(soft[0].b) + "）" +
      (serve && serve !== soft[0] ? "，「服务意识」" + pct(serve.a) + " vs " + pct(serve.b) : "") +
      "；唯一的负向项是「" + worst.label + "」（" + pct(worst.a) + " vs " + pct(worst.b) + "）。" +
      "整体看：有培训的岗位更强调学习能力、服务意识、主动性与稳定性，而更少强调逻辑分析、团队协作与组织管理。" +
      "注：「形象/年龄等条件提及」统计的是形象、年龄、身高、身体条件等词的提及率（含「年龄不限」这类写法），符号方向需谨慎解读。";

    var prof = descItems("专业与硬技能信息");
    pairedBars(el("chartDescProf"), prof, { labelW: 134, rowH: 36 });
    var open = pick(prof, "跨专业口径"), match = pick(prof, "相关/对口专业"), field = pick(prof, "特定专业背景");
    el("descProfHint").textContent = "回答第二个问题：培训岗位更常出现「专业不限 / 不限专业」的写法——" +
      (open ? pct(open.a) + " vs " + pct(open.b) : "样本不足") +
      "；同时更少要求「相关 / 对口专业」——" + (match ? pct(match.a) + " vs " + pct(match.b) : "样本不足") +
      "，也更少点名特定专业背景——" + (field ? pct(field.a) + " vs " + pct(field.b) : "样本不足") +
      "。也就是说：有培训的岗位更符合「专业门槛宽松、靠培训补足技能」的用人逻辑，" +
      "而不是「先专业对口、再上岗」。";

    var cond = descItems("工作条件与福利话术");
    pairedBars(el("chartDescCond"), cond, { labelW: 134, rowH: 36 });
    var tt = pick(cond, "提成奖金");
    el("descCondHint").textContent = "这一组只用于解释：岗位描述正文里经常把福利待遇一起写进去，" +
      "所以会数出「提成奖金」「双休与假期」这类词（提成奖金 " +
      (tt ? pct(tt.a) + " vs " + pct(tt.b) : "-") + "）。" +
      "它们与第四节「标注培训的岗位福利标签填得更满」是同一现象，不应作为任职要求来解读。";
  }

  /* ================= 交叉 ================= */
  function renderCross() {
    var map = {};
    S.edu_exp.forEach(function (r) {
      var i = r.k.indexOf("|");
      (map[r.k.slice(0, i) + "\u0001" + r.k.slice(i + 1)] = r);
    });
    var eRows = S.edu.filter(function (r) { return r.n >= 1000; })
      .map(function (r) { return r.k; })
      .sort(function (a, b) { return EDU.indexOf(a) - EDU.indexOf(b); });
    var xCols = S.exp.filter(function (r) { return r.n >= 1000; })
      .map(function (r) { return r.k; })
      .sort(function (a, b) { return EXP.indexOf(a) - EXP.indexOf(b); });
    heat(el("chartHeat"), eRows, xCols, function (r, c) {
      var o = map[r + "\u0001" + c];
      return o ? { n: o.n, t: o.t, rate: rate(o) } : null;
    });

    var months = S.month.map(function (r) { return r.k; });
    var mm = byPairs(S.macro_month, "|");
    var series = S.macro.slice(0, 6).map(function (mc, i) {
      return { name: mc.k, color: SERIES[i % SERIES.length],
        data: months.map(function (m) {
          var o = mm[mc.k] && mm[mc.k][m];
          return o && o.n >= MIN_N ? o.t / o.n : null; }) };
    });
    lineChart(el("chartMacroTrend"), months.map(monthLab), series, { ref: ALL, height: 300, thin: true });
  }

  /* ================= 结论与方法 ================= */
  function renderMethod() {
    var m0 = S.month[0].k, mL = S.month[S.month.length - 1].k;
    var r0 = S.month[0].t / S.month[0].n;
    var rL = S.month[S.month.length - 1].t / S.month[S.month.length - 1].n;
    var peak = S.month.slice().sort(function (a, b) { return b.t / b.n - a.t / a.n; })[0];
    var topMacroShare = S.macro.slice(0, 3).reduce(function (s, r) { return s + r.t; }, 0) / T;
    var highRate = S.macro.filter(function (r) { return r.n >= 3000; })
      .sort(function (a, b) { return b.rate - a.rate; });
    var sizeMap = {};
    S.size.forEach(function (r) { sizeMap[r.k] = r; });
    var bigS = sizeMap["10000人以上"], smallS = sizeMap["20-99人"];
    var medT = S.salary.train.median, medNT = S.salary.nontrain.median;
    var higher = 0, lower = 0;
    Object.keys(S.salary.by_macro).forEach(function (k) {
      var v = S.salary.by_macro[k];
      if (v.train && v.nontrain && v.train.n >= 200 && v.nontrain.n >= 200) {
        if (v.train.median > v.nontrain.median) higher++; else if (v.train.median < v.nontrain.median) lower++;
      }
    });
    var insMap = {};
    S.benefit.other_keys.forEach(function (o) { insMap[o.name] = o; });
    var ins = insMap["五险一金类"], lv = insMap["带薪休假"];
    var eduMap = {}; S.edu.forEach(function (r) { eduMap[r.k] = r; });
    var expMap = {}; S.exp.forEach(function (r) { expMap[r.k] = r; });
    var descMap = {}; S.desc.forEach(function (d) { descMap[d.name] = d; });
    function dshare(name) {
      var d = descMap[name];
      if (!d) return null;
      return { a: d.n_train / T, b: (d.n_all - d.n_train) / NT };
    }
    var famList = (S.skillfam || []).filter(function (r) { return r.n >= 1000; })
      .map(function (r) {
        return { label: r.k.replace("（出现在技能字段）", ""), a: r.t / T, b: (r.n - r.t) / NT };
      }).sort(function (x, y) { return (y.a - y.b) - (x.a - x.b); });
    var learnCap = dshare("学习能力"), svc = dshare("服务意识");
    var openSpec = dshare("跨专业口径"), fitSpec = dshare("相关/对口专业");

    var insNT = (ins.n_all - ins.n_train) / NT, lvNT = (lv.n_all - lv.n_train) / NT;
    var top3Share = S.macro.slice(0, 3).reduce(function (s, r) { return s + r.t; }, 0) / T;
    var nonEdu = S.macro.filter(function (r) { return r.k !== "教育培训" && r.n >= 30000; });
    var topDense = nonEdu.slice().sort(function (a, b) { return b.rate - a.rate; });
    var lowDense = nonEdu.slice().sort(function (a, b) { return a.rate - b.rate; });
    var indBig = S.ind.filter(function (r) { return r.n >= 60000; });
    var indTop = indBig.slice().sort(function (a, b) { return b.rate - a.rate; });
    var indLow = indBig.slice().sort(function (a, b) { return a.rate - b.rate; });
    var trendWord = rL < r0 - 0.002 ? "年内持续走低" : (rL > r0 + 0.002 ? "年内逐步走高" : "年内基本平稳");
    var density = (M.benefit_tags_avg_train
      ? "（培训岗位平均 " + M.benefit_tags_avg_train.toFixed(2) + " 个福利标签，非培训岗位 " +
        M.benefit_tags_avg_nontrain.toFixed(2) + " 个）"
      : "");

    var cards = [
      ["总体：" + pct(ALL, 2) + " 的岗位把「培训」写进福利标签",
       "在 " + fmtN(N) + " 条全职岗位中，" + fmtN(T) + " 条福利标签含「培训」（带薪培训、免费培训、专业培训等），占 " +
       pct(ALL, 2) + "；若把带教、师徒、学徒、培养、进修类标签一并计入，比例升至 " +
       pct((T + M.broad_extra) / N, 2) + "。这说明培训是相对稀缺、被少数岗位明确承诺的福利。"],
      ["趋势：" + trendWord + "，" + monthLab(m0) + pct(r0) + " → " + monthLab(mL) + pct(rL),
       "最高出现在" + monthLab(peak.k) + "（" + pct(peak.t / peak.n) + "），" + monthLab(mL) +
       "为 " + pct(rL) + "，年内变化 " + ((rL - r0) * 100).toFixed(2) + " 个百分点" +
       "（相对幅度 " + ((rL / r0 - 1) * 100).toFixed(0) + "%）；" +
       "期间 4 月出现一次小幅反弹（" + pct(S.month[3].t / S.month[3].n) + "）。"],
      ["结构：销售与一线服务岗位贡献了过半培训岗位",
       "培训率最高的是非教育类的一线岗位——" +
       topDense.slice(0, 3).map(function (r) { return r.k + "（" + pct(r.rate) + "）"; }).join("、") +
       "；最低的是" + lowDense.slice(0, 3).map(function (r) { return r.k + "（" + pct(r.rate) + "）"; }).join("、") +
       "。按存量看，销售/营销、零售/餐饮/生活服务、客服三类合计占全部培训岗位的 " + pct(top3Share) + "。" +
       "（教育培训行业自身培训率 " + pct(S.macro.filter(function (r) { return r.k === "教育培训"; })[0].rate) +
       "，属行业自指，未计入上面的对比。）"],
      ["行业：保险 34.6% 断层第一，互联网 13.2%",
       "行业维度上，" + indTop.slice(0, 3).map(function (r) { return r.k + "（" + pct(r.rate) + "）"; }).join("、") +
       " 的培训标注率远高于全站 " + pct(ALL, 2) + "；而 " +
       indLow.slice(0, 4).map(function (r) { return r.k + "（" + pct(r.rate) + "）"; }).join("、") +
       " 等行业仅 2%~4%。保险、互联网与电商行业把培训当作标准化入职流程的一部分。"],
      ["城市：一线城市的培训标注率反而最低",
       S.tier.slice().sort(function (a, b) { return a.rate - b.rate; })
         .map(function (r) { return r.k + " " + pct(r.rate); }).join(" < ") +
       "。一线城市岗位以研发、专业技术与总部职能为主，更少用福利标签来承诺培训；下沉市场的销售、服务与制造岗位则相反。"],
      ["规模：万人以上企业的培训标注率是中小企业的 3.9 倍",
       "10000 人以上企业 " + pct(bigS.rate) + "，20-99 人企业 " + pct(smallS.rate) + "，20 人以下 " +
       pct(sizeMap["20人以下"].rate) + "，1000 人以上企业整体明显更高。" +
       "培训在这里更像是规范化用工与雇主品牌的一部分。"],
      ["门槛：学历与经验要求越低，越常标注培训",
       "高中 " + pct(eduMap["高中"].rate) + "、中专/中技 " + pct(eduMap["中专/中技"].rate) +
       "、学历不限 " + pct(eduMap["学历不限"].rate) + "，明显高于大专 " + pct(eduMap["大专"].rate) +
       "、本科 " + pct(eduMap["本科"].rate) + "、硕士 " + pct(eduMap["硕士"].rate) + "；" +
       "经验维度上「无经验」岗位最高（" + pct(expMap["无经验"].rate) + "），而 3-5 年（" +
       pct(expMap["3-5年"].rate) + "）与 10 年以上（" + pct(expMap["10年以上"].rate) + "）不足 3.1%。"],
      ["薪酬：整体差异很小，且主要由职位结构驱动",
       "培训岗位中位月薪 " + fmtN(medT) + " 元，非培训岗位 " + fmtN(medNT) + " 元，但两组均值几乎持平（" +
       fmtN(S.salary.train.mean) + " 元 vs " + fmtN(S.salary.nontrain.mean) + " 元）；" +
       "控制职位大类后，样本充足的大类中有 " + higher + " 个培训岗位中位薪更高、" + lower + " 个更低。" +
       "因此不存在「有培训＝薪资更低」的系统性关系，差异主要来自岗位构成。"],
      ["技能：有培训的岗位要求更多技能，而非更少",
       "培训岗位平均 " + M.avg_skill_train.toFixed(2) + " 个技能标签（非培训 " + avgSkillNT.toFixed(2) +
       " 个），岗位描述平均 " + Math.round(M.avg_declen_train) + " 字（非培训 " + Math.round(avgLenNT) +
       " 字）。两组岗位「技能标签为空」的比例接近，差异并非填写率造成——培训更多出现在职责更复杂、更强调上手能力的岗位上。"],
      ["其它福利：覆盖率更高，但差距有相当部分来自填写完整度",
       "培训岗位 " + pct(ins.n_train / T) + " 标注五险一金/社保、" + pct(lv.n_train / T) +
       " 标注带薪休假，而非培训岗位整体仅 " + pct(insNT) + " 与 " + pct(lvNT) + "。" +
       "但这组对比需要修正口径：非培训岗位有 " + pct(M.benefit_empty_share_nontrain || 0) +
       " 完全没填福利标签，培训岗位则全部填写（平均 " + (M.benefit_tags_avg_train || 0).toFixed(2) +
       " vs " + (M.benefit_tags_avg_nontrain || 0).toFixed(2) + " 个）。改用「非培训岗位中已填写福利标签者」对照后差距明显收窄，但仍以培训岗位更高——培训并未挤占其它福利。"],
      ["技能类型：培训与「教育/服务/销售」类技能同向，与硬技能反向",
       "把技能标签归为 20 类后，与培训最同向的是" +
       famList.slice(0, 3).map(function (r) { return r.label + "（" + pct(r.a) + " vs " + pct(r.b) + "）"; }).join("、") +
       "；最反向的是" +
       famList.slice(-3).reverse().map(function (r) { return r.label + "（" + pct(r.a) + " vs " + pct(r.b) + "）"; }).join("、") +
       "。即：培训标签更多与「靠服务与沟通上手」的技能同时出现，而与财务、机械、软件等专业硬技能的岗位呈负相关。"],
      ["软技能与专业口径：更看重学习能力，也更少限定专业",
       "培训岗位的岗位描述更常提到" +
       (learnCap ? "「学习能力」（" + pct(learnCap.a) + " vs " + pct(learnCap.b) + "）" : "软技能") +
       (svc ? "、「服务意识」（" + pct(svc.a) + " vs " + pct(svc.b) + "）" : "") +
       "；专业口径上更常写" +
       (openSpec ? "「专业不限/不限专业」（" + pct(openSpec.a) + " vs " + pct(openSpec.b) + "）" : "「专业不限」") +
       (fitSpec ? "，同时更少要求「相关/对口专业」（" + pct(fitSpec.a) + " vs " + pct(fitSpec.b) + "）" : "") +
       "。有培训的岗位更像「专业门槛宽松、靠培训补足技能」的用人逻辑。"],
      ["口径与局限（阅读前提）",
       "「培训岗位」＝福利标签中出现「培训」字样的岗位；全部结论为描述性统计，未做结构分解或因果推断。" +
       "福利标签的填写完整度、行业与职位结构都会影响标注率，小样本维度（如「无经验」「初中及以下」）的比率波动更大，页面已对样本量设下限。"]
    ];
    el("headlines").innerHTML = cards.map(function (c, i) {
      return '<div class="card"><div class="t"><i>0' + (i + 1) + "</i>" + esc(c[0]) + "</div><p>" + c[1] + "</p></div>";
    }).join("");

    el("methodData").innerHTML = [
      "数据集：全职岗位招聘信息（发布区间 <b>" + M.months[0].m + " ~ " + M.months[M.months.length - 1].m + "</b>），有效记录 <b>" + fmtN(N) + "</b> 条。",
      "字段：发布时间、职业类别、工作城市、薪资水平、<b>岗位福利</b>、学历要求、经验要求、技能标签、岗位描述、企业规模、公司行业等。",
      "职业类别共 <b>" + M.distinct_roles + "</b> 类，页面按 17 个职位大类归并（如财务/金融/法务、销售/营销、研发/技术、生产制造、互联网运营、客服等）。",
      "岗位福利为标签列表，共出现 <b>" + fmtN(M.distinct_benefit_tags) + "</b> 种不同写法；公司行业为多值字段。"
    ].map(function (x) { return "<li>" + x + "</li>"; }).join("");

    el("methodRules").innerHTML = [
      "<b>培训岗位</b>定义：岗位福利标签中包含「培训」字样的标签（如带薪培训、专业培训、免费培训、组织培训、教育培训、免费培训上岗等）。",
      "广义口径（带教、师带徒、学徒、培养、进修）仅作参考，单独统计为 <b>" + fmtN(M.broad_extra) + "</b> 条。",
      "薪资：取薪资区间中位数（如 5000-8000 元计 6500 元）；「面议」与时薪岗位不计入薪资统计，13 薪不折算。",
      "比率展示门槛：默认样本量 ≥ <b>100</b> 条（页面可切换 500 / 1000）；在线图中，单点样本量 <b>" + MIN_N + "</b> 条以下的比率不展示。",
      "岗位描述关键词共 <b>" + S.desc.length + "</b> 组，全部为对描述正文的规则匹配，并分为软技能、专业与硬技能、工作条件与福利话术三类；" +
      "第三类（提成奖金、双休等）之所以出现，是因为描述正文常把福利待遇一并写入，不应作为任职要求解读。",
      "技能标签按规则归为 <b>20</b> 类技能类型（含「其他技能标签」）；该字段本身混有行业/领域类标签与福利类标签，因此类型归并是启发式的，页面同时给出高频标签便于核对。",
      "结果均为描述性统计，不代表因果关系：福利标签的填写完整度、行业与职位结构都会影响标注率；页面未做结构分解或回归控制。",
      "本页所有内容基于全量数据的聚合结果，不含任何原始记录、企业名称、岗位描述原文或可反查的单一岗位信息。"
    ].map(function (x) { return "<li>" + x + "</li>"; }).join("");

    var tags = S.benefit.train_strings.slice(0, 24).map(function (p) {
      return "<span>" + esc(p[0]) + "<b>" + fmtN(p[1]) + "</b></span>";
    }).join("");
    el("tagList").innerHTML = tags;

    el("footInfo").innerHTML = "<b>全职岗位「培训福利」现状与趋势分析</b> ｜ 样本 " + fmtN(N) +
      " 条 ｜ 区间 " + M.months[0].m + " ~ " + M.months[M.months.length - 1].m +
      " ｜ 页面生成于 " + M.generated_at + "（页面仅含聚合统计，原始数据不公开）";
  }
  function orders(map, ord) {
    return ord.filter(function (k) { return map[k] && map[k].n >= 1000; })
      .map(function (k) { return k + " " + pct(map[k].rate); }).slice(0, 4).join("、");
  }

  /* ================= 初始化 ================= */
  bindUI();
  var rt = null;
  window.addEventListener("resize", function () {
    clearTimeout(rt); rt = setTimeout(function () { init(); }, 220);
  });
  init();
})();

