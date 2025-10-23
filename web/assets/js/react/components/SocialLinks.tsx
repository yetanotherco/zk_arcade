import React from "react";

type SocialLinksProps = {
	className?: string;
	align?: "left" | "center" | "right";
};

export const SocialLinks = ({
	className = "",
	align = "center",
}: SocialLinksProps) => {
	const alignment =
		align === "left"
			? "text-left"
			: align === "right"
			? "text-right"
			: "text-center";

	return (
		<p className={[alignment, className].filter(Boolean).join(" ")}>
			Follow{" "}
			<a
				href="https://x.com/alignedlayer"
				target="_blank"
				rel="noopener noreferrer"
				className="text-accent-100 hover:underline"
			>
				Aligned on X
			</a>
			, subscribe to our{" "}
			<a
				href="https://blog.alignedlayer.com/"
				target="_blank"
				rel="noopener noreferrer"
				className="text-accent-100 hover:underline"
			>
				newsletter
			</a>
			, and join the{" "}
			<a
				href="https://discord.gg/alignedlayer"
				target="_blank"
				rel="noopener noreferrer"
				className="text-accent-100 hover:underline"
			>
				Discord
			</a>{" "}
			for the latest updates.
		</p>
	);
};
