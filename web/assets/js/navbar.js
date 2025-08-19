// Toggle the hamburger menu state on small screens
function toggleMenu() {
	const menuOverlay = document.querySelector("#menu-overlay");
	const toggleOpen = document.querySelector(".toggle-open");
	const toggleClose = document.querySelector(".toggle-close");

	if (menuOverlay) menuOverlay.classList.toggle("hidden");
	if (toggleOpen) toggleOpen.classList.toggle("hidden");
	if (toggleClose) toggleClose.classList.toggle("hidden");
}

// Toggle the kebab menu dropdown on large screens
function toggleKebabMenu() {
	const kebabDropdown = document.querySelector("#kebab-dropdown");
	if (kebabDropdown) {
		kebabDropdown.classList.toggle("hidden");
	}
}

window.toggleMenu = toggleMenu;
window.toggleKebabMenu = toggleKebabMenu;

document.addEventListener("DOMContentLoaded", function() {
	// Click outside to close kebab menu
	document.addEventListener("click", function(event) {
		const kebabDropdown = document.querySelector("#kebab-dropdown");
		const kebabToggle = document.querySelector("#kebab-toggle");
		
		if (kebabDropdown && !kebabDropdown.classList.contains("hidden")) {
			if (!kebabToggle.contains(event.target) && !kebabDropdown.contains(event.target)) {
				kebabDropdown.classList.add("hidden");
			}
		}
	});

	// Close kebab menu on escape key
	document.addEventListener("keydown", function(event) {
		if (event.key === "Escape") {
			const kebabDropdown = document.querySelector("#kebab-dropdown");
			if (kebabDropdown && !kebabDropdown.classList.contains("hidden")) {
				kebabDropdown.classList.add("hidden");
			}
		}
	});
});

// Nav scrolling fix style changes
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
