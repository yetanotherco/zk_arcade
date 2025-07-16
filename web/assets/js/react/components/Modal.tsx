import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useOnClickOutside } from "../hooks/useOnClickOutside";
import { useOnKeyDown } from "../hooks/useOnKeyDown";
import { useIsMounted } from "connectkit";

type Props = {
	open: boolean;
	maxWidth: number;
	setOpen: (prev: boolean) => void;
	onOpen?: () => void;
	onClose?: () => void;
	shouldCloseOnEsc?: boolean;
	shouldCloseOnOutsideClick?: boolean;
	showCloseButton?: boolean;
	children?: React.ReactNode;
};

export const Modal = ({
	open,
	setOpen,
	shouldCloseOnEsc = true,
	shouldCloseOnOutsideClick = true,
	onOpen,
	onClose,
	showCloseButton = true,
	children,
	maxWidth,
}: Props) => {
	const mounted = useIsMounted();

	useOnKeyDown(({ key }) => {
		if (!shouldCloseOnEsc) return;
		if (key === "Escape") setOpen(false);
	});

	const [ref] = useOnClickOutside<HTMLDivElement>(
		() => shouldCloseOnOutsideClick && setOpen(false)
	);

	useEffect(() => {
		if (!mounted) return;
		if (open) {
			document.body.style.overflow = "hidden";
			onOpen && onOpen();
		}
		if (!open) {
			document.body.style.overflow = "";
			onClose && onClose();
		}
	}, [mounted, open, onOpen, onClose]);

	if (!open) return null;
	return createPortal(
		<div className="max-sm:p-6 bg-modal-overlay fixed inset-0 z-20 h-full w-full p-10">
			<div className="flex h-full w-full items-center justify-center">
				<div ref={ref} className="content w-full" style={{ maxWidth }}>
					<div className="relative">
						{showCloseButton && (
							<div className="absolute right-5 top-5 z-30 cursor-pointer">
								<span
									className="hero-x-mark size-6"
									onClick={() => setOpen(false)}
								/>
							</div>
						)}
					</div>
					{children}
				</div>
			</div>
		</div>,
		document.body
	);
};
