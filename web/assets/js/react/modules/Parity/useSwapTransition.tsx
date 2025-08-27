import React, { ReactNode } from "react";
import { useTransition, animated, UseTransitionProps } from "@react-spring/web";

type SwapOptions = Omit<UseTransitionProps, "items" | "children">;

export function useSwapTransition<T>(
	item: T,
	render: (style: any, item: T) => ReactNode,
	containerProps: Omit<React.ComponentProps<"div">, "ref"> = {},
	options?: SwapOptions
) {
	const transitions = useTransition(item, {
		from: { opacity: 0 },
		enter: { opacity: 1 },
		leave: { opacity: 0 },
		config: { tension: 220, friction: 25 },
		exitBeforeEnter: true,
		...options,
	});

	return transitions((style, i) => (
		<animated.div style={style} {...containerProps}>
			{render(style, i)}
		</animated.div>
	));
}
