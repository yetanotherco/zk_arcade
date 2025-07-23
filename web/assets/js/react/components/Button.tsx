import React, { useEffect, useState } from "react";

type ButtonVariant =
	| "accent-fill"
	| "text-accent"
	| "text"
	| "disabled"
	| "disabled-text";

const buttonVariantStyles: { [key in ButtonVariant]: string } = {
	"accent-fill": "px-10 text-black py-2 bg-accent-100",
	disabled: "px-10 py-2 bg-disabled",
	"disabled-text": "font-normal",
	text: "font-bold hover:underline",
	"text-accent": "font-bold text-accent-100 hover:underline",
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
	...props
}: Props) => {
	const [currentVariant, setCurrentVariant] =
		useState<ButtonVariant>(variant);

	useEffect(() => {
		if (isLoading || disabled) {
			if (variant == "text-accent" || variant == "text")
				setCurrentVariant("disabled-text");
			else setCurrentVariant("disabled");
		} else {
			setCurrentVariant(variant);
		}
	}, [isLoading, disabled]);

	return (
		<button
			className={`rounded text-md ${buttonVariantStyles[currentVariant]} ${className}`}
			{...props}
			disabled={disabled || isLoading}
		>
			{isLoading ? <p>Loading...</p> : children}
		</button>
	);
};
