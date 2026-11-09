const data = window.LUMOS_DATA;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = (value, digits = 2) => `¥${Number(value).toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const signedMoney = (value) => `${value >= 0 ? "+" : "−"}${money(Math.abs(value))}`;
const number = (value, digits = 2) => Number(value).toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const signed = (value, digits = 2) => `${value >= 0 ? "+" : ""}${number(value, digits)}`;
const pnlClass = (value) => value >= 0 ? "positive" : "negative";
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const emptyState = (title, copy) => `<div class="empty-state"><strong>${title}</strong><p>${copy}</p></div>`;
const routes = ["overview", "cashflow", "holdings", "trades", "watchlist", "notes"];
const routeNames = { overview: "投资总览", holdings: "我的持仓", trades: "交易记录", cashflow: "分红现金流", watchlist: "观察清单", notes: "投资笔记" };
const colors = ["#244b40", "#c75932", "#5b7e68", "#d58a5f", "#87a28b", "#b9754d", "#6d9278", "#db9b73"];
const riskGroups = [
  { name: "居民消费", industries: ["食品饮料", "家用电器"] },
  { name: "利率与信用", industries: ["银行"] },
  { name: "资本市场景气", industries: ["非银金融"] },
  { name: "政策定价", industries: ["通信", "环保", "公用事业"] },
  { name: "特许期限与流量", industries: ["交通运输"] },
  { name: "地产租金与广告", industries: ["房地产", "传媒"] },
  { name: "医药医疗", industries: ["医药生物"] },
  { name: "商品价格", industries: ["石油石化", "有色金属"] },
  { name: "ETF（不穿透）", industries: ["ETF"] },
];
const state = { side: "全部", calendarMonth: null, calendarMode: "month" };
const chartState = { holding: null, frame: 0, drag: null };
const heroQuotes = [
  { text: "股票就是公司的所有权", author: "" },
  { text: "市场先生是来服务你的，不是来指导你的", author: "" },
  { text: "便宜是硬道理", author: "" },
  { text: "要清楚自己知道什么、不知道什么", author: "" },
  { text: "去有鱼的地方钓鱼", author: "" },
  { text: "财富的本质是经济体中的购买力占比", author: "" },
  { text: "好公司不一定是好投资，买入价格同样重要", author: "—— 霍华德·马克斯（意译）" },
  { text: "后视镜总比挡风玻璃清晰", author: "—— 沃伦·巴菲特（意译）" },
  { text: "你无法预测，但你可以准备", author: "—— 霍华德·马克斯" },
];

function setupHeroQuotes() {
  const button = $("#hero-quote");
  let index = Math.floor(Math.random() * heroQuotes.length);
  let pending;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const show = () => {
    const quote = heroQuotes[index];
    $("#hero-quote-text").textContent = `「${quote.text}」`;
    $("#hero-quote-author").textContent = quote.author;
  };
  const next = () => {
    clearTimeout(pending);
    button.classList.add("is-changing");
    pending = setTimeout(() => {
      index = (index + 1) % heroQuotes.length;
      show();
      button.classList.remove("is-changing");
    }, reduceMotion.matches ? 0 : 250);
  };
  button.addEventListener("click", next);
  show();
}

function renderHeader() {
  $("#data-date").textContent = data.dataDate;
  $("#data-date").dateTime = data.dataDate;
  const ledgerDate = $("#ledger-date");
  ledgerDate.hidden = !data.ledgerDate || data.ledgerDate <= data.dataDate;
  if (!ledgerDate.hidden) ledgerDate.textContent = ` · 交易至 ${data.ledgerDate}`;
  $("#first-trade-date").textContent = data.firstTradeDate;
  $("#nav-holding-count").textContent = data.stats.holdingCount;
  $("#nav-trade-count").textContent = data.trades.length;
  $("#nav-watchlist-count").textContent = data.watchlist?.stocks?.length || 0;
  $("#nav-note-count").textContent = window.LUMOS_NOTES?.length || 0;
  $("#trade-total-heading").textContent = data.trades.length;
}

function renderOverview() {
  const s = data.stats;
  const performance = window.LUMOS_PERFORMANCE;
  const champion = performance?.dailyChampion;
  if (champion) {
    $("#daily-champion-name").textContent = champion.name;
    $("#daily-champion-pnl").textContent = `${champion.amount >= 0 ? "+" : "−"}${number(Math.abs(champion.amount))}`;
    $("#daily-champion-date").textContent = champion.date.slice(5).replace("-", "/");
    $("#daily-champion-date").dateTime = champion.date;
    $("#daily-champion").title = `${champion.date} 按当日持仓市值变动计算，含当天交易现金影响`;
  }
  const marketComposition = data.holdings.map((holding) => ({
    name: holding.name,
    industry: holding.industry,
    value: holding.shares * holding.closePrice,
  })).sort((a, b) => b.value - a.value);
  const topFiveValue = marketComposition.slice(0, 5).reduce((sum, item) => sum + item.value, 0);
  const marketByIndustry = new Map();
  for (const item of marketComposition) {
    marketByIndustry.set(item.industry, (marketByIndustry.get(item.industry) || 0) + item.value);
  }
  const marketIndustries = [...marketByIndustry].map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const closeDates = [...new Set(data.holdings.map((holding) => holding.closeDate))].sort();
  const featured = [];
  let featuredValue = 0;
  for (const item of marketComposition) {
    featured.push(item);
    featuredValue += item.value;
    if (featuredValue / s.marketTotal * 100 >= 60) break;
  }
  const metrics = [
    { label: "持仓市值", code: "MARKET VALUE", value: money(s.marketTotal), foot: `成本 ${money(s.costTotal)}` },
    {
      label: "浮动盈亏", code: "UNREALIZED P/L", value: signed(s.pnl),
      foot: `${signed(s.pnlPct)}% · 按摊薄成本`, cls: pnlClass(s.pnl),
      total: Number.isFinite(s.totalPnl) ? signedMoney(s.totalPnl) : "待补全",
      totalClass: Number.isFinite(s.totalPnl) ? pnlClass(s.totalPnl) : "",
    },
  ];
  $("#overview-metrics").innerHTML = metrics.map((item) => `
    <article class="metric">
      <div class="metric-label">${item.label}<span>${item.code}</span></div>
      <div class="metric-value ${item.cls || ""}">${item.value}</div>
      ${item.total
        ? `<div class="metric-foot-row"><span class="metric-foot">${item.foot}</span><span class="metric-total" title="股票、ETF 与已清仓 REIT 按交易和到账分红记录计算总盈亏；现价日期见各只持仓。">已记录盈亏 <strong class="${item.totalClass}">${item.total}</strong></span></div>`
        : `<div class="metric-foot">${item.foot}</div>`}
    </article>`).join("");
  const mobileChampion = $("#daily-champion").cloneNode(true);
  mobileChampion.removeAttribute("id");
  mobileChampion.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
  mobileChampion.classList.add("metric-champion");
  $("#overview-metrics .metric").append(mobileChampion);
  renderPnlCalendar(performance, performance?.end || data.dataDate);

  const featuredPct = featuredValue / s.marketTotal * 100;
  const closeDateLabel = closeDates.length === 1 ? `${closeDates[0]} 收盘` : `${closeDates[0]}—${closeDates.at(-1)} 收盘`;
  $("#allocation-note").textContent = `按市值排序 · ${closeDateLabel} · 累计至 60%`;
  $("#capital-bar").innerHTML = `<span class="invested" style="width:${featuredPct}%" title="主要持仓市值 ${number(featuredPct)}%"></span><span class="cash" style="width:${100 - featuredPct}%" title="其他持仓市值 ${number(100 - featuredPct)}%"></span>`;
  $("#capital-bar").setAttribute("aria-label", `主要持仓市值占 ${number(featuredPct)}%，其他持仓占 ${number(100 - featuredPct)}%`);
  $("#donut-total").textContent = money(s.marketTotal, 0);
  $("#featured-share-label").textContent = `前${featured.length}大持仓`;
  $("#featured-share").textContent = `${number(featuredPct)}%`;
  const otherCount = marketComposition.length - featured.length;
  const slices = [...featured, { name: `其他 ${otherCount} 只`, value: s.marketTotal - featuredValue }];
  const sliceColors = slices.map((_, index) => index === slices.length - 1 ? "#d7d5c8" : colors[index % colors.length]);
  $("#holding-donut").setAttribute("aria-label", `${closeDateLabel}市值，累计覆盖约 60% 的前 ${featured.length} 只持仓，以及其他 ${otherCount} 只持仓`);
  let cursor = 0;
  const stops = slices.map((item, index) => {
    const start = cursor;
    cursor += item.value / s.marketTotal * 100;
    return `${sliceColors[index]} ${start}% ${cursor}%`;
  });
  $("#holding-donut").style.background = `conic-gradient(${stops.join(",")})`;
  $("#allocation-legend").innerHTML = slices.map((item, index) => `
    <li><i style="background:${sliceColors[index]}"></i><span>${esc(item.name)}</span><strong>${number(item.value / s.marketTotal * 100)}%</strong><small>${money(item.value, 0)}</small></li>`).join("");

  if (performance) {
    $("#return-total").textContent = `${signed(performance.totalReturn)}%`;
    $("#return-range").textContent = `${performance.start} — ${performance.end}`;
  }

  $("#industry-list").innerHTML = marketIndustries.slice(0, 8).map((item) => {
    const weight = item.value / s.marketTotal * 100;
    return `<div class="industry-row"><span>${esc(item.name)}</span><div class="industry-track"><span style="width:${Math.min(weight / 30 * 100, 100)}%"></span></div><strong>${number(weight)}%</strong></div>`;
  }).join("");
  const estimatedCash = s.investedCapital - s.costTotal;
  const estimatedPositionPct = s.marketTotal / (s.marketTotal + estimatedCash) * 100;
  const coordinates = [
    [`${number(topFiveValue / s.marketTotal * 100)}%`, "前五大占比"],
    [`${number(estimatedPositionPct)}%`, "估算仓位"],
    [s.holdingCount, "持仓数"],
  ];
  $("#portfolio-coordinates").innerHTML = coordinates.map(([value, label]) => `<div class="coordinate"><strong>${value}</strong><span>${label}</span></div>`).join("");
  $("#risk-exposure-list").innerHTML = riskGroups.map((group) => {
    const value = group.industries.reduce((sum, industry) => sum + (marketByIndustry.get(industry) || 0), 0);
    const weight = value / s.marketTotal * 100;
    return `<div class="risk-row"><span>${group.name}</span><div class="risk-track"><i style="width:${weight / 35 * 100}%"></i></div><strong>${number(weight)}%</strong></div>`;
  }).join("");
  $("#recent-trades").innerHTML = data.recent.slice(0, 5).map((trade) => `
    <article class="recent-item">
      <time class="recent-date" datetime="${trade.date}">${trade.date}</time>
      <div class="recent-company"><strong>${esc(trade.name)}</strong><small>${trade.code}</small></div>
      <div class="recent-side ${trade.side === "买入" ? "positive" : "negative"}">${trade.side}<small>${trade.shares} ${trade.assetType === "ETF" || trade.assetType === "REIT" ? "份" : "股"} @ ${number(trade.price, trade.assetType === "ETF" || trade.assetType === "REIT" ? 4 : 2)}</small></div>
      <div class="recent-reason">${esc(trade.reason || "未记录交易理由")}</div>
    </article>`).join("");
}

function renderPnlCalendar(performance, snapshotDate) {
  const root = $("#pnl-calendar");
  const entries = performance?.dailyPnlSeries || [];
  const latestMonth = snapshotDate.slice(0, 7);
  const earliestMonth = entries.length ? entries[0].date.slice(0, 7) : latestMonth;
  const month = state.calendarMonth || latestMonth;
  state.calendarMonth = month < earliestMonth ? earliestMonth : month > latestMonth ? latestMonth : month;
  if (state.calendarMonth !== month) return renderPnlCalendar(performance, snapshotDate);
  const monthEntries = entries.filter((entry) => entry.date.startsWith(month));
  const byDate = new Map(monthEntries.map((entry) => [entry.date, entry]));
  const monthlyTotal = monthEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const stockDays = monthEntries.filter((entry) => entry.stockIncluded).length;
  const mixedCoverage = stockDays > 0 && stockDays < monthEntries.length;
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1));
  const firstWeekday = (firstDay.getUTCDay() + 6) % 7;
  const mondayOffset = firstWeekday < 5 ? firstWeekday : 0;
  $("#pnl-calendar-month").textContent = `${year} 年 ${monthNumber} 月`;
  $("#pnl-calendar-prev").disabled = month <= earliestMonth;
  $("#pnl-calendar-next").disabled = month >= latestMonth;
  const total = $("#pnl-calendar-total");
  const yearMode = state.calendarMode === "year";
  $("#pnl-calendar-month-mode").setAttribute("aria-pressed", String(!yearMode));
  $("#pnl-calendar-year-mode").setAttribute("aria-pressed", String(yearMode));
  if (yearMode) {
    const year = month.slice(0, 4);
    const earliestYear = earliestMonth.slice(0, 4);
    const latestYear = latestMonth.slice(0, 4);
    const yearEntries = entries.filter((entry) => entry.date.startsWith(year));
    const yearTotal = yearEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const monthTotals = Array.from({ length: 12 }, (_, index) => {
      const key = `${year}-${String(index + 1).padStart(2, "0")}`;
      const monthly = entries.filter((entry) => entry.date.startsWith(key));
      return { key, amount: monthly.reduce((sum, entry) => sum + entry.amount, 0), days: monthly.length };
    });
    $("#pnl-calendar-month").textContent = `${year} 年`;
    $("#pnl-calendar-prev").disabled = year <= earliestYear;
    $("#pnl-calendar-next").disabled = year >= latestYear;
    $("#pnl-calendar-prev").setAttribute("aria-label", "上一年");
    $("#pnl-calendar-next").setAttribute("aria-label", "下一年");
    $("#pnl-calendar-total-label").textContent = "年累计";
    total.textContent = yearEntries.length ? signedMoney(yearTotal) : "—";
    total.className = yearEntries.length ? pnlClass(yearTotal) : "";
    $("#pnl-calendar-foot").textContent = "点击月份，查看该月每个交易日的盈亏";
    root.className = "pnl-year-calendar";
    root.removeAttribute("role");
    root.setAttribute("aria-label", `${year} 年十二个月盈亏`);
    root.innerHTML = monthTotals.map((item, index) => `<button type="button" class="pnl-year-month${item.days ? ` ${pnlClass(item.amount)}` : ""}" data-month="${item.key}" ${item.days ? "" : "disabled"} aria-label="${index + 1} 月${item.days ? `盈亏 ${signedMoney(item.amount)}，查看每日盈亏` : "无记录"}"><span>${index + 1} 月</span><strong>${item.days ? signedMoney(item.amount) : "—"}</strong></button>`).join("");
    $$(".pnl-year-month:not(:disabled)", root).forEach((button) => button.addEventListener("click", () => {
      state.calendarMonth = button.dataset.month;
      state.calendarMode = "month";
      renderPnlCalendar(performance, snapshotDate);
    }));
    return;
  }
  $("#pnl-calendar-prev").setAttribute("aria-label", "上个月");
  $("#pnl-calendar-next").setAttribute("aria-label", "下个月");
  $("#pnl-calendar-total-label").textContent = mixedCoverage ? "分口径月合计" : stockDays ? "股票与 ETF 月累计" : "ETF 月累计";
  total.textContent = byDate.size ? signedMoney(monthlyTotal) : "—";
  total.className = byDate.size ? pnlClass(monthlyTotal) : "";
  const coverage = mixedCoverage ? "本月前期仅 ETF，后期计入现持股票" : stockDays ? "现持股票与 ETF" : "仅 ETF";
  const latestEntry = byDate.get(snapshotDate);
  const breakdown = latestEntry?.stockAmount !== undefined
    ? `最新交易日：股票 ${signedMoney(latestEntry.stockAmount)}，ETF ${signedMoney(latestEntry.etfAmount)}，合计 ${signedMoney(latestEntry.amount)}。` : "";
  $("#pnl-calendar-foot").textContent = `${breakdown}${byDate.size} 天浮动记录 · ${coverage} · 按实际成交净额与前复权价格计算，不含分红；已清仓股票及 REIT 仅计入总盈亏`;

  const cells = Array.from({ length: mondayOffset }, () => '<div class="calendar-empty" aria-hidden="true"></div>');
  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(Date.UTC(year, monthNumber - 1, day)).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const isFuture = date > snapshotDate;
    const isLatest = date === snapshotDate;
    const entry = byDate.get(date);
    const amount = entry?.amount;
    const amountLabel = amount === undefined ? "" : `<span class="${pnlClass(amount)}">${signedMoney(amount)}</span>`;
    const accessibleLabel = `${date}${isLatest ? "，最新收盘" : ""}${amount === undefined ? "" : `，${entry.stockIncluded ? "现持股票与 ETF" : "仅 ETF"}盈亏 ${signedMoney(amount)}`}`;
    const detail = entry?.stockAmount !== undefined ? `股票 ${signedMoney(entry.stockAmount)} · ETF ${signedMoney(entry.etfAmount)}` : "";
    cells.push(`<div role="gridcell" class="${isFuture ? "calendar-future" : ""}${isLatest ? " calendar-latest" : ""}" aria-label="${accessibleLabel}${detail ? `，${detail}` : ""}" title="${detail}"><time datetime="${date}">${day}</time>${amountLabel}</div>`);
  }
  while (cells.length % 5) cells.push('<div class="calendar-empty" aria-hidden="true"></div>');
  root.className = "pnl-calendar";
  root.setAttribute("role", "grid");
  root.setAttribute("aria-label", `${year} 年 ${monthNumber} 月盈亏日历，周一至周五`);
  const weekdays = ["一", "二", "三", "四", "五"]
    .map((day) => `<div class="calendar-weekday" role="columnheader">${day}</div>`);
  root.innerHTML = weekdays.join("") + cells.join("");
}

function shiftPnlCalendar(offset) {
  const [year, month] = state.calendarMonth.split("-").map(Number);
  state.calendarMonth = new Date(Date.UTC(year + (state.calendarMode === "year" ? offset : 0), month - 1 + (state.calendarMode === "month" ? offset : 0), 1)).toISOString().slice(0, 7);
  renderPnlCalendar(window.LUMOS_PERFORMANCE, window.LUMOS_PERFORMANCE?.end || data.dataDate);
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
  ctx.font = "10px Menlo, monospace";
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
      if (sort === "recent") return (b.firstBuy || "").localeCompare(a.firstBuy || "");
      return (b.costTotal ?? b.shares * b.unitCost) - (a.costTotal ?? a.shares * a.unitCost);
    });
}

function yieldHistory(stock, detailed = false) {
  const history = stock.historicalYield;
  const isCost = history?.basisType === "holdingCost";
  const basis = isCost
    ? `${stock.assetType === "ETF" ? "当前每份成本（成本总额÷份额）" : "当前摊薄单位成本"} ${number(history.basisValue, stock.assetType === "ETF" ? 6 : 3)} 元`
    : `${esc(stock.closeDate || "当前")} 收盘价 ${stock.closePrice == null ? "—" : number(stock.closePrice, 2)} 元`;
  const values = ["2023", "2024", "2025"].map((year) => {
    const value = history?.yieldPct?.[year];
    const dps = history?.dps?.[year];
    return `<span><b>${year}</b> ${value == null ? "—" : `${history?.partialHistory ? "≥" : ""}${number(value, 2)}%`}${detailed && dps != null ? `<small>每${stock.assetType === "ETF" ? "份" : "股"} ${number(dps, 5)} 元</small>` : ""}</span>`;
  }).join("");
  if (!detailed) return `<span class="yield-history yield-compact" aria-label="2023至2025年按${isCost ? "持仓成本" : "收盘价"}计算的税前股息率${history?.partialHistory ? "，ETF已核记录为下限" : ""}">${values}</span>`;
  return `<section class="yield-detail"><h3>过去三年股息率</h3><div class="yield-history">${values}</div>
    <p>按各归属年度已实施的税前派息 ÷ ${basis} 计算。${isCost ? "成本包含历史买卖与分红的摊薄影响，仅表示按当前成本看。" : ""}— 表示缺少已核实数据；0% 表示有明确未分红依据。${stock.assetType === "ETF" ? "ETF 仅展示已收集的派息，历史记录可能不完整。" : "历史分红不代表未来分红。"}</p>
    ${history?.source ? `<a href="${esc(history.source)}" target="_blank" rel="noopener noreferrer">查看派息数据来源 ↗</a>` : ""}
    ${history?.zeroSource ? ` · <a href="${esc(history.zeroSource)}" target="_blank" rel="noopener noreferrer">查看未分红依据 ↗</a>` : ""}</section>`;
}

function renderHoldings() {
  const holdings = filteredHoldings();
  $("#holding-result-count").textContent = `显示 ${holdings.length} / ${data.holdings.length} 只持仓`;
  const holdingRow = (holding, index) => {
    const cost = holding.costTotal ?? holding.shares * holding.unitCost;
    const market = holding.shares * holding.closePrice;
    const isEtf = holding.assetType === "ETF";
    return `<button class="holding-row" data-code="${holding.code}" style="--i:${index}" aria-label="查看 ${esc(holding.name)} 持仓详情">
      <span class="holding-name"><i class="holding-monogram">${esc(holding.name.slice(0, 1))}</i><span><strong>${esc(holding.name)}</strong><small>${holding.code} · ${esc(holding.industry)}</small>${yieldHistory(holding)}</span></span>
      <span><span class="cell-label">持有</span><span class="cell-value">${holding.shares} ${isEtf ? "份" : "股"}</span><span class="cell-sub">${isEtf ? esc(holding.industryDetail) : `持有 ${holding.holdDays} 天`}</span></span>
      <span><span class="cell-label">成本 / 现价</span><span class="cell-value">${number(holding.unitCost, 3)} / ${number(holding.closePrice, isEtf ? 3 : 2)}</span><span class="cell-sub">${holding.closeDate} ${isEtf && !holding.klineDate ? "持仓截图" : "收盘"}</span></span>
      <span><span class="cell-label">持仓市值</span><span class="cell-value">${money(market)}</span><span class="cell-sub">成本 ${money(cost)}</span></span>
      <span class="${pnlClass(holding.pnl)}"><span class="cell-label">浮动盈亏</span><span class="cell-value">${signed(holding.pnl)}</span><span class="cell-sub">${signed(holding.pnlPct)}%</span></span>
      <span class="holding-arrow" aria-hidden="true">↗</span>
    </button>`;
  };
  const tableHead = `<div class="holdings-table-head" aria-hidden="true"><span>标的 / 分类</span><span>持有</span><span>成本 / 现价</span><span>持仓市值</span><span>浮动盈亏</span><span></span></div>`;
  const groups = [
    { title: "股票", items: holdings.filter((holding) => holding.assetType !== "ETF") },
    { title: "ETF", items: holdings.filter((holding) => holding.assetType === "ETF") },
  ];
  $("#holdings-list").innerHTML = holdings.length ? groups.filter((group) => group.items.length).map((group) => `
    <section class="holding-group" aria-label="${group.title}持仓">
      <div class="holding-group-heading"><h2>${group.title}</h2><span>${group.items.length} 只</span></div>
      ${tableHead}
      ${group.items.map(holdingRow).join("")}
    </section>`).join("") : emptyState("没有匹配的持仓", "请调整名称、代码或行业筛选条件。");
  $$(".holding-row", $("#holdings-list")).forEach((row) => row.addEventListener("click", () => openHolding(row.dataset.code)));
}

function priceChart(stock) {
  const held = stock.assetType !== "ETF" && Array.isArray(stock.trades);
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
  const isEtf = holding.assetType === "ETF";
  $("#dialog-content").innerHTML = `
    <div class="dialog-hero"><p class="eyebrow">${esc(holding.industry)} · ${esc(holding.industryDetail)}</p><h2 id="dialog-title">${esc(holding.name)}<small>${holding.code}</small></h2><p>${isEtf ? `持仓快照 · ${esc(holding.closeDate)}` : `首次买入 ${esc(holding.firstBuy)} · 已持有 ${holding.holdDays} 天`}</p></div>
    <dl class="dialog-metrics">
      <div><dt>持有${isEtf ? "份额" : "股数"}</dt><dd>${holding.shares} ${isEtf ? "份" : "股"}</dd></div>
      <div><dt>${isEtf ? "截图单位成本" : "摊薄成本"}</dt><dd>${number(holding.unitCost, 3)}</dd></div>
      <div><dt>${isEtf && !holding.klineDate ? "截图价格" : "收盘价格"}</dt><dd>${number(holding.closePrice, isEtf ? 3 : 2)}</dd></div>
      <div><dt>浮动盈亏</dt><dd class="${pnlClass(holding.pnl)}">${signed(holding.pnlPct)}%</dd></div>
    </dl>
    <div class="dialog-body">
      ${yieldHistory(holding, true)}
      ${isEtf ? `<p class="dialog-disclaimer etf-disclaimer">当前持仓成本以券商快照为准；历史买卖及到账分红已按对账单计入组合总盈亏。</p>${holding.klines.length ? priceChart(holding) : ""}` : `
      <h3>买入理由</h3><p class="dialog-reason">${esc(holding.reason || "未记录买入理由")}</p>
      <p class="dialog-profile">${esc(holding.profile || "尚未记录公司概况")}</p>
      ${priceChart(holding)}
      <h3>相关成交</h3><div class="dialog-trades">${holding.trades.slice().sort((a, b) => b.date.localeCompare(a.date)).map((trade) => `<div class="dialog-trade"><time>${trade.date}</time><span class="${trade.side === "买入" ? "positive" : "negative"}">${trade.side}</span><span>${trade.shares} ${trade.assetType === "ETF" || trade.assetType === "REIT" ? "份" : "股"} @ ${number(trade.price, trade.assetType === "ETF" || trade.assetType === "REIT" ? 4 : 2)}</span></div>`).join("")}</div>
      <p class="dialog-disclaimer">摊薄成本已受历史买卖与分红影响，浮动盈亏不代表持有至今的总收益。</p>`}
    </div>`;
  chartState.holding = holding;
  $("#holding-dialog").showModal();
  if (holding.klines.length) requestAnimationFrame(() => {
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
  const trades = data.trades.filter((trade) => (state.side === "全部" || trade.side === state.side) && (!query || `${trade.name}${trade.code}${trade.reason || ""}`.toLowerCase().includes(query)));
  $("#trade-result-count").textContent = `显示 ${trades.length} / ${data.trades.length} 笔交易`;
  $("#trades-list").innerHTML = trades.length ? trades.map((trade) => `
    <article class="trade-row">
      <time datetime="${trade.date}">${trade.date}</time>
      <div class="company">${esc(trade.name)}<small>${trade.code}</small></div>
      <span class="trade-side ${trade.side === "买入" ? "positive" : "negative"}">${trade.side}</span>
      <span class="number">${trade.shares} ${trade.assetType === "ETF" || trade.assetType === "REIT" ? "份" : "股"}</span>
      <span class="number">${number(trade.price, trade.assetType === "ETF" || trade.assetType === "REIT" ? 4 : 2)}</span>
      <div><span class="number">${money(trade.amount)}</span><div class="fee">费用 ${money(trade.fee)}</div></div>
      <div class="trade-reason${trade.reason ? "" : " is-empty"}"><span class="trade-reason-label">原因</span>${trade.reason ? esc(trade.reason) : "—"}</div>
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
          ${yieldHistory(stock)}
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
    <div class="dialog-body watch-dialog-body">${yieldHistory(stock, true)}${priceChart(stock)}<p class="dialog-disclaimer">日 K 线为不复权收盘数据，仅供查看历史价格。</p></div>`;
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
      <p class="note-card-subtitle">${esc(post.subtitle || post.excerpt)}</p>
      <span class="note-read">阅读全文 <span aria-hidden="true">↗</span></span>
    </button>`).join("") : emptyState("暂无投资笔记", "当前页面数据中还没有已发布的笔记。");
  $$("[data-note]").forEach((button) => button.addEventListener("click", () => {
    history.pushState(null, "", `#notes/${button.dataset.note}`);
    setRoute();
  }));
}

function renderCashFlow() {
  const flow = data.cashFlow;
  if (!flow) return;
  $("#cashflow-annual-total").textContent = money(flow.annualGross);
  const marketTotal = data.holdings.reduce((sum, holding) => sum + holding.shares * holding.closePrice, 0);
  const portfolioYield = marketTotal > 0
    ? `${number(flow.annualGross / marketTotal * 100)}%` : "—";
  $("#cashflow-annual-yield").textContent = `持仓股息率 ${portfolioYield}`;
  $("#cashflow-annual-basis").textContent = `股票 ${money(flow.stockAnnualGross)} · ETF ${money(flow.etfAnnualGross)}`;
  $("#cashflow-received-gross").textContent = money(flow.receivedGross);
  $("#cashflow-tax-total").textContent = money(flow.confirmedTax);
  $("#cashflow-net-total").textContent = money(flow.receivedNet);
  $("#cashflow-method").textContent = `股票按 ${flow.referenceYear} 年每股税前分红、ETF 按 ${flow.etfReferenceStart} 至 ${flow.etfReferenceEnd} 已公布的每份派息，均乘以当前持仓计算年参考额；${flow.etfNoHistoryCount} 只 ETF 近 12 个月无已核派息，暂按零计。持仓股息率以 ${data.dataDate} 股票与 ETF 收盘市值为分母。ETF 派息记录核对至 ${flow.etfDividendAsOf}；预计金额不代表未来分红承诺，实际到账及税款仍按流水计算。`;

  $("#cashflow-announced-caption").textContent = `${flow.announced.length} 笔（ETF ${flow.etfAnnouncedCount} 笔）· 按当前份额或股数估算 ${money(flow.announcedGrossIfHeld)} · ETF ${flow.etfHoldingsCount} 只核对至 ${flow.etfAnnouncementsAsOf}`;
  $("#cashflow-announced-list").innerHTML = flow.announced.length ? flow.announced.map((item) => `
    <article class="cashflow-announced-card">
      <div class="cashflow-card-top"><div><span class="eyebrow">${esc(item.period)}</span><h3>${esc(item.name)}</h3><small>${esc(item.code)}</small></div><strong>${money(item.grossIfHeld)}</strong></div>
      <p class="cashflow-card-formula">${number(item.shares, 0)} ${item.unit} × ${number(item.dps, 4)} 元/${item.unit} · 税前条件估算</p>
      <p class="cashflow-card-stage">${esc(item.stage)}</p>
      <div class="cashflow-card-dates"><span>公告 ${esc(item.announcedDate)}</span><span>登记 ${esc(item.recordDate || "待公布")}</span><span>除息/发放 ${esc(item.exDate || "待公布")}</span></div>
      <a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer">查看公告来源 ↗</a>
    </article>`).join("") : emptyState("暂无待到账公告", "后续公布的分红会在核对后列入这里。");

  const maxAnnual = Math.max(...flow.annual.map((row) => row.gross), 1);
  $("#cashflow-annual-list").innerHTML = [
    { type: "股票", gross: flow.stockAnnualGross, note: `${flow.referenceYear} 年每股分红` },
    { type: "ETF", gross: flow.etfAnnualGross, note: `${flow.etfReferenceStart} 至 ${flow.etfReferenceEnd} 派息` },
  ].map((group) => `
    <div class="cashflow-annual-group">
      <div class="cashflow-annual-group-head"><h3>${group.type}</h3><span>${esc(group.note)} · ${money(group.gross)}</span></div>
      <div class="cashflow-annual-list">${flow.annual.filter((item) => item.assetType === group.type).map((item) => `
        <div class="cashflow-annual-row">
          <div class="cashflow-annual-name"><strong>${esc(item.name)}</strong><small>${esc(item.code)} · ${number(item.shares, 0)} ${item.unit} × ${number(item.dps, 4)} 元/${item.unit}${item.assetType === "ETF" ? ` · ${esc(item.reference)}` : ""}</small></div>
          <div class="cashflow-annual-track"><span style="width:${item.gross ? Math.max(item.gross / maxAnnual * 100, 2) : 0}%"></span></div>
          <strong class="cashflow-annual-amount">${item.gross ? money(item.gross) : "—"}</strong>
        </div>`).join("")}</div>
    </div>`).join("");

  $("#cashflow-received-caption").textContent = `${flow.received.length} 笔 · 毛额 ${money(flow.receivedGross)} − 已确认税 ${money(flow.confirmedTax)} = 净实收 ${money(flow.receivedNet)}`;
  const ledgerRow = (item, historical) => `
    <div class="cashflow-ledger-row">
      <div class="cashflow-ledger-date"><time>${esc(item.date)}</time>${item.dateNote ? `<small>${esc(item.dateNote)}</small>` : ""}</div>
      <div class="cashflow-ledger-company"><strong>${esc(item.name)}</strong><small>${esc(item.period)}${item.shares ? ` · ${number(item.shares, 0)} ${item.unit || "股"}` : ""}</small></div>
      <div class="cashflow-ledger-number"><span>分红毛额</span><strong>${money(item.gross)}</strong></div>
      <div class="cashflow-ledger-number cashflow-tax"><span>红利税</span><strong>${item.tax ? `−${money(item.tax)}` : "—"}</strong><small>${historical ? "依历史记录核算" : (item.taxDate ? `扣税 ${esc(item.taxDate)}` : esc(item.taxStatus))}</small></div>
      <div class="cashflow-ledger-number cashflow-net"><span>${historical ? "净额" : "净实收"}</span><strong>${money(item.net)}</strong></div>
    </div>`;
  $("#cashflow-received-list").innerHTML = flow.received.map((item) => ledgerRow(item, false)).join("");
  $("#cashflow-closed-note").textContent = `${flow.closed.length} 笔历史清仓分红：毛额 ${money(flow.closedGross)}，红利税 ${money(flow.closedEstimatedTax)}，净额 ${money(flow.closedNetEstimate)}。税款按持有期或券商汇总核算，与上方当前持仓到账分列。`;
  $("#cashflow-closed-list").innerHTML = flow.closed.map((item) => ledgerRow(item, true)).join("");
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
      ${post.subtitle ? `<p class="note-reader-subtitle">${esc(post.subtitle)}</p>` : ""}
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
  if (selected === "overview") {
    requestAnimationFrame(() => {
      if ($("#view-overview").hidden) return;
      drawReturnChart();
      alignStructurePanels();
    });
  }
}

function closeSidebar() {
  document.body.classList.remove("sidebar-open");
  $("#menu-button").setAttribute("aria-expanded", "false");
}

function setupEvents() {
  window.addEventListener("hashchange", setRoute);
  $("#pnl-calendar-prev").addEventListener("click", () => shiftPnlCalendar(-1));
  $("#pnl-calendar-next").addEventListener("click", () => shiftPnlCalendar(1));
  $("#pnl-calendar-month-mode").addEventListener("click", () => { state.calendarMode = "month"; renderPnlCalendar(window.LUMOS_PERFORMANCE, window.LUMOS_PERFORMANCE?.end || data.dataDate); });
  $("#pnl-calendar-year-mode").addEventListener("click", () => { state.calendarMode = "year"; renderPnlCalendar(window.LUMOS_PERFORMANCE, window.LUMOS_PERFORMANCE?.end || data.dataDate); });
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
  renderCashFlow();
  renderWatchlist();
  renderNotes();
  setupHeroQuotes();
  setupEvents();
  window.addEventListener("popstate", setRoute);
  setupChartInteractions();
  setRoute();
}

init();
