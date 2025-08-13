import React, { useEffect, useState } from "react";

type ButtonVariant =
	| "accent-fill"
	| "text-accent"
	| "text"
	| "disabled"
	| "disabled-text"
	| "contrast"
	| "icon";

const buttonVariantStyles: { [key in ButtonVariant]: string } = {
	"accent-fill":
		"px-10 text-black py-2 bg-accent-100 hover:bg-accent-200 transition-colors",
	disabled: "px-10 py-2 bg-disabled",
	"disabled-text": "font-normal",
	text: "font-bold hover:underline",
	"text-accent": "font-bold text-accent-100 hover:underline",
	contrast: "border border-contrast-100 px-2 text-sm py-2",
	icon: "p-1 bg-accent-100 text-black flex justify-center items-center",
};

type Props = React.ComponentProps<"button"> & {
	variant: ButtonVariant;
	isLoading?: boolean;
};

export const Button = ({
	variant,
	disabled,
	isLoading,
	className,
	children,
	style,
	...props
}: Props) => {
	const [currentVariant, setCurrentVariant] =
		useState<ButtonVariant>(variant);

	useEffect(() => {
		if (isLoading || disabled) {
			if (
				variant == "text-accent" ||
				variant == "text" ||
				variant == "contrast"
			)
				setCurrentVariant("disabled-text");
			else setCurrentVariant("disabled");
		} else {
			setCurrentVariant(variant);
		}
	}, [isLoading, disabled]);

	return (
		<button
			className={`rounded text-md ${buttonVariantStyles[currentVariant]} ${className}`}
			disabled={disabled || isLoading}
			style={style}
			{...props}
		>
			{isLoading ? "Loading..." : children}
		</button>
	);
};
