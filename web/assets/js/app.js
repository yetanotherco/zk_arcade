import "phoenix_html";
import "./react/index";
import "./navbar";
import {LiveSocket} from "phoenix_live_view";
import {Socket} from "phoenix";

export const Hooks = {};

Hooks.CopyableCode = {
    mounted() { this.decorate(); },
    updated() { this.decorate(); },

    decorate() {
        this.el.querySelectorAll(".code-block").forEach((el) => {
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
    },
};

let liveSocket = new LiveSocket("/live", Socket, { hooks: Hooks });
liveSocket.connect();
