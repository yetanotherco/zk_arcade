export const timeAgo = (dateString: string) => {
	const pastDate = new Date(dateString + "Z");
	const diffInMs = Date.now() - pastDate.getTime();

	const seconds = Math.floor(diffInMs / 1000);
	const minutes = Math.floor(diffInMs / (1000 * 60));
	const hours = Math.floor(diffInMs / (1000 * 60 * 60));
	const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

	if (seconds < 60) {
		return "just now";
	} else if (minutes < 60) {
		return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
	} else if (hours < 24) {
		return `${hours} hour${hours === 1 ? "" : "s"} ago`;
	} else {
		return `${days} day${days === 1 ? "" : "s"} ago`;
	}
};

export const timeAgoInHs = (dateString: string) => {
	const pastDate = new Date(dateString + "Z");

	const nowUtc = Date.now();
	const diffInMs = nowUtc - pastDate.getTime();
	const hours = Math.floor(diffInMs / (1000 * 60 * 60));

	return hours;
};
