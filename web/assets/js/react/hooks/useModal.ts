import { useState } from "react";

export const useModal = (value = false) => {
	const [open, setOpen] = useState(value);

	const toggleOpen = () => setOpen(prev => !prev);

	return { open, setOpen, toggleOpen };
};
