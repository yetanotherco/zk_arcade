// Used in nav to toggle the state on small screens
function toggleMenu() {
	const menuOverlay = document.querySelector("#menu-overlay");
	const toggleOpen = document.querySelector(".toggle-open");
	const toggleClose = document.querySelector(".toggle-close");

	if (menuOverlay) menuOverlay.classList.toggle("hidden");
	if (toggleOpen) toggleOpen.classList.toggle("hidden");
	if (toggleClose) toggleClose.classList.toggle("hidden");
}

window.toggleMenu = toggleMenu;

import "phoenix_html";
import "./react/index";
