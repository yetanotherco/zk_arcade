import React, { useEffect } from "react";

const FLAG = "__wc_cleanup_done__";
const w = window as any;

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

			if (!dbExists) {
				w[FLAG] = true;
				window.dispatchEvent(new Event("flagChange"));
				return;
			}

			const openReq = indexedDB.open(DB_NAME);

			openReq.onsuccess = e => {
				const tg = e.target as { result: any } | null;
				const db = tg?.result;
				if (!db) {
					w[FLAG] = true;
					window.dispatchEvent(new Event("flagChange"));
					return;
				}

				const storeNames = Array.from(db.objectStoreNames || []);
				if (!storeNames.length) {
					db.close();
					w[FLAG] = true;
					window.dispatchEvent(new Event("flagChange"));
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
								try {
									let value = getReq.result;
									if (typeof value === "string") {
										try {
											value = JSON.parse(value);
										} catch {
											/* not JSON, leave as-is */
										}
									}

									const isEmpty = (v: any) =>
										Array.isArray(v)
											? v.length === 0
											: v !== null &&
											  typeof v === "object"
											? Object.keys(v).length === 0
											: false;

									if (!isEmpty(value)) {
										const delReq = store.delete(key);
										delReq.onsuccess = () => {
											deletedAny = true;
										};
									}
								} catch {}
							}
						};
					}
				}

				tx.oncomplete = () => {
					db.close();
					if (deletedAny) {
						console.log("Removed stale WalletConnect entries");
					}
					w[FLAG] = true;
					window.dispatchEvent(new Event("flagChange"));
				};

				tx.onerror = () => {
					db.close();
					w[FLAG] = true;
					window.dispatchEvent(new Event("flagChange"));
				};
			};
		};

		cleanupWalletConnectDB();
	}, []);

	return null;
};
