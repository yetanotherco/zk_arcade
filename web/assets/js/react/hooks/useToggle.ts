import { Dispatch, SetStateAction, useState } from "react";

export const useToggle = (
	initial = false
): [boolean, () => void, Dispatch<SetStateAction<boolean>>] => {
	const [active, setIsActive] = useState(initial);
	const toggle = () => setIsActive(prev => !prev);

	return [active, toggle, setIsActive];
};
