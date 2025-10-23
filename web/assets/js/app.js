import "phoenix_html"
import {Socket} from "phoenix"
import {LiveSocket} from "phoenix_live_view"
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

let liveSocket = new LiveSocket("/live", Socket, {params: {_csrf_token: csrfToken}, hooks: Hooks})

window.addEventListener("phx:show_toast", (event) => {
    showToast(event.detail.message, event.detail.type)
})

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container')
    if (!container) return

    // Create toast element
    const toast = document.createElement('div')
    toast.className = `max-w-sm toast-enter pointer-events-auto mb-4`

    toast.innerHTML = `
        <div class="w-screen flex items-center justify-center">
            <div class="w-full max-w-[800px] bg-accent-200 border-accent-200 text-black relative flex cursor-pointer items-center gap-4 rounded-md border-2 px-3 py-2 shadow-lg">
                <div class="flex-1">
                    <p class="text-sm font-medium text-center">${message}</p>
                </div>
            </div>
        </div>
    `

    // Add to container
    container.appendChild(toast)

    // Auto remove after 6 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove()
        }
    }, 6000)
}

liveSocket.connect();
window.liveSocket = liveSocket;
