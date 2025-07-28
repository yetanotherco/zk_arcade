export const shortenHash = (hash: string) => {
	return `${hash.slice(0, 2)}...${hash.slice(-4)}`;
};
