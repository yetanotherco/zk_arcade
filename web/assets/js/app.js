import * as Sentry from "@sentry/react";

Sentry.init({
	dsn: "https://650406f4e17ddceda64e4368937fba4c@o4508502393880576.ingest.de.sentry.io/4508518331449424",
	integrations: [
		Sentry.browserTracingIntegration(),
		Sentry.replayIntegration(),
	],
	// Tracing
	tracesSampleRate: 1.0, //  Capture 100% of the transactions
	// Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
	tracePropagationTargets: [
		"localhost",
		/^https:\/\/genesis\.alignedfoundation\.org\/api/,
	],
	// Session Replay
	replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
	replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

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
