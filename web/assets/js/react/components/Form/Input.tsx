import React, { forwardRef } from "react";

type Props = React.ComponentProps<"input"> & {
	label: string;
};

export const FormInput = forwardRef<HTMLInputElement, Props>(
	({ label, type = "text", ...props }, ref) => {
		return (
			<div className="w-full">
				<p className="mb-2 text-sm">{label}</p>
				<input
					type={type}
					ref={ref}
					className="w-full bg-contrast-200 rounded border-none text-white"
					{...props}
				/>
			</div>
		);
	}
);
