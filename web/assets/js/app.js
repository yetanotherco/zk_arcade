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
let liveSocket = new LiveSocket("/live", Socket, {params: {_csrf_token: csrfToken}})

topbar.config({barColors: {0: "#29d"}, shadowColor: "rgba(0, 0, 0, .3)"})
window.addEventListener("phx:page-loading-start", info => topbar.show())
window.addEventListener("phx:page-loading-stop", info => topbar.hide())

window.addEventListener("phx:show_toast", (e) => {
    const { title, desc, type } = e.detail;
    showCustomToast(title, desc, type);
});

function showCustomToast(title, desc, type) {
    let container = document.getElementById('custom-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'custom-toast-container';
        container.style.cssText = `
            position: fixed;
            top: 15%;
            left: 0;
            z-index: 50;
            display: flex;
            width: 100%;
            flex-direction: column;
            align-items: flex-end;
            gap: 20px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const toastWrapper = document.createElement('div');
    toastWrapper.style.cssText = `
        max-width: 90%;
        pointer-events: auto;
    `;

    const toast = document.createElement('div');
    const toastId = 'toast-' + Date.now();
    toast.id = toastId;
    
    let bgColor, borderColor, progressColor;
    if (type === 'success') {
        bgColor = '#bbf7d0';
        borderColor = '#22c55e';
        progressColor = '#22c55e';
    } else if (type === 'error') {
        bgColor = '#fecaca';
        borderColor = '#f87171';
        progressColor = '#ef4444';
    } else if (type === 'warning') {
        bgColor = '#fef3c7';
        borderColor = '#facc15';
        progressColor = '#eab308';
    }

    toast.style.cssText = `
        position: relative;
        display: flex;
        cursor: pointer;
        margin-right: 16px;
        margin-bottom: 16px;
        align-items: center;
        gap: 40px;
        border-radius: 8px;
        padding: 16px 32px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        background-color: ${bgColor};
        border: 1px solid ${borderColor};
        color: #000000;
        max-width: 500px;
        font-family: "Space Mono", monospace;
        transform: translateY(10px);
        opacity: 0;
        transition: all 0.2s ease;
    `;

    const content = document.createElement('div');
    content.innerHTML = `
        <p style="font-size: 1rem; margin: 0; font-weight: 400;">${title}</p>
        ${desc ? `<p style="font-size: 0.875rem; margin: 4px 0 0 0; font-weight: 400;">${desc}</p>` : ''}
    `;
    
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        height: 4px;
        background-color: ${progressColor};
        width: 0%;
        transition: width 0.016s linear;
    `;
    
    toast.appendChild(content);
    toast.appendChild(progressBar);
    toastWrapper.appendChild(toast);
    container.appendChild(toastWrapper);
    
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 10);
    
    let progress = 0;
    let paused = false;
    const duration = 5000;
    const interval = 16;
    const increment = interval / duration;
    
    const progressInterval = setInterval(() => {
        if (!paused) {
            progress += increment;
            progressBar.style.width = `${progress * 100}%`;
            
            if (progress >= 1) {
                clearInterval(progressInterval);
                dismissToast(toastId);
            }
        }
    }, interval);
    
    toast.addEventListener('mouseenter', () => {
        paused = true;
    });
    
    toast.addEventListener('mouseleave', () => {
        paused = false;
    });
    
    toast.addEventListener('click', () => {
        clearInterval(progressInterval);
        dismissToast(toastId);
    });
    
    window.dismissToast = window.dismissToast || {};
    window.dismissToast[toastId] = () => {
        clearInterval(progressInterval);
        
        toast.style.transform = 'translateY(10px)';
        toast.style.opacity = '0';
        
        setTimeout(() => {
            if (toastWrapper.parentNode) {
                container.removeChild(toastWrapper);
                
                if (container.children.length === 0) {
                    document.body.removeChild(container);
                }
            }
            delete window.dismissToast[toastId];
        }, 200);
    };
}

function dismissToast(toastId) {
    if (window.dismissToast && window.dismissToast[toastId]) {
        window.dismissToast[toastId]();
    }
}

window.dismissToast = dismissToast;

liveSocket.connect();
window.liveSocket = liveSocket;
