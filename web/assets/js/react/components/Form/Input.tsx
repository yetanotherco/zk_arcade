import React, { forwardRef } from "react";

type Props = React.ComponentProps<"input"> & {
	label: string;
};

export const FormInput = forwardRef<HTMLInputElement, Props>(
	({ label, ...props }, ref) => {
		return (
			<div className="w-full">
				<p className="mb-2 text-sm">{label}</p>
				<input
					type="text"
					className="w-full bg-contrast-200 rounded border-none text-white"
					ref={ref}
					{...props}
				/>
			</div>
		);
	}
);
