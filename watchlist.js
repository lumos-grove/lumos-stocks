const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const money = (value) => value == null ? "暂无" : Number(value).toFixed(2);

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
          <div class="watch-tags"><span>${escapeHtml(stock.group)}</span><span>${escapeHtml(stock.industry)}</span></div>
          <p class="watch-note">${escapeHtml(stock.note)}</p>
          <div class="watch-review"><span>复核条件</span><p>${escapeHtml(stock.review)}</p></div>
        </article>`).join("")}</div></section>`;
  }).join("");
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); }
  }), { threshold: 0.06 });
  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

renderWatchlist(window.LUMOS_DATA);
