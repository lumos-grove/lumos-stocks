const data = window.LUMOS_DATA;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = (value, digits = 2) => `¥${Number(value).toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const number = (value, digits = 2) => Number(value).toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const signed = (value, digits = 2) => `${value >= 0 ? "+" : ""}${number(value, digits)}`;
const pnlClass = (value) => value >= 0 ? "positive" : "negative";
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const emptyState = (title, copy) => `<div class="empty-state"><strong>${title}</strong><p>${copy}</p></div>`;
const routes = ["overview", "holdings", "trades", "watchlist", "notes"];
const routeNames = { overview: "投资总览", holdings: "我的持仓", trades: "交易记录", watchlist: "观察清单", notes: "投资笔记" };
const colors = ["#244b40", "#c75932", "#5b7e68", "#d58a5f", "#87a28b", "#b9754d", "#d7d5c8"];
const riskGroups = [
  { name: "居民消费", industries: ["食品饮料", "家用电器"] },
  { name: "利率与信用", industries: ["银行"] },
  { name: "资本市场景气", industries: ["非银金融"] },
  { name: "政策定价", industries: ["通信", "环保", "公用事业"] },
  { name: "特许期限与流量", industries: ["交通运输"] },
  { name: "地产租金与广告", industries: ["房地产", "传媒"] },
  { name: "医药医疗", industries: ["医药生物"] },
  { name: "商品价格", industries: ["石油石化", "有色金属"] },
];
const state = { side: "全部" };
const chartState = { holding: null, frame: 0, drag: null };
const principles = [
  "股票就是公司的所有权",
  "市场先生是来服务你的，不是来指导你的",
  "便宜是硬道理",
  "要清楚自己知道什么、不知道什么",
  "去有鱼的地方钓鱼",
  "财富的本质是经济体中的购买力占比",
];

function setupPrinciples() {
  const button = $("#principle-quote");
  const text = $("#principle-text");
  let index = Math.floor(Math.random() * principles.length);
  let timer;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const show = () => {
    text.textContent = principles[index];
    $("#principle-index").textContent = `${String(index + 1).padStart(2, "0")} / 06`;
  };
  const next = () => {
    button.classList.add("is-changing");
    setTimeout(() => {
      index = (index + 1) % principles.length;
      show();
      button.classList.remove("is-changing");
    }, reduceMotion.matches ? 0 : 300);
  };
  const restart = () => {
    clearInterval(timer);
    if (!reduceMotion.matches) timer = setInterval(next, 8000);
  };
  button.addEventListener("click", () => { next(); restart(); });
  document.addEventListener("visibilitychange", () => document.hidden ? clearInterval(timer) : restart());
  reduceMotion.addEventListener("change", restart);
  show();
  restart();
}

function renderHeader() {
  $("#data-date").textContent = data.dataDate;
  $("#data-date").dateTime = data.dataDate;
  $("#first-trade-date").textContent = data.firstTradeDate;
  $("#nav-holding-count").textContent = data.stats.holdingCount;
  $("#nav-trade-count").textContent = data.trades.length;
  $("#nav-watchlist-count").textContent = data.watchlist?.stocks?.length || 0;
  $("#nav-note-count").textContent = window.LUMOS_NOTES?.length || 0;
  $("#trade-total-heading").textContent = data.trades.length;
}

function renderOverview() {
  const s = data.stats;
  const cash = s.capital - s.costTotal;
  const cashPct = cash / s.capital * 100;
  const investedPct = s.costTotal / s.capital * 100;
  const topFive = data.composition.slice(0, 5).reduce((sum, item) => sum + item.cost, 0);
  const featured = [];
  let featuredCost = 0;
  for (const item of data.composition) {
    featured.push(item);
    featuredCost += item.cost;
    if (featuredCost / s.costTotal * 100 >= 60) break;
  }
  const metrics = [
    { label: "持仓市值", code: "MARKET VALUE", value: money(s.marketTotal), foot: `成本 ${money(s.costTotal)}` },
    { label: "浮动盈亏", code: "UNREALIZED P/L", value: signed(s.pnl), foot: `${signed(s.pnlPct)}% · 按摊薄成本`, cls: pnlClass(s.pnl) },
    { label: "今年总分红", code: "DIVIDENDS RECEIVED", value: money(s.dividendTotal), foot: "2026 年已到账 · 扣除已确认税款" },
    { label: "可用资金", code: "AVAILABLE CASH", value: money(cash), foot: `占入金 ${number(cashPct)}% · 入金减成本倒推` },
  ];
  $("#overview-metrics").innerHTML = metrics.map((item) => `
    <article class="metric">
      <div class="metric-label">${item.label}<span>${item.code}</span></div>
      <div class="metric-value ${item.cls || ""}">${item.value}</div>
      <div class="metric-foot">${item.foot}</div>
    </article>`).join("");

  $("#capital-bar").innerHTML = `<span class="invested" style="width:${investedPct}%" title="持仓成本 ${number(investedPct)}%"></span><span class="cash" style="width:${cashPct}%" title="可用资金 ${number(cashPct)}%"></span>`;
  $("#capital-bar").setAttribute("aria-label", `持仓成本占入金 ${number(investedPct)}%，可用资金占 ${number(cashPct)}%`);
  $("#donut-total").textContent = money(s.costTotal, 0);
  $("#featured-share-label").textContent = `前${featured.length}大持仓`;
  $("#featured-share").textContent = `${number(featuredCost / s.costTotal * 100)}%`;
  const otherCount = data.composition.length - featured.length;
  const slices = [...featured, { name: `其他 ${otherCount} 只`, cost: s.costTotal - featuredCost }];
  $("#holding-donut").setAttribute("aria-label", `累计覆盖约 60% 持仓成本的前 ${featured.length} 只持仓，以及其他 ${otherCount} 只持仓`);
  let cursor = 0;
  const stops = slices.map((item, index) => {
    const start = cursor;
    cursor += item.cost / s.costTotal * 100;
    return `${colors[index]} ${start}% ${cursor}%`;
  });
  $("#holding-donut").style.background = `conic-gradient(${stops.join(",")})`;
  $("#allocation-legend").innerHTML = slices.map((item, index) => `
    <li><i style="background:${colors[index]}"></i><span>${esc(item.name)}</span><strong>${number(item.cost / s.costTotal * 100)}%</strong><small>${money(item.cost, 0)}</small></li>`).join("");

  $("#received-dividend").textContent = money(s.dividendTotal);
  if (window.LUMOS_PERFORMANCE) {
    const performance = window.LUMOS_PERFORMANCE;
    $("#return-total").textContent = `${signed(performance.totalReturn)}%`;
    $("#return-range").textContent = `${performance.start} — ${performance.end}`;
    requestAnimationFrame(drawReturnChart);
  }

  $("#industry-list").innerHTML = data.industries.slice(0, 8).map((item) => {
    const weight = item.cost / s.costTotal * 100;
    return `<div class="industry-row"><span>${esc(item.name)}</span><div class="industry-track"><span style="width:${Math.min(weight / 25 * 100, 100)}%"></span></div><strong>${number(weight)}%</strong></div>`;
  }).join("");
  const coordinates = [
    [`${number(topFive / s.costTotal * 100)}%`, "前五大持仓占比"],
    [`${number(investedPct)}%`, "持仓仓位"],
    [s.holdingCount, "当前持仓公司"],
  ];
  $("#portfolio-coordinates").innerHTML = coordinates.map(([value, label]) => `<div class="coordinate"><strong>${value}</strong><span>${label}</span></div>`).join("");
  $("#risk-exposure-list").innerHTML = riskGroups.map((group) => {
    const cost = data.industries.filter((industry) => group.industries.includes(industry.name)).reduce((sum, industry) => sum + industry.cost, 0);
    const weight = cost / s.costTotal * 100;
    return `<div class="risk-row"><span>${group.name}</span><div class="risk-track"><i style="width:${weight / 35 * 100}%"></i></div><strong>${number(weight)}%</strong></div>`;
  }).join("");
  requestAnimationFrame(alignStructurePanels);
  $("#recent-trades").innerHTML = data.recent.map((trade) => `
    <article class="recent-item">
      <time class="recent-date" datetime="${trade.date}">${trade.date}</time>
      <div class="recent-company"><strong>${esc(trade.name)}</strong><small>${trade.code}</small></div>
      <div class="recent-side ${trade.side === "买入" ? "positive" : "negative"}">${trade.side}<small>${trade.shares} 股 @ ${number(trade.price)}</small></div>
      <div class="recent-reason">${esc(trade.reason || "未记录交易理由")}</div>
    </article>`).join("");
}

function drawReturnChart() {
  const performance = window.LUMOS_PERFORMANCE;
  const canvas = $("#return-chart");
  if (!performance || !canvas || $("#view-overview").hidden) return;
  const wrap = canvas.parentElement;
  const width = wrap.clientWidth;
  const height = width < 360 ? 180 : 210;
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  const css = getComputedStyle(document.documentElement);
  const color = (name) => css.getPropertyValue(name).trim();
  const series = performance.series;
  const pad = { left: 12, right: 44, top: 18, bottom: 28 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const values = series.map((point) => point.r);
  const min = Math.min(0, Math.floor(Math.min(...values) / 5) * 5);
  const max = Math.max(5, Math.ceil(Math.max(...values) / 5) * 5);
  const x = (index) => pad.left + index / (series.length - 1) * plotW;
  const y = (value) => pad.top + (max - value) / (max - min) * plotH;
  ctx.font = "10px Menlo, monospace";
  ctx.lineWidth = 1;
  for (let tick = min; tick <= max; tick += 5) {
    const yy = y(tick);
    ctx.strokeStyle = tick === 0 ? "rgba(242,240,223,.3)" : "rgba(242,240,223,.12)";
    ctx.beginPath();
    ctx.moveTo(pad.left, yy);
    ctx.lineTo(width - pad.right, yy);
    ctx.stroke();
    ctx.fillStyle = "#9fb3a5";
    ctx.fillText(`${tick}%`, width - pad.right + 7, yy + 3);
  }
  const area = new Path2D();
  series.forEach((point, index) => {
    const xx = x(index), yy = y(point.r);
    if (index === 0) area.moveTo(xx, yy);
    else area.lineTo(xx, yy);
  });
  area.lineTo(x(series.length - 1), y(0));
  area.lineTo(x(0), y(0));
  area.closePath();
  ctx.fillStyle = "rgba(169,196,174,.08)";
  ctx.fill(area);
  ctx.strokeStyle = "#b6cbb7";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  series.forEach((point, index) => index ? ctx.lineTo(x(index), y(point.r)) : ctx.moveTo(x(index), y(point.r)));
  ctx.stroke();
  ctx.fillStyle = color("--orange");
  ctx.beginPath();
  ctx.arc(x(series.length - 1), y(series.at(-1).r), 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9fb3a5";
  const tickCount = width < 360 ? 3 : 5;
  for (let index = 0; index < tickCount; index++) {
    const pointIndex = Math.round(index / (tickCount - 1) * (series.length - 1));
    ctx.textAlign = index === 0 ? "left" : index === tickCount - 1 ? "right" : "center";
    ctx.fillText(series[pointIndex].d.slice(2, 7), x(pointIndex), height - 9);
  }
  ctx.textAlign = "left";
}

function alignStructurePanels() {
  const left = $("#industry-list").closest(".plain-panel");
  const right = left.nextElementSibling;
  right.style.removeProperty("--industry-panel-height");
  if (window.matchMedia("(min-width: 621px)").matches) {
    right.style.setProperty("--industry-panel-height", `${left.offsetHeight}px`);
  }
}

function filteredHoldings() {
  const query = $("#holding-search").value.trim().toLowerCase();
  const industry = $("#industry-filter").value;
  const sort = $("#holding-sort").value;
  return data.holdings
    .filter((holding) => !query || `${holding.name}${holding.code}`.toLowerCase().includes(query))
    .filter((holding) => industry === "all" || holding.industry === industry)
    .sort((a, b) => {
      if (sort === "pnl") return b.pnl - a.pnl;
      if (sort === "recent") return b.firstBuy.localeCompare(a.firstBuy);
      return b.shares * b.unitCost - a.shares * a.unitCost;
    });
}

function renderHoldings() {
  const holdings = filteredHoldings();
  $("#holding-result-count").textContent = `显示 ${holdings.length} / ${data.holdings.length} 只持仓`;
  $("#holdings-list").innerHTML = holdings.length ? holdings.map((holding, index) => {
    const cost = holding.shares * holding.unitCost;
    const market = holding.shares * holding.closePrice;
    return `<button class="holding-row" data-code="${holding.code}" style="--i:${index}" aria-label="查看 ${esc(holding.name)} 持仓详情">
      <span class="holding-name"><i class="holding-monogram">${esc(holding.name.slice(0, 1))}</i><span><strong>${esc(holding.name)}</strong><small>${holding.code} · ${esc(holding.industry)}</small></span></span>
      <span><span class="cell-label">持有</span><span class="cell-value">${holding.shares} 股</span><span class="cell-sub">持有 ${holding.holdDays} 天</span></span>
      <span><span class="cell-label">成本 / 现价</span><span class="cell-value">${number(holding.unitCost, 3)} / ${number(holding.closePrice)}</span><span class="cell-sub">${holding.closeDate} 收盘</span></span>
      <span><span class="cell-label">持仓市值</span><span class="cell-value">${money(market)}</span><span class="cell-sub">成本 ${money(cost)}</span></span>
      <span class="${pnlClass(holding.pnl)}"><span class="cell-label">浮动盈亏</span><span class="cell-value">${signed(holding.pnl)}</span><span class="cell-sub">${signed(holding.pnlPct)}%</span></span>
      <span class="holding-arrow" aria-hidden="true">↗</span>
    </button>`;
  }).join("") : emptyState("没有匹配的持仓", "请调整名称、代码或行业筛选条件。");
  $$(".holding-row", $("#holdings-list")).forEach((row) => row.addEventListener("click", () => openHolding(row.dataset.code)));
}

function priceChart(stock) {
  const held = Array.isArray(stock.trades);
  const range = stock.klineStart ? `${stock.klineStart} — ${stock.klineDate}` : "暂无日线数据";
  return `<section class="price-chart" aria-label="${esc(stock.name)} 日 K 线">
    <div class="chart-heading"><h3>${held ? "日 K 与买卖点" : "日 K 线"}</h3><span id="chart-range">${range}</span></div>
    <div class="chart-wrap"><div class="chart-scroll" id="chart-scroll" tabindex="0" aria-label="日 K 线，可横向滚动或拖动"><canvas id="kline-chart" role="img" aria-label="${esc(stock.name)} 日 K 线${held ? "，橙色为买点，绿色为卖点，虚线为摊薄成本" : "，不复权"}"></canvas></div></div>
    <div class="chart-legend">${held ? '<span><i class="chart-marker buy"></i>买入</span><span><i class="chart-marker sell"></i>卖出</span><span><i class="chart-cost-line"></i>摊薄成本</span>' : ""}<span class="chart-hint">不复权 · 横向拖动查看更多</span></div>
  </section>`;
}

function openHolding(code) {
  const holding = data.holdings.find((item) => item.code === code);
  if (!holding) return;
  $("#dialog-content").innerHTML = `
    <div class="dialog-hero"><p class="eyebrow">${esc(holding.industry)} · ${esc(holding.industryDetail)}</p><h2 id="dialog-title">${esc(holding.name)}<small>${holding.code}</small></h2><p>首次买入 ${esc(holding.firstBuy)} · 已持有 ${holding.holdDays} 天</p></div>
    <dl class="dialog-metrics">
      <div><dt>持有股数</dt><dd>${holding.shares} 股</dd></div>
      <div><dt>摊薄成本</dt><dd>${number(holding.unitCost, 3)}</dd></div>
      <div><dt>收盘价格</dt><dd>${number(holding.closePrice)}</dd></div>
      <div><dt>浮动盈亏</dt><dd class="${pnlClass(holding.pnl)}">${signed(holding.pnlPct)}%</dd></div>
    </dl>
    <div class="dialog-body">
      <h3>买入理由</h3><p class="dialog-reason">${esc(holding.reason || "未记录买入理由")}</p>
      <p class="dialog-profile">${esc(holding.profile || "尚未记录公司概况")}</p>
      ${priceChart(holding)}
      <h3>相关成交</h3><div class="dialog-trades">${holding.trades.map((trade) => `<div class="dialog-trade"><time>${trade.date}</time><span class="${trade.side === "买入" ? "positive" : "negative"}">${trade.side}</span><span>${trade.shares} 股 @ ${number(trade.price)}</span></div>`).join("")}</div>
      <p class="dialog-disclaimer">摊薄成本已受历史买卖与分红影响，浮动盈亏不代表持有至今的总收益。</p>
    </div>`;
  chartState.holding = holding;
  $("#holding-dialog").showModal();
  requestAnimationFrame(() => {
    drawKline();
    const scroll = $("#chart-scroll");
    scroll.scrollLeft = scroll.scrollWidth;
    drawKline();
  });
}

function drawKline() {
  const holding = chartState.holding;
  const scroll = $("#chart-scroll");
  if (!holding || !scroll) return;
  const bars = holding.klines || [];
  const canvas = $("#kline-chart");
  const visibleWidth = scroll.clientWidth;
  const width = Math.max(visibleWidth, bars.length * 3.4 + 72);
  const height = window.innerWidth <= 620 ? 280 : 320;
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  const css = getComputedStyle(document.documentElement);
  const color = (name) => css.getPropertyValue(name).trim();
  const C = { ink: color("--ink"), muted: color("--muted"), line: color("--line"), orange: color("--orange"), green: color("--green"), paper: color("--paper-light") };
  if (!bars.length) {
    ctx.fillStyle = C.muted;
    ctx.font = "13px sans-serif";
    ctx.fillText("暂无日 K 数据", 20, 40);
    return;
  }

  const padL = 10, padR = 64, padT = 24, padB = 34;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const trades = holding.trades || [];
  const prices = bars.flatMap((bar) => [bar.h, bar.l]).concat(trades.map((trade) => trade.price));
  if (holding.unitCost != null) prices.push(holding.unitCost);
  let minPrice = Math.min(...prices), maxPrice = Math.max(...prices);
  const margin = (maxPrice - minPrice) * 0.12 || 0.01;
  minPrice -= margin;
  maxPrice += margin;
  const step = plotW / bars.length;
  const candleWidth = Math.max(1.5, step * 0.62);
  const x = (index) => padL + step * (index + 0.5);
  const y = (price) => padT + (maxPrice - price) / (maxPrice - minPrice) * plotH;

  ctx.strokeStyle = C.line;
  ctx.fillStyle = C.muted;
  ctx.lineWidth = 1;
  ctx.font = "11px Menlo, monospace";
  for (let index = 0; index <= 4; index++) {
    const price = minPrice + (maxPrice - minPrice) * index / 4;
    const yy = y(price);
    ctx.beginPath();
    ctx.moveTo(padL, yy);
    ctx.lineTo(width - padR, yy);
    ctx.stroke();
    ctx.fillText(number(price), width - padR + 8, yy + 4);
  }

  const months = [];
  bars.forEach((bar, index) => {
    const label = bar.d.slice(0, 7);
    if (months.at(-1)?.label === label) months.at(-1).end = index;
    else months.push({ label, start: index, end: index });
  });
  const visibleLeft = scroll.scrollLeft + 8;
  const visibleRight = scroll.scrollLeft + visibleWidth - 8;
  let lastRight = visibleLeft - 12;
  ctx.textAlign = "center";
  months.forEach((month) => {
    const center = (x(month.start) + x(month.end)) / 2;
    const halfWidth = ctx.measureText(month.label).width / 2;
    if (center - halfWidth < Math.max(padL, visibleLeft, lastRight + 12)) return;
    if (center + halfWidth > Math.min(width - padR, visibleRight)) return;
    ctx.fillText(month.label, center, height - 10);
    lastRight = center + halfWidth;
  });
  ctx.textAlign = "left";

  bars.forEach((bar, index) => {
    const rising = bar.c >= bar.o;
    ctx.strokeStyle = ctx.fillStyle = rising ? C.orange : C.green;
    const xx = x(index);
    ctx.beginPath();
    ctx.moveTo(xx, y(bar.h));
    ctx.lineTo(xx, y(bar.l));
    ctx.stroke();
    const top = Math.min(y(bar.o), y(bar.c));
    ctx.fillRect(xx - candleWidth / 2, top, candleWidth, Math.max(1, Math.abs(y(bar.o) - y(bar.c))));
  });

  if (holding.unitCost != null) {
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = C.orange;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padL, y(holding.unitCost));
    ctx.lineTo(width - padR, y(holding.unitCost));
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = C.orange;
    ctx.font = "10px Menlo, monospace";
    ctx.fillText(`成本 ${number(holding.unitCost, 3)}`, padL + 6, y(holding.unitCost) - 6);
  }

  const dateIndex = new Map(bars.map((bar, index) => [bar.d, index]));
  const labelEdges = { 买入: -Infinity, 卖出: -Infinity };
  const labelRows = { 买入: 0, 卖出: 0 };
  trades.forEach((trade) => {
    let index = dateIndex.get(trade.date);
    if (index === undefined) {
      index = bars.findIndex((bar) => bar.d >= trade.date);
      if (index === -1) index = bars.length - 1;
    }
    const xx = x(index), yy = y(trade.price);
    const isBuy = trade.side === "买入";
    const markerColor = isBuy ? C.orange : C.green;
    const tipY = yy + (isBuy ? 4 : -4);
    const baseY = tipY + (isBuy ? 12 : -12);
    ctx.fillStyle = markerColor;
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xx, tipY);
    ctx.lineTo(xx - 4, baseY);
    ctx.lineTo(xx + 4, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const label = `${trade.date.slice(5)} ${isBuy ? "买" : "卖"}${trade.shares}`;
    ctx.font = "600 11px Menlo, monospace";
    const boxW = ctx.measureText(label).width + 12, boxH = 19;
    const boxX = Math.max(padL + 2, Math.min(width - padR - boxW - 2, xx - boxW / 2));
    labelRows[trade.side] = boxX < labelEdges[trade.side] + 5 ? labelRows[trade.side] + 1 : 0;
    labelEdges[trade.side] = boxX + boxW;
    const rowOffset = labelRows[trade.side] * (boxH + 4);
    const preferredY = isBuy ? baseY + 5 + rowOffset : baseY - 5 - boxH - rowOffset;
    const boxY = Math.max(padT + 2, Math.min(height - padB - boxH - 2, preferredY));
    ctx.fillStyle = markerColor;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = C.paper;
    ctx.textAlign = "center";
    ctx.fillText(label, boxX + boxW / 2, boxY + 13);
    ctx.textAlign = "left";
  });
}

function setupChartInteractions() {
  const dialog = $("#holding-dialog");
  dialog.addEventListener("close", () => { chartState.holding = null; chartState.drag = null; });
  dialog.addEventListener("scroll", (event) => {
    if (event.target.id !== "chart-scroll" || chartState.frame) return;
    chartState.frame = requestAnimationFrame(() => { chartState.frame = 0; drawKline(); });
  }, true);
  dialog.addEventListener("wheel", (event) => {
    const scroll = event.target.closest("#chart-scroll");
    if (!scroll || scroll.scrollWidth <= scroll.clientWidth || event.shiftKey) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;
    event.preventDefault();
    scroll.scrollLeft += delta;
  }, { passive: false });
  dialog.addEventListener("pointerdown", (event) => {
    const scroll = event.target.closest("#chart-scroll");
    if (!scroll || (event.pointerType === "mouse" && event.button !== 0)) return;
    chartState.drag = { scroll, x: event.clientX, left: scroll.scrollLeft };
    scroll.setPointerCapture(event.pointerId);
    scroll.classList.add("is-dragging");
  });
  dialog.addEventListener("pointermove", (event) => {
    if (chartState.drag) chartState.drag.scroll.scrollLeft = chartState.drag.left - (event.clientX - chartState.drag.x);
  });
  const release = () => {
    chartState.drag?.scroll.classList.remove("is-dragging");
    chartState.drag = null;
  };
  dialog.addEventListener("pointerup", release);
  dialog.addEventListener("pointercancel", release);
  window.addEventListener("resize", () => {
    drawReturnChart();
    if (!chartState.holding || !dialog.open) return;
    const scroll = $("#chart-scroll");
    const atEnd = scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth - 2;
    drawKline();
    if (atEnd) scroll.scrollLeft = scroll.scrollWidth;
  });
}

function renderTrades() {
  const query = $("#trade-search").value.trim().toLowerCase();
  const trades = data.trades.filter((trade) => (state.side === "全部" || trade.side === state.side) && (!query || `${trade.name}${trade.code}`.toLowerCase().includes(query)));
  $("#trade-result-count").textContent = `显示 ${trades.length} / ${data.trades.length} 笔交易`;
  $("#trades-list").innerHTML = trades.length ? trades.map((trade) => `
    <article class="trade-row">
      <time datetime="${trade.date}">${trade.date}</time>
      <div class="company">${esc(trade.name)}<small>${trade.code}</small></div>
      <span class="trade-side ${trade.side === "买入" ? "positive" : "negative"}">${trade.side}</span>
      <span class="number">${trade.shares} 股</span>
      <span class="number">${number(trade.price)}</span>
      <div><span class="number">${money(trade.amount)}</span><div class="fee">费用 ${money(trade.fee)}</div></div>
    </article>`).join("") : emptyState("没有匹配的交易", "请调整交易方向或搜索条件。");
}

function renderWatchlist() {
  const stocks = data.watchlist?.stocks || [];
  const pools = ["核心价值", "行业龙头"];
  $("#watchlist-grid").innerHTML = stocks.length ? pools.map((pool) => {
    const members = stocks.filter((stock) => stock.pool === pool);
    if (!members.length) return "";
    return `<section class="watch-pool" aria-label="${pool}">
      <div class="watch-pool-head"><h2>${pool}</h2><span>${members.length} 只</span></div>
      <div class="watch-cards">${members.map((stock) => `
        <article class="watch-card">
          <div class="watch-card-top"><div><h3>${esc(stock.name)}</h3><code>${esc(stock.code)}</code></div><div class="watch-price">${stock.closePrice == null ? "暂无" : number(stock.closePrice)}<small>${esc(stock.closeDate || "暂无行情")}</small></div></div>
          <div class="watch-tags"><span>${esc(stock.industry || "未分类")}</span><span>${esc(stock.group || "待核实")}</span></div>
          <dl>
            <div><dt>纳入原因</dt><dd>${esc(stock.note || "未记录")}</dd></div>
            <div><dt>买入资格</dt><dd>${esc(watchEligibility(stock))}</dd></div>
          </dl>
          <button class="watch-chart-button" type="button" data-watch-code="${esc(stock.code)}">查看 K 线 <span aria-hidden="true">↗</span></button>
        </article>`).join("")}</div></section>`;
  }).join("") : emptyState("暂无观察标的", "当前数据中没有非持仓观察标的。");
}

function watchEligibility(stock) {
  if (stock.group === "待研究") return "待研究，尚未判断";
  if (stock.group.includes("／")) return "估值与风险达标，股息率条件未满足";
  if (stock.group === "第一档") return "符合估值与风险门槛";
  if (stock.group === "第二档") return "符合，可小量买入";
  if (stock.group === "第三档") return "暂不符合，继续观察";
  if (stock.group === "第四档") return "不符合，暂不买入";
  return "待核实";
}

function openWatchChart(code) {
  const stock = data.watchlist?.stocks.find((item) => item.code === code);
  if (!stock) return;
  $("#dialog-content").innerHTML = `
    <div class="dialog-hero"><p class="eyebrow">观察清单 · ${esc(stock.pool)} · ${esc(stock.industry)}</p><h2 id="dialog-title">${esc(stock.name)}<small>${esc(stock.code)}</small></h2><p>收盘价 ${stock.closePrice == null ? "暂无" : number(stock.closePrice)} · ${esc(stock.closeDate || "暂无行情")}</p></div>
    <div class="dialog-body watch-dialog-body">${priceChart(stock)}<p class="dialog-disclaimer">日 K 线为不复权收盘数据，仅供查看历史价格。</p></div>`;
  chartState.holding = stock;
  $("#holding-dialog").showModal();
  requestAnimationFrame(() => {
    drawKline();
    const scroll = $("#chart-scroll");
    scroll.scrollLeft = scroll.scrollWidth;
    drawKline();
  });
}

function renderNotes() {
  const posts = window.LUMOS_NOTES || [];
  $("#notes-list").innerHTML = posts.length ? posts.map((post) => `
    <button class="note-card" type="button" data-note="${esc(post.id)}">
      <span class="note-card-meta"><span>${esc(post.category)}</span><time datetime="${esc(post.date)}">${esc(post.date)}</time></span>
      <h2>${esc(post.title)}</h2>
      <p class="note-card-subtitle">${esc(post.subtitle)}</p>
      <span class="note-read">阅读全文 <span aria-hidden="true">↗</span></span>
    </button>`).join("") : emptyState("暂无投资笔记", "当前页面数据中还没有已发布的笔记。");
  $$("[data-note]").forEach((button) => button.addEventListener("click", () => {
    history.pushState(null, "", `#notes/${button.dataset.note}`);
    setRoute();
  }));
}

function showNote(id) {
  const post = (window.LUMOS_NOTES || []).find((item) => item.id === id);
  if (!post) return false;
  $("#notes-list").hidden = true;
  $("#note-reader").hidden = false;
  $("#note-reader").innerHTML = `
    <button class="note-back" type="button">← 返回笔记列表</button>
    <header class="note-reader-head">
      <p class="eyebrow">${esc(post.category)} · ${esc(post.date)}</p>
      <h2>${esc(post.title)}</h2>
      <p class="note-reader-subtitle">${esc(post.subtitle)}</p>
    </header>
    ${post.attachment ? `<aside class="note-attachment"><div><span class="eyebrow">RESEARCH TOOL</span><strong>${esc(post.attachment.title)}</strong><p>${esc(post.attachment.description)}</p></div><a href="${esc(post.attachment.href)}" download="${esc(post.attachment.filename)}">下载 Markdown <span aria-hidden="true">↓</span></a></aside>` : ""}
    <div class="note-reader-body">${post.body}</div>`;
  $(".note-back").addEventListener("click", () => {
    history.pushState(null, "", "#notes");
    setRoute();
  });
  return true;
}

function setRoute() {
  const [route, noteId] = location.hash.slice(1).split("/");
  const selected = routes.includes(route) ? route : "overview";
  $$("[data-view]").forEach((view) => { view.hidden = view.dataset.view !== selected; });
  $$("[data-route]").forEach((link) => {
    if (link.dataset.route === selected) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  $("#current-section").textContent = routeNames[selected];
  document.title = `${routeNames[selected]} · Lumos`;
  if (selected === "notes" && noteId && showNote(noteId)) {
    const post = window.LUMOS_NOTES.find((item) => item.id === noteId);
    document.title = `${post.title} · Lumos`;
  } else {
    $("#notes-list").hidden = false;
    $("#note-reader").hidden = true;
  }
  closeSidebar();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function closeSidebar() {
  document.body.classList.remove("sidebar-open");
  $("#menu-button").setAttribute("aria-expanded", "false");
}

function setupEvents() {
  window.addEventListener("hashchange", setRoute);
  window.addEventListener("resize", alignStructurePanels);
  $("#menu-button").addEventListener("click", () => {
    const open = document.body.classList.toggle("sidebar-open");
    $("#menu-button").setAttribute("aria-expanded", String(open));
  });
  $("#sidebar-backdrop").addEventListener("click", closeSidebar);
  $("#holding-search").addEventListener("input", renderHoldings);
  $("#industry-filter").addEventListener("change", renderHoldings);
  $("#holding-sort").addEventListener("change", renderHoldings);
  $("#trade-search").addEventListener("input", renderTrades);
  $$("#trade-filters button").forEach((button) => button.addEventListener("click", () => {
    state.side = button.dataset.side;
    $$("#trade-filters button").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    renderTrades();
  }));
  $("#dialog-close").addEventListener("click", () => $("#holding-dialog").close());
  $("#watchlist-grid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-watch-code]");
    if (button) openWatchChart(button.dataset.watchCode);
  });
  $("#holding-dialog").addEventListener("click", (event) => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
  });
}

function init() {
  if (!data) {
    $("#main-content").innerHTML = emptyState("数据没有载入", "请稍后刷新页面。");
    return;
  }
  renderHeader();
  renderOverview();
  [...new Set(data.holdings.map((holding) => holding.industry))].sort((a, b) => a.localeCompare(b, "zh-CN")).forEach((industry) => {
    $("#industry-filter").insertAdjacentHTML("beforeend", `<option value="${esc(industry)}">${esc(industry)}</option>`);
  });
  renderHoldings();
  renderTrades();
  renderWatchlist();
  renderNotes();
  setupEvents();
  setupPrinciples();
  window.addEventListener("popstate", setRoute);
  setupChartInteractions();
  setRoute();
}

init();
