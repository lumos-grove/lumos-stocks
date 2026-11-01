const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const money = (value) => value == null ? "暂无" : Number(value).toFixed(2);

function buyEligibility(stock) {
  if (stock.group === "待研究") return "待研究，尚未判断";
  if (stock.group.includes("／")) return "估值与风险达标，股息率条件未满足";
  if (stock.group === "第一档") return "符合估值与风险门槛";
  if (stock.group === "第二档") return "符合，可小量买入";
  if (stock.group === "第三档") return "暂不符合，继续观察";
  if (stock.group === "第四档") return "不符合，暂不买入";
  return "待核实";
}

function renderWatchlist(data) {
  document.getElementById("watchlist-date").textContent = `行情截至 ${data.dataDate}`;
  document.getElementById("watchlist-foot").textContent =
    `关注判断记录截至 ${data.watchlist.asOf} · 共 ${data.watchlist.stocks.length} 只 · 不构成投资建议`;
  document.getElementById("watchlist-groups").innerHTML = ["核心价值", "行业龙头"].map((pool) => {
    const stocks = data.watchlist.stocks.filter((stock) => stock.pool === pool);
    return `<section class="watch-pool"><div class="watch-pool-head"><h2>${pool}</h2><span>${stocks.length} 只</span></div>
      <div class="watchlist-grid">${stocks.map((stock) => `
        <article class="watch-card reveal">
          <div class="watch-card-head">
            <div><h3>${escapeHtml(stock.name)}</h3><div class="watch-code">${escapeHtml(stock.code)}</div></div>
            <div class="watch-price">${money(stock.closePrice)}<small>${escapeHtml(stock.closeDate || "暂无行情")}</small></div>
          </div>
          <div class="watch-tags"><span>${escapeHtml(stock.industry)}</span></div>
          <div class="watch-detail"><span>纳入原因</span><p>${escapeHtml(stock.note)}</p></div>
          <div class="watch-detail watch-eligibility"><span>买入资格</span><p>${escapeHtml(buyEligibility(stock))}</p></div>
          <button class="watch-chart-button" type="button" data-chart-code="${escapeHtml(stock.code)}">查看 K 线 →</button>
        </article>`).join("")}</div></section>`;
  }).join("");
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); }
  }), { threshold: 0.06 });
  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

renderWatchlist(window.LUMOS_DATA);

const chartModal = document.getElementById("watch-chart-modal");
const chartScroll = document.getElementById("watch-chart-scroll");
const chartCanvas = document.getElementById("watch-chart");
let selectedStock = null;
let chartFrame = 0;

function drawWatchChart(stock) {
  const bars = stock.klines || [];
  const width = Math.max(chartScroll.clientWidth, bars.length * 3.2 + 66);
  const height = Math.min(360, Math.max(240, Math.round(width * 0.42)));
  const scale = window.devicePixelRatio || 1;
  chartCanvas.width = Math.round(width * scale);
  chartCanvas.height = Math.round(height * scale);
  chartCanvas.style.width = `${width}px`;
  chartCanvas.style.height = `${height}px`;
  const ctx = chartCanvas.getContext("2d");
  ctx.scale(scale, scale);
  const css = getComputedStyle(document.documentElement);
  const color = (name) => css.getPropertyValue(name).trim();
  if (!bars.length) {
    ctx.fillStyle = color("--ink-faint");
    ctx.font = "13px sans-serif";
    ctx.fillText("暂无 K 线数据", 20, 40);
    return;
  }
  const padL = 8, padR = 58, padT = 14, padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const prices = bars.flatMap((bar) => [bar.h, bar.l]);
  let minPrice = Math.min(...prices), maxPrice = Math.max(...prices);
  const margin = (maxPrice - minPrice) * 0.06 || 0.01;
  minPrice -= margin;
  maxPrice += margin;
  const step = plotW / bars.length;
  const x = (index) => padL + step * (index + 0.5);
  const y = (price) => padT + (maxPrice - price) / (maxPrice - minPrice) * plotH;
  ctx.font = "10px 'IBM Plex Mono', monospace";
  ctx.strokeStyle = color("--line");
  ctx.fillStyle = color("--ink-faint");
  for (let index = 0; index <= 4; index++) {
    const price = minPrice + (maxPrice - minPrice) * index / 4;
    const yy = y(price);
    ctx.beginPath();
    ctx.moveTo(padL, yy);
    ctx.lineTo(width - padR, yy);
    ctx.stroke();
    ctx.fillText(price.toFixed(2), width - padR + 6, yy + 3);
  }
  const months = [];
  bars.forEach((bar, index) => {
    const label = bar.d.slice(0, 7);
    if (months.at(-1)?.label === label) months.at(-1).end = index;
    else months.push({ label, start: index, end: index });
  });
  const visibleLeft = chartScroll.scrollLeft + 8;
  const visibleRight = chartScroll.scrollLeft + chartScroll.clientWidth - 8;
  let lastRight = visibleLeft - 12;
  ctx.textAlign = "center";
  months.forEach((month) => {
    const center = (x(month.start) + x(month.end)) / 2;
    const halfWidth = ctx.measureText(month.label).width / 2;
    if (center - halfWidth < Math.max(padL, visibleLeft, lastRight + 12)) return;
    if (center + halfWidth > Math.min(width - padR, visibleRight)) return;
    ctx.fillText(month.label, center, height - 8);
    lastRight = center + halfWidth;
  });
  ctx.textAlign = "left";
  bars.forEach((bar, index) => {
    const rising = bar.c >= bar.o;
    ctx.strokeStyle = ctx.fillStyle = color(rising ? "--up" : "--down");
    const xx = x(index);
    ctx.beginPath();
    ctx.moveTo(xx, y(bar.h));
    ctx.lineTo(xx, y(bar.l));
    ctx.stroke();
    const top = Math.min(y(bar.o), y(bar.c));
    ctx.fillRect(xx - Math.max(1.5, step * 0.62) / 2, top,
      Math.max(1.5, step * 0.62), Math.max(1, Math.abs(y(bar.o) - y(bar.c))));
  });
}

function closeWatchChart() {
  chartModal.hidden = true;
  document.body.style.overflow = "";
  selectedStock = null;
}

document.getElementById("watchlist-groups").addEventListener("click", (event) => {
  const button = event.target.closest("[data-chart-code]");
  if (!button) return;
  selectedStock = window.LUMOS_DATA.watchlist.stocks.find((stock) => stock.code === button.dataset.chartCode);
  if (!selectedStock) return;
  document.getElementById("watch-chart-title").textContent = `${selectedStock.name}（${selectedStock.code}）`;
  document.getElementById("watch-chart-sub").textContent =
    `${selectedStock.industry} · 收盘 ${money(selectedStock.closePrice)}（${selectedStock.closeDate || "暂无行情"}）`;
  document.getElementById("watch-chart-range").textContent = selectedStock.klineStart
    ? `${selectedStock.klineStart} — ${selectedStock.klineDate} · 可横向滚动` : "暂无日线数据";
  chartModal.hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    drawWatchChart(selectedStock);
    chartScroll.scrollLeft = chartScroll.scrollWidth;
    drawWatchChart(selectedStock);
  });
});

chartModal.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-chart]")) closeWatchChart();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !chartModal.hidden) closeWatchChart();
});
chartScroll.addEventListener("scroll", () => {
  if (chartFrame || !selectedStock) return;
  chartFrame = requestAnimationFrame(() => {
    chartFrame = 0;
    if (selectedStock) drawWatchChart(selectedStock);
  });
});
chartScroll.addEventListener("wheel", (event) => {
  if (chartScroll.scrollWidth <= chartScroll.clientWidth || event.shiftKey) return;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta) return;
  event.preventDefault();
  chartScroll.scrollLeft += delta;
}, { passive: false });
let drag = null;
chartScroll.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  drag = { x: event.clientX, left: chartScroll.scrollLeft };
  chartScroll.setPointerCapture(event.pointerId);
  chartScroll.classList.add("is-dragging");
});
chartScroll.addEventListener("pointermove", (event) => {
  if (drag) chartScroll.scrollLeft = drag.left - (event.clientX - drag.x);
});
const releaseDrag = () => { drag = null; chartScroll.classList.remove("is-dragging"); };
chartScroll.addEventListener("pointerup", releaseDrag);
chartScroll.addEventListener("pointercancel", releaseDrag);
window.addEventListener("resize", () => {
  if (!selectedStock) return;
  const atEnd = chartScroll.scrollLeft + chartScroll.clientWidth >= chartScroll.scrollWidth - 2;
  drawWatchChart(selectedStock);
  if (atEnd) chartScroll.scrollLeft = chartScroll.scrollWidth;
});
