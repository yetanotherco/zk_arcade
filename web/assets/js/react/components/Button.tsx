import React, { useEffect, useState } from "react";

type ButtonVariant = "accent-fill" | "text" | "disabled";

const buttonVariantStyles: { [key in ButtonVariant]: string } = {
	"accent-fill": "bg-accent-100",
	disabled: "bg-disabled",
	text: "",
};

type Props = React.ComponentProps<"button"> & {
	variant: "accent-fill" | "text";
	isLoading?: boolean;
};

export const Button = ({
	variant,
	disabled,
	isLoading,
	children,
	...props
}: Props) => {
	const [currentVariant, setCurrentVariant] =
		useState<ButtonVariant>(variant);

	useEffect(() => {
		if (isLoading || disabled) {
			setCurrentVariant("disabled");
		} else {
			setCurrentVariant(variant);
		}
	}, [isLoading, disabled]);

	return (
		<button
			className={`rounded px-10 py-2 font-bold text-md ${buttonVariantStyles[currentVariant]}`}
			{...props}
			disabled={disabled || isLoading}
		>
			{isLoading ? <p>Loading...</p> : children}
		</button>
	);
};
