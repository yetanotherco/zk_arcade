import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useToast } from "../../state/toast";
import { Toast } from "./Toast";

export const ToastContainer = () => {
	const { toasts } = useToast();

	return createPortal(
		<div className="fixed top-[15%] left-0 z-50 flex w-full flex-col items-end gap-5" data-toast-container>
			<div className="max-w-[90%]">
				{toasts.map(toast => (
					<Toast key={toast.id} {...toast} />
				))}
			</div>
		</div>,
		document.body
	);
};
