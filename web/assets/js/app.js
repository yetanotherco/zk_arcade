// This fetches the links in the document and adds target="_blank" and rel="noopener noreferrer" to external
// links. It works for external links that are not part of the current origin. It does not works for links
// that are dynamically added after the page load, such as those created by React components.
document.addEventListener("DOMContentLoaded", () => {
  	document.querySelectorAll('a[href]').forEach(link => {
		try {
			const url = new URL(link.href, window.location.origin);
			if (url.origin !== window.location.origin) {
				link.setAttribute("target", "_blank");
				link.setAttribute("rel", "noopener noreferrer");
			}
		} catch (e) {
			console.warn("Invalid URL in link:", link.href);
		}
	});
});

import "phoenix_html";
import "./react/index";
