import "phoenix_html"
import {Socket} from "phoenix"
import {LiveSocket} from "phoenix_live_view"
import topbar from "../vendor/topbar"
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
        btn.className = "text-xs focus:outline-none";
        btn.innerHTML = `<span class="hero-document-duplicate w-5 h-5"></span>`;
        wrap.appendChild(btn);

        const copy = async () => {
            const text = el.textContent.trim();
            await navigator.clipboard.writeText(text);
            btn.innerHTML = `<span class="hero-check w-5 h-5" style="color: #18FF7F;"></span>`;
            setTimeout(() => (btn.innerHTML = `<span class="hero-document-duplicate w-5 h-5"></span>`), 1200);
        };

        btn.addEventListener("click", copy);
    });
});

function changeMuteState() {
    const audio = document.getElementById('bg-music');
    if (audio) {
        audio.muted = !audio.muted;
    }
}

window.changeMuteState = changeMuteState

let csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")

let Hooks = {}
Hooks.AutoDismissToast = {
    mounted() {
        const dismissAfter = parseInt(this.el.dataset.dismissAfter) || 5000
        this.timer = setTimeout(() => {
            this.el.style.opacity = '0'
            this.el.style.transform = 'translateX(100%)'
            setTimeout(() => {
                this.el.style.display = 'none'
            }, 300)
        }, dismissAfter)
    },
    destroyed() {
        if (this.timer) {
            clearTimeout(this.timer)
        }
    }
}

let liveSocket = new LiveSocket("/live", Socket, {params: {_csrf_token: csrfToken}, hooks: Hooks})

topbar.config({barColors: {0: "#29d"}, shadowColor: "rgba(0, 0, 0, .3)"})
window.addEventListener("phx:page-loading-start", info => topbar.show())
window.addEventListener("phx:page-loading-stop", info => topbar.hide())

liveSocket.connect();
window.liveSocket = liveSocket;
