import { useCallback, useEffect, useRef } from "react";

export const useOnClickOutside = <T extends HTMLElement>(
	cb: (e: MouseEvent) => void,
	ignoreSelectors: string[] = []
) => {
	const ref = useRef<T | null>(null);

	const onClick = (e: MouseEvent) => {
		if (!ref.current) return;

		const target = e.target as Element;
		for (const selector of ignoreSelectors) {
			if (target.closest(selector)) {
				return;
			}
		}

		//@ts-expect-error
		if (!ref.current?.contains(e.target)) {
			e.preventDefault();
			cb(e);
		}
	};

	const setRef = useCallback((node: T) => {
		ref.current = node;
		document.addEventListener("click", onClick, { capture: true });
	}, []);

	useEffect(() => {
		return () =>
			document.removeEventListener("click", onClick, { capture: true });
	}, []);

	return [setRef];
};
