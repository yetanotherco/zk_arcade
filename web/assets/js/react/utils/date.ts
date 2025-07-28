export const timeAgo = (dateString: string) => {
	const pastDate = new Date(dateString);
	const now = new Date();
	const diffInMs = now.getTime() - pastDate.getTime();

	const seconds = Math.floor(diffInMs / 1000);
	const minutes = Math.floor(diffInMs / (1000 * 60));
	const hours = Math.floor(diffInMs / (1000 * 60 * 60));
	const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

	if (seconds < 60) {
		return "just now";
	} else if (minutes < 60) {
		return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
	} else if (hours < 24) {
		return `${hours} hour${hours === 1 ? "" : "s"} ago`;
	} else {
		return `${days} day${days === 1 ? "" : "s"} ago`;
	}
};
