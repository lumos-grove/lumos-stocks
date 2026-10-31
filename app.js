/* Lumos · 投资记录 — 交易记录 + 原因记录 */

const fmt = (n, digits = 2) =>
  Number(n).toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const fmtInt = (n) => Number(n).toLocaleString("zh-CN", { maximumFractionDigits: 0 });
const signed = (n, digits = 2) => (n >= 0 ? "+" : "") + fmt(n, digits);
const pnlClass = (n) => (n >= 0 ? "pos" : "neg");

const PALETTE = [
  "#b0791b", "#1d2333", "#a33327", "#2e6b46", "#4a6fa5", "#7a4a6e",
  "#c98f2d", "#5c6650", "#8c5a2b", "#365a7c",
];

/* ---------- 组合构成 ---------- */

function renderIndustries(d) {
  const svg = document.getElementById("donut");
  const legend = document.getElementById("donut-legend");
  document.getElementById("donut-total").textContent = fmt(d.stats.costTotal, 0);

  const cx = 100, cy = 100, r = 78, ir = 50;
  let angle = -Math.PI / 2;
  let paths = "", legendHtml = "";
  d.composition.forEach((ind, i) => {
    const frac = ind.cost / d.stats.costTotal;
    const a0 = angle, a1 = angle + frac * Math.PI * 2;
    angle = a1;
    const large = frac > 0.5 ? 1 : 0;
    const p = (a, rad) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
    const [x0, y0] = p(a0, r), [x1, y1] = p(a1, r);
    const [x2, y2] = p(a1, ir), [x3, y3] = p(a0, ir);
    const color = PALETTE[i % PALETTE.length];
    paths += `<path d="M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${ir},${ir} 0 ${large} 0 ${x3},${y3} Z" fill="${color}"><title>${ind.name} ${ind.pct}%</title></path>`;
    legendHtml += `<li><span class="swatch" style="background:${color}"></span><span class="lg-name">${ind.name}</span><span class="lg-num">${ind.pct}%</span></li>`;
  });
  svg.innerHTML = paths;
  legend.innerHTML = legendHtml;
  document.getElementById("industry-bars").innerHTML = d.industries.map((ind) => `
    <div class="industry-row">
      <span class="industry-name">${ind.name}</span>
      <div class="industry-track"><div class="industry-fill" style="width:${Math.min(100, ind.pct / 20 * 100)}%"></div></div>
      <span class="industry-value">${ind.pct}% · ${ind.names.length} 只</span>
    </div>`).join("");
  document.getElementById("industry-foot").textContent =
    `规则上限：单一行业 ≤ 20% 入金；现金 ${fmt((d.stats.capital - d.stats.costTotal) / d.stats.capital * 100)}% 尚未投入。`;
}

const QUOTES = [
  "股票就是公司的所有权",
  "市场先生是来服务你的，不是来指导你的",
  "便宜是硬道理",
  "要清楚自己知道什么、不知道什么",
  "去有鱼的地方钓鱼",
  "财富的本质是经济体中的购买力占比",
];

/* ---------- 总览条 ---------- */

function renderHeader(d) {
  document.getElementById("dateline").textContent = `数据快照 ${d.dataDate}`;
  document.getElementById("foot-date").textContent = d.dataDate;
  document.getElementById("hero-kicker").textContent =
    `自 ${d.firstTradeDate} 起 · 数据截至 ${d.dataDate}`;
  document.getElementById("hero-quote").textContent =
    QUOTES[Math.floor(Math.random() * QUOTES.length)];

  const s = d.stats;
  const items = [
    { label: "持仓市值", num: fmt(s.marketTotal), sub: `成本 ${fmt(s.costTotal)}` },
    { label: "浮动盈亏", num: signed(s.pnl), sub: signed(s.pnlPct) + "%", cls: pnlClass(s.pnl) },
    { label: "年税前分红", num: fmt(s.annualDiv), sub: `已到账 ${fmt(s.dividendTotal)}` },
    { label: "持仓数量", num: s.holdingCount + " 只", sub: `收盘快照 ${d.dataDate}` },
  ];
  document.getElementById("ticker").innerHTML = items
    .map(
      (i) => `
      <div class="tick">
        <div class="tick-label">${i.label}</div>
        <div class="tick-num ${i.cls || ""}">${i.num}</div>
        <div class="tick-sub">${i.sub}</div>
      </div>`
    )
    .join("");
}

/* ---------- 持仓与理由 ---------- */

function renderRecent(d) {
  const wrap = document.getElementById("recent-strip");
  if (!d.recent.length) {
    wrap.innerHTML = `<p style="color:var(--ink-faint)">暂无交易记录</p>`;
    return;
  }
  wrap.innerHTML = d.recent
    .map(
      (t) => {
        const h = d.holdings.find((x) => x.code === t.code);
        const prof = h ? h.profile : "";
        return `
      <div class="recent-item">
        <div class="r-date">${t.date}</div>
        <div class="r-main">
          <span class="r-name">${t.name}</span>
          <span class="r-code">${t.code}</span>
        </div>
        <div class="r-detail">
          <span class="r-side ${t.side === "买入" ? "side-buy" : "side-sell"}">${t.side}</span>
          <span class="r-shares">${fmtInt(t.shares)} 股 @ ${fmt(t.price)}</span>
        </div>
        ${prof ? `<div class="r-profile">${prof}</div>` : ""}
      </div>`;
      }
    )
    .join("");
}

function renderCards(d) {
  const wrap = document.getElementById("holding-cards");
  wrap.innerHTML = d.holdings
    .map(
      (h, i) => `
      <div class="hcard reveal" data-i="${i}" role="button" tabindex="0" aria-label="查看 ${h.name} K 线">
        <div class="hcard-head">
          <div class="hcard-title">
            <div class="hcard-name-line"><h3>${h.name}</h3><span class="hcard-meta">${h.code}</span></div>
            <div class="hcard-days">已持有 ${h.holdDays} 天</div>
          </div>
          <div class="hcard-pnl ${pnlClass(h.pnl)}">
            <div class="hcard-pnl-num">${signed(h.pnl)}</div>
            <div class="hcard-pnl-pct">${signed(h.pnlPct, 1)}%</div>
          </div>
        </div>
        <p class="hcard-reason">${h.profile || "（行业地位与特点待补录）"}</p>
        <div class="hcard-price">
          <div class="hp-item">
            <span class="hp-k">成本</span>
            <span class="hp-v">${fmt(h.unitCost, 3)}</span>
          </div>
          <div class="hp-arrow ${pnlClass(h.pnl)}">${h.pnl >= 0 ? "↗" : "↘"}</div>
          <div class="hp-item">
            <span class="hp-k">现价</span>
            <span class="hp-v ${pnlClass(h.pnl)}">${fmt(h.closePrice)}</span>
          </div>
          <div class="hp-item hp-shares">
            <span class="hp-k">股数</span>
            <span class="hp-v">${fmtInt(h.shares)}</span>
          </div>
        </div>
        <div class="hcard-foot">
          <span class="hcard-foot-action">
            <span>${h.tradeCount} 笔成交</span><span class="hcard-foot-arrow">查看 K 线 ↗</span>
          </span>
          <span class="hcard-industry">${h.industry}${h.industryDetail ? ` · ${h.industryDetail}` : ""}</span>
        </div>
      </div>`
    )
    .join("");
  wrap.querySelectorAll(".hcard").forEach((card) => {
    const open = () => openModal(d.holdings[Number(card.dataset.i)]);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });
}

/* ---------- K 线弹窗 ---------- */

const chart = { bars: [], geom: null, holding: null };

function openModal(h) {
  chart.holding = h;
  document.getElementById("modal-title").textContent = `${h.name}（${h.code}）`;
  document.getElementById("modal-sub").textContent =
    `${h.industry} · 首次买入 ${h.firstBuy} · ${h.reason || ""}`;

  const totalPnl = h.pnl;
  document.getElementById("modal-stats").innerHTML = [
    ["股数 / 成本", `${fmtInt(h.shares)} @ ${fmt(h.unitCost, 3)}`],
    ["现价（" + h.closeDate + "）", fmt(h.closePrice)],
    ["浮动", `<span class="${pnlClass(totalPnl)}">${signed(totalPnl)}</span>`],
    ["成交笔数", `${h.tradeCount} 笔`],
  ]
    .map(([k, v]) => `<div class="mstat"><div class="k">${k}</div><div class="v">${v}</div></div>`)
    .join("");

  document.getElementById("modal-trades").innerHTML = h.trades
    .map(
      (t) => `
      <div class="trade-line">
        <span>${t.date}</span>
        <span class="${t.side === "买入" ? "side-buy" : "side-sell"}">${t.side}</span>
        <span class="t-shares">${fmtInt(t.shares)} 股 @ ${fmt(t.price)}</span>
      </div>`
    )
    .join("");

  const modal = document.getElementById("modal");
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    drawChart(h);
    const scroll = document.getElementById("chart-scroll");
    scroll.scrollLeft = scroll.scrollWidth;
  });
}

function closeModal() {
  document.getElementById("modal").hidden = true;
  document.body.style.overflow = "";
}

function drawChart(h) {
  const canvas = document.getElementById("kline-chart");
  const wrap = canvas.parentElement;
  const bars = h.klines;
  const W = Math.max(wrap.clientWidth, bars.length * 5.5 + 66);
  const H = Math.min(360, Math.max(240, Math.round(W * 0.42)));
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const css = getComputedStyle(document.documentElement);
  const C = {
    ink: css.getPropertyValue("--ink").trim(),
    faint: css.getPropertyValue("--ink-faint").trim(),
    line: css.getPropertyValue("--line").trim(),
    up: css.getPropertyValue("--up").trim(),
    down: css.getPropertyValue("--down").trim(),
    amber: css.getPropertyValue("--amber").trim(),
  };

  document.getElementById("chart-range").textContent =
    `${h.klineStart} 起 · 可横向滚动`;
  if (!bars.length) {
    ctx.fillStyle = C.faint;
    ctx.font = "13px sans-serif";
    ctx.fillText("暂无 K 线数据", 20, 40);
    return;
  }

  const padL = 8, padR = 58, padT = 14, padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const allPrices = bars.flatMap((b) => [b.h, b.l]).concat(
    h.trades.map((t) => t.price), [h.unitCost]
  );
  let minP = Math.min(...allPrices), maxP = Math.max(...allPrices);
  const margin = (maxP - minP) * 0.06 || 0.01;
  minP -= margin; maxP += margin;

  const n = bars.length;
  const step = plotW / n;
  const bw = Math.max(1.5, step * 0.62);
  const x = (i) => padL + step * (i + 0.5);
  const y = (p) => padT + ((maxP - p) / (maxP - minP)) * plotH;

  // 网格与价格刻度
  ctx.strokeStyle = C.line;
  ctx.fillStyle = C.faint;
  ctx.font = "10px 'IBM Plex Mono', monospace";
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const p = minP + ((maxP - minP) * g) / 4;
    const yy = y(p);
    ctx.beginPath();
    ctx.moveTo(padL, yy);
    ctx.lineTo(W - padR, yy);
    ctx.stroke();
    ctx.fillText(fmt(p, 2), W - padR + 6, yy + 3);
  }
  // 月份刻度
  let lastMonth = "";
  ctx.textAlign = "center";
  bars.forEach((b, i) => {
    const m = b.d.slice(0, 7);
    if (m !== lastMonth) {
      lastMonth = m;
      ctx.fillText(m, x(i), H - 8);
    }
  });
  ctx.textAlign = "left";

  // 蜡烛
  bars.forEach((b, i) => {
    const rising = b.c >= b.o;
    const color = rising ? C.up : C.down;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    const xx = x(i);
    ctx.beginPath();
    ctx.moveTo(xx, y(b.h));
    ctx.lineTo(xx, y(b.l));
    ctx.stroke();
    const yO = y(b.o), yC = y(b.c);
    const top = Math.min(yO, yC);
    const height = Math.max(1, Math.abs(yO - yC));
    ctx.fillRect(xx - bw / 2, top, bw, height);
  });

  // 成本线
  if (h.unitCost >= minP && h.unitCost <= maxP) {
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padL, y(h.unitCost));
    ctx.lineTo(W - padR, y(h.unitCost));
    ctx.stroke();
    ctx.restore();
  }

  // 买卖点（取该交易日或之后最近一个交易日的位置）
  const dateIndex = new Map(bars.map((b, i) => [b.d, i]));
  h.trades.forEach((t) => {
    let idx = dateIndex.get(t.date);
    if (idx === undefined) {
      idx = bars.findIndex((b) => b.d >= t.date);
      if (idx === -1) idx = bars.length - 1;
    }
    const xx = x(idx);
    const yy = y(t.price);
    const isBuy = t.side === "买入";
    const color = isBuy ? C.up : C.down;
    const arrowH = 12;
    const arrowW = 8;
    const gap = 3;
    // 买入：箭头在价格下方，尖朝上指向价格；卖出：在上方，尖朝下
    const tipY = yy + (isBuy ? gap : -gap);
    const baseY = tipY + (isBuy ? arrowH : -arrowH);

    // 箭头（尖指向成交价）
    ctx.fillStyle = color;
    ctx.strokeStyle = "#fbf8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xx, tipY);
    ctx.lineTo(xx - arrowW, baseY);
    ctx.lineTo(xx + arrowW, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 标签：日期 + 股数，颜色与方向对应
    const label = `${t.date.slice(5)} ${t.side === "买入" ? "买" : "卖"}${t.shares}`;
    ctx.font = "600 10.5px 'IBM Plex Mono', monospace";
    const tw = ctx.measureText(label).width;
    const padX = 5;
    const boxH = 16;
    const boxW = tw + padX * 2;
    let boxX = xx - boxW / 2;
    boxX = Math.max(padL + 2, Math.min(W - padR - boxW - 2, boxX));
    const boxY = isBuy ? baseY + 4 : baseY - 4 - boxH;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 4);
    ctx.fill();
    ctx.fillStyle = "#f5f0e4";
    ctx.textAlign = "center";
    ctx.fillText(label, boxX + boxW / 2, boxY + boxH / 2 + 3.5);
    ctx.textAlign = "left";
  });

  chart.bars = bars;
  chart.geom = { padL, padR, padT, plotW, plotH, step, minP, maxP, W, H, y, x };
}

function setupChartScroll() {
  const scroll = document.getElementById("chart-scroll");
  window.addEventListener("resize", () => {
    if (!document.getElementById("modal").hidden && chart.holding) {
      const atEnd = scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth - 2;
      drawChart(chart.holding);
      if (atEnd) scroll.scrollLeft = scroll.scrollWidth;
    }
  });
  scroll.addEventListener("wheel", (e) => {
    if (scroll.scrollWidth <= scroll.clientWidth || e.shiftKey) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!delta) return;
    e.preventDefault();
    scroll.scrollLeft += delta;
  }, { passive: false });
  let pointer = null;
  scroll.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointer = { x: e.clientX, left: scroll.scrollLeft };
    scroll.setPointerCapture(e.pointerId);
    scroll.classList.add("is-dragging");
  });
  scroll.addEventListener("pointermove", (e) => {
    if (pointer) scroll.scrollLeft = pointer.left - (e.clientX - pointer.x);
  });
  const release = () => { pointer = null; scroll.classList.remove("is-dragging"); };
  scroll.addEventListener("pointerup", release);
  scroll.addEventListener("pointercancel", release);
}

/* ---------- 交易记录 ---------- */

function renderTrades(d) {
  const tbody = document.querySelector("#ttable tbody");
  const state = { side: "全部" };

  const apply = () => {
    const rows = d.trades.filter((t) => state.side === "全部" || t.side === state.side);
    tbody.innerHTML = rows.length
      ? rows
          .map(
            (t) => `
        <tr>
          <td class="tdate">${t.date}</td>
          <td><span class="hname">${t.name}</span><span class="hcode">${t.code}</span></td>
          <td><span class="side ${t.side === "买入" ? "side-buy" : "side-sell"}">${t.side}</span></td>
          <td class="num">${fmtInt(t.shares)}</td>
          <td class="num">${fmt(t.price)}</td>
          <td class="num">${fmt(t.amount)}</td>
          <td class="num">${fmt(t.fee)}</td>
        </tr>`
          )
          .join("")
      : `<tr><td colspan="7" style="text-align:center;color:var(--ink-faint);padding:32px">没有匹配的交易</td></tr>`;
  };

  document.querySelectorAll("#trade-filters .jfilter").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#trade-filters .jfilter").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.side = btn.dataset.f;
      apply();
    });
  });

  apply();
}

/* ---------- 动效 ---------- */

function setupReveal() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.06 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

/* ---------- 启动 ---------- */

// 数据由 build_data.py 生成，内联在 data.js 里（避免 file:// 下 fetch 受限）
Promise.resolve(window.LUMOS_DATA)
  .then((d) => {
    renderHeader(d);
    renderRecent(d);
    renderIndustries(d);
    renderCards(d);
    renderTrades(d);
    setupReveal();
    setupChartScroll();
    document.getElementById("modal-close").addEventListener("click", closeModal);
    document.getElementById("modal-backdrop").addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  })
  .catch((err) => {
    document.querySelector("main").innerHTML =
      `<p style="padding:80px 0;color:var(--ink-faint)">数据加载失败：${err.message}</p>`;
  });
