import React, { createContext, ReactNode, useContext, useState } from "react";

export type Toast = {
	id: string;
	title: string;
	desc: string;
	type: "success" | "error";
};

type ToastContextType = {
	toasts: Toast[];
	addToast: (toast: Omit<Toast, "id">) => { id: string };
	removeToastById: (id: string) => void;
};

const ToastsContext = createContext<ToastContextType>({
	toasts: [],
	addToast: _ => ({ id: "" }),
	removeToastById: (id: string) => null,
});

export const useToast = () => {
	const ctx = useContext(ToastsContext);

	return ctx;
};

export const ToastsProvider = ({ children }: { children: ReactNode }) => {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const addToast = (toast: Omit<Toast, "id">): { id: string } => {
		const toastId = crypto.randomUUID(); // built-in in modern browsers & Node.js
		setToasts(prev => [...prev, { ...toast, id: toastId }]);

		return {
			id: toastId,
		};
	};

	const removeToastById = (toastId: string) => {
		setToasts(prev => {
			return prev.filter(item => item.id !== toastId);
		});
	};

	return (
		<ToastsContext.Provider value={{ toasts, addToast, removeToastById }}>
			{children}
		</ToastsContext.Provider>
	);
};
