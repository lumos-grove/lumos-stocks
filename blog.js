const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function renderBlog(data) {
  const list = document.getElementById("blog-list");
  const article = document.getElementById("blog-article");
  const content = document.getElementById("blog-article-content");
  document.getElementById("blog-date").textContent = `数据快照 ${data.dataDate}`;

  list.innerHTML = data.posts.length ? data.posts.map((p) => `
    <button class="blog-item reveal" data-post="${esc(p.id)}" type="button">
      <time datetime="${esc(p.date)}">${esc(p.date)}</time>
      <span class="blog-item-title">${esc(p.title)}</span>
      <span class="blog-item-excerpt">${esc(p.excerpt)}</span>
      <span class="blog-read">阅读全文 ↗</span>
    </button>`).join("") : `<p class="blog-empty">还没有文章。</p>`;

  const open = (id, updateHash = true) => {
    const post = data.posts.find((p) => p.id === id);
    if (!post) return;
    content.innerHTML = `
      <header class="blog-article-head">
        <time datetime="${esc(post.date)}">${esc(post.date)}</time>
        <h2>${esc(post.title)}</h2>
        <div class="blog-tags">${post.tags.map((tag) => `<span>${esc(tag)}</span>`).join("")}</div>
      </header>
      <div class="blog-body">${post.body.split(/\n\s*\n/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}</div>`;
    list.hidden = true;
    article.hidden = false;
    if (updateHash) history.replaceState(null, "", `#${encodeURIComponent(id)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const close = () => {
    article.hidden = true;
    list.hidden = false;
    history.replaceState(null, "", location.pathname);
  };
  list.querySelectorAll("[data-post]").forEach((button) =>
    button.addEventListener("click", () => open(button.dataset.post)));
  document.getElementById("blog-back").addEventListener("click", close);
  if (location.hash.length > 1) open(decodeURIComponent(location.hash.slice(1)), false);
  const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add("in"); io.unobserve(entry.target); }
  }), { threshold: 0.06 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

renderBlog(window.LUMOS_DATA);
