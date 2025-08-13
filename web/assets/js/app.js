import "phoenix_html";
import "./react/index";
import "./navbar";

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".code-block").forEach((el) => {
        if (el.dataset.copyDecorated) return;
        el.dataset.copyDecorated = "1";

        const wrap = document.createElement("span");
        wrap.className = "inline-flex items-center gap-2 rounded px-2 py-1";
        el.replaceWith(wrap);
        wrap.appendChild(el);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "text-xs opacity-70 hover:opacity-100 focus:outline-none";
        btn.innerHTML = `<span class="hero-document-duplicate w-5 h-5 opacity-70 hover:opacity-100"></span>`;
        wrap.appendChild(btn);

        const copy = async () => {
            const text = el.textContent.trim();
            await navigator.clipboard.writeText(text);
            btn.innerHTML = `<span class="hero-check w-5 h-5 opacity-70 hover:opacity-100"></span>`;
            setTimeout(() => (btn.innerHTML = `<span class="hero-document-duplicate w-5 h-5 opacity-70 hover:opacity-100"></span>`), 1200);
        };

        btn.addEventListener("click", copy);
    });
});
