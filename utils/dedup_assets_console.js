/**
 * Duplikate in WorkshopAssessmentDB bereinigen — Browser-DevTools-Konsolen-Script.
 *
 * Einfügen in die DevTools-Konsole (F12) während die App läuft.
 *
 * Logik:
 *   - Duplikat-Erkennung: gleicher (projectId + title) oder gleicher (projectId + fileName)
 *   - Behalten: immer den Eintrag mit dem neuesten `updatedAt` (ISO 8601)
 *   - Löschen: Metadaten-Eintrag UND zugehöriger Blob werden gemeinsam gelöscht
 *   - Trockentest-Modus: DRY_RUN = true  → nur ausgeben, nichts löschen
 */

(async () => {
    const DRY_RUN = false; // auf true setzen zum reinen Analysieren

    // IndexedDB direkt öffnen (DB-Name muss mit workshopDb.ts übereinstimmen)
    function openDb() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('WorkshopAssessmentDB');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function getAllFromStore(db, storeName) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function deleteFromStores(db, id) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['assets', 'assetBlobs'], 'readwrite');
            tx.objectStore('assets').delete(id);
            tx.objectStore('assetBlobs').delete(id);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    }

    // ── Datenbankzugriff ──────────────────────────────────────────────────────
    const db = await openDb();
    const assets = await getAllFromStore(db, 'assets');

    console.log(`%c[Dedup] ${assets.length} Assets geladen`, 'color:#1976d2;font-weight:bold');

    // ── Duplikat-Gruppen bilden ───────────────────────────────────────────────
    // Schlüssel: "projectId|normierter Titel" (Leerzeichen, Groß/Klein ignorieren)
    const groups = new Map();

    for (const asset of assets) {
        const key = `${asset.projectId}|${(asset.title || asset.fileName || asset.id).toLowerCase().trim()}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(asset);
    }

    const duplicateGroups = [...groups.entries()].filter(([, g]) => g.length > 1);

    if (duplicateGroups.length === 0) {
        console.log('%c[Dedup] Keine Duplikate gefunden ✓', 'color:#22c55e;font-weight:bold');
        db.close();
        return;
    }

    console.log(`%c[Dedup] ${duplicateGroups.length} Duplikat-Gruppe(n) gefunden`, 'color:#e65100;font-weight:bold');

    let totalDeleted = 0;

    for (const [key, group] of duplicateGroups) {
        // Neuestes zuerst (updatedAt absteigend)
        group.sort((a, b) => {
            const ta = a.updatedAt || a.createdAt || '';
            const tb = b.updatedAt || b.createdAt || '';
            return tb.localeCompare(ta); // ISO-Strings lassen sich direkt vergleichen
        });

        const [keep, ...remove] = group;

        console.group(`%cGruppe: "${key}"`, 'color:#546e7a');
        console.log(`  ✅ Behalten:  id=${keep.id}  updatedAt=${keep.updatedAt}  zone=${keep.zoneId ?? '–'}  gps=${keep.gpsLat != null ? `${keep.gpsLat.toFixed(5)},${keep.gpsLon.toFixed(5)}` : 'fehlt'}`);
        for (const dup of remove) {
            console.log(`  🗑  Löschen:  id=${dup.id}  updatedAt=${dup.updatedAt}  zone=${dup.zoneId ?? '–'}  gps=${dup.gpsLat != null ? `${dup.gpsLat.toFixed(5)},${dup.gpsLon.toFixed(5)}` : 'fehlt'}`);
            if (!DRY_RUN) {
                await deleteFromStores(db, dup.id);
                totalDeleted++;
            }
        }
        console.groupEnd();
    }

    db.close();

    if (DRY_RUN) {
        console.log('%c[Dedup] DRY_RUN — nichts gelöscht. Setze DRY_RUN = false zum echten Bereinigen.', 'color:#f57c00;font-weight:bold');
    } else {
        console.log(`%c[Dedup] ${totalDeleted} Duplikat(e) gelöscht ✓  — Seite neu laden (F5) empfohlen.`, 'color:#22c55e;font-weight:bold');
    }
})();
