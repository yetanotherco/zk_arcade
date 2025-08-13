// Toggle the state on small screens
function toggleMenu() {
	const menuOverlay = document.querySelector("#menu-overlay");
	const toggleOpen = document.querySelector(".toggle-open");
	const toggleClose = document.querySelector(".toggle-close");

	if (menuOverlay) menuOverlay.classList.toggle("hidden");
	if (toggleOpen) toggleOpen.classList.toggle("hidden");
	if (toggleClose) toggleClose.classList.toggle("hidden");
}

window.toggleMenu = toggleMenu;

// nav scrolling fix style changes
document.addEventListener("scroll", function () {
	const header = document.querySelector(".nav-container");
	const scrollTrigger = 50;

	if (window.scrollY > scrollTrigger) {
		header.classList.add("bg-contrast-200");
		header.classList.remove("pt-10");
	} else {
		header.classList.remove("bg-contrast-200");
		header.classList.add("pt-10");
	}
});
