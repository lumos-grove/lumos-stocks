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
        </article>`).join("")}</div></section>`;
  }).join("");
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); }
  }), { threshold: 0.06 });
  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

renderWatchlist(window.LUMOS_DATA);
