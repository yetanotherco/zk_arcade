import React, { useEffect } from "react";

export const WalletConnectCleaner = () => {
	useEffect(() => {
		const cleanupWalletConnectDB = async () => {
			const DB_NAME = "WALLET_CONNECT_V2_INDEXED_DB";
			const TARGET_KEYS = [
				"wc@2:core:0.3:history",
				"wc@2:core:0.3:messages",
			];

			let dbExists = true;
			if (typeof indexedDB.databases === "function") {
				try {
					const dbs = await indexedDB.databases();
					dbExists = dbs.some(d => d && d.name === DB_NAME);
				} catch {}
			}

			if (!dbExists) return;

			const openReq = indexedDB.open(DB_NAME);

			openReq.onsuccess = e => {
				const tg = e.target as { result: any } | null;
				const db = tg?.result;
				if (!db) return;

				const storeNames = Array.from(db.objectStoreNames || []);
				if (!storeNames.length) {
					db.close();
					return;
				}

				const tx = db.transaction(storeNames, "readwrite");
				let deletedAny = false;

				for (const storeName of storeNames) {
					const store = tx.objectStore(storeName);
					for (const key of TARGET_KEYS) {
						const getReq = store.get(key);
						getReq.onsuccess = () => {
							if (getReq.result !== undefined) {
								const delReq = store.delete(key);
								delReq.onsuccess = () => {
									deletedAny = true;
								};
							}
						};
					}
				}

				tx.oncomplete = () => {
					db.close();
					if (deletedAny) {
						console.log("Removed stale WalletConnect entries");
					}
				};

				tx.onerror = () => {
					db.close();
				};
			};
		};

		cleanupWalletConnectDB();
	}, []);

	return null;
};
