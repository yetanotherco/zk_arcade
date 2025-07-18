import React, { useEffect, useState } from "react";

export const useCSRFToken = () => {
	const [csrfToken, setCsrfToken] = useState("");

	useEffect(() => {
		const csrfToken =
			document.head
				.querySelector("[name~=csrf-token]")
				?.getAttribute("content") || "";
		setCsrfToken(csrfToken);
	}, []);

	return { csrfToken };
};
