/**
 * SZAKÁCSSEGÉD - TELJES FIREBASE LOGIKA
 * Funkciók: Felhő alapú mentés, mértékegység konverzió, menütervező
 */

// --- GLOBÁLIS ADATOK ---
let kamra = {};
let sajatReceptek = [];
let toroltAlapNevek = [];
let osszesRecept = [];
let kivalasztottMenu = [];
let ideiglenesHozzavalok = [];

// --- KONVERZIÓS TÁBLÁZAT ---
const valtoszamok = {
    g: 1,
    kg: 1000,
    ml: 1,
    dl: 100,
    l: 1000,
    db: 1,
};

const egysegTipusok = {
    g: 'tomeg',
    kg: 'tomeg',
    ml: 'folyadek',
    dl: 'folyadek',
    l: 'folyadek',
    db: 'darab',
};

// --- INICIALIZÁLÁS ---
window.onload = async () => {
    // 1. Adatok letöltése a felhőből
    await betoltesFirebasebol();
    // 2. Alap receptek betöltése a JSON fájlból
    await alapReceptekBetoltese();
    // 3. Felület frissítése
    frissitMindenListat();
};

// --- FIREBASE MŰVELETEK ---
async function betoltesFirebasebol() {
    try {
        // A 'felhasznalo_1' dokumentumot használjuk egyedi azonosítóként
        const doc = await db.collection('adatok').doc('felhasznalo_1').get();
        if (doc.exists) {
            const data = doc.data();
            kamra = data.kamra || {};
            sajatReceptek = data.sajatReceptek || [];
            toroltAlapNevek = data.toroltAlapNevek || [];
            console.log('Adatok betöltve a felhőből.');
        }
    } catch (e) {
        console.error('Firebase betöltési hiba:', e);
    }
}

async function mentesFirebasebe() {
    try {
        await db.collection('adatok').doc('felhasznalo_1').set({
            kamra: kamra,
            sajatReceptek: sajatReceptek,
            toroltAlapNevek: toroltAlapNevek,
        });
        console.log('Szinkronizálás kész.');
    } catch (e) {
        console.error('Firebase mentési hiba:', e);
        alert('Hiba a mentés során! Ellenőrizd az internetkapcsolatot.');
    }
}

async function alapReceptekBetoltese() {
    try {
        const response = await fetch('./data/alap_receptek.json');
        let alapok = response.ok ? await response.json() : [];
        // Csak azokat tartjuk meg, amiket nem töröltél ki
        const szurtAlap = alapok.filter(
            (r) => !toroltAlapNevek.includes(r.nev)
        );
        osszesRecept = [...szurtAlap, ...sajatReceptek];
    } catch (e) {
        console.warn(
            'JSON betöltési hiba, csak a saját receptek jelennek meg.'
        );
        osszesRecept = [...sajatReceptek];
    }
}

// --- KAMRA KEZELÉS ---
async function hozzaadKamra() {
    const nev = document.getElementById('k-nev').value.trim().toLowerCase();
    const menny = parseFloat(document.getElementById('k-menny').value);
    const egyseg = document.getElementById('k-egyseg').value;

    if (!nev || isNaN(menny)) return alert('Kérlek töltsd ki a mezőket!');

    kamra[nev] = { mennyiseg: menny, egyseg: egyseg };
    await mentesFirebasebe();
    frissitKamraLista();

    document.getElementById('k-nev').value = '';
    document.getElementById('k-menny').value = '';
}

async function torolKamra(nev) {
    delete kamra[nev];
    await mentesFirebasebe();
    frissitKamraLista();
}

function frissitKamraLista() {
    const list = document.getElementById('kamraLista');
    list.innerHTML = '';
    for (let nev in kamra) {
        list.innerHTML += `
            <li>
                <span class="item-name">${nev}</span>
                <span>${kamra[nev].mennyiseg} ${kamra[nev].egyseg}</span>
                <button class="delete-btn" onclick="torolKamra('${nev}')">X</button>
            </li>`;
    }
}

// --- RECEPT SZERKESZTÉS ---
function hozzaadIdeiglenesHozzavalo() {
    const nev = document.getElementById('r-h-nev').value.trim().toLowerCase();
    const menny = parseFloat(document.getElementById('r-h-menny').value);
    const egyseg = document.getElementById('r-h-egyseg').value;

    if (!nev || isNaN(menny)) return;

    ideiglenesHozzavalok.push({ nev, mennyiseg: menny, egyseg });
    frissitIdeiglenesLista();

    document.getElementById('r-h-nev').value = '';
    document.getElementById('r-h-menny').value = '';
}

function frissitIdeiglenesLista() {
    const l = document.getElementById('ideiglenesLista');
    l.innerHTML = '';
    ideiglenesHozzavalok.forEach((h, i) => {
        l.innerHTML += `
            <li>
                <span>${h.nev}: ${h.mennyiseg} ${h.egyseg}</span>
                <button class="delete-btn" onclick="ideiglenesHozzavalok.splice(${i},1);frissitIdeiglenesLista();">X</button>
            </li>`;
    });
}

async function mentesRecept() {
    const nev = document.getElementById('receptNev').value.trim();
    if (!nev || ideiglenesHozzavalok.length === 0)
        return alert('Név és hozzávalók szükségesek!');

    sajatReceptek.push({ nev, hozzavalok: [...ideiglenesHozzavalok] });
    await mentesFirebasebe();

    document.getElementById('receptNev').value = '';
    ideiglenesHozzavalok = [];
    frissitIdeiglenesLista();
    await alapReceptekBetoltese();
    frissitReceptLista();
}

async function torolRecept(globalIndex) {
    if (!confirm('Biztosan törlöd a receptet?')) return;

    const recept = osszesRecept[globalIndex];
    const sIdx = sajatReceptek.findIndex((sr) => sr.nev === recept.nev);

    if (sIdx !== -1) {
        sajatReceptek.splice(sIdx, 1);
    } else {
        toroltAlapNevek.push(recept.nev);
    }

    await mentesFirebasebe();
    await alapReceptekBetoltese();
    frissitReceptLista();
}

function frissitReceptLista() {
    const container = document.getElementById('receptLista');
    container.innerHTML = '';
    osszesRecept.forEach((r, i) => {
        container.innerHTML += `
            <li>
                <span class="item-name">${r.nev}</span>
                <div>
                    <button onclick="menuhozAd(${i})" title="Hozzáadás a menühöz">➕</button>
                    <button class="delete-btn" onclick="torolRecept(${i})">X</button>
                </div>
            </li>`;
    });
}

// --- MENÜ ÉS BEVÁSÁRLÓLISTA LOGIKA ---
function menuhozAd(index) {
    kivalasztottMenu.push(osszesRecept[index]);
    frissitMenuDisplay();
}

function frissitMenuDisplay() {
    const l = document.getElementById('kivalasztottReceptek');
    l.innerHTML = '';
    kivalasztottMenu.forEach((r, i) => {
        l.innerHTML += `
            <li>
                <span>${r.nev}</span>
                <button class="delete-btn" onclick="kivalasztottMenu.splice(${i},1);frissitMenuDisplay();">X</button>
            </li>`;
    });
}

function menuUrítése() {
    kivalasztottMenu = [];
    frissitMenuDisplay();
    document.getElementById('osszesitettListaCard').style.display = 'none';
}

function bevasarloListaGeneralasa() {
    if (kivalasztottMenu.length === 0)
        return alert('Előbb adj recepteket a menühöz!');

    let szuksegesAlapban = {}; // Minden ml-ben, g-ban vagy db-ban tárolva

    // 1. Összesítés és konverzió alapmértékegységre
    kivalasztottMenu.forEach((recept) => {
        recept.hozzavalok.forEach((h) => {
            const nev = h.nev;
            const alapMennyiseg = h.mennyiseg * valtoszamok[h.egyseg];

            if (!szuksegesAlapban[nev]) {
                szuksegesAlapban[nev] = { mennyiseg: 0, egyseg: h.egyseg };
            }
            szuksegesAlapban[nev].mennyiseg += alapMennyiseg;
        });
    });

    // 2. Összevetés a kamrával
    const listaHelye = document.getElementById('bevasarloLista');
    listaHelye.innerHTML = '';
    document.getElementById('osszesitettListaCard').style.display = 'block';

    for (let nev in szuksegesAlapban) {
        const kellAlap = szuksegesAlapban[nev].mennyiseg;
        const eredetiEgyseg = szuksegesAlapban[nev].egyseg;

        let vanAlap = 0;
        if (kamra[nev]) {
            vanAlap = kamra[nev].mennyiseg * valtoszamok[kamra[nev].egyseg];
        }

        const li = document.createElement('li');
        if (vanAlap < kellAlap) {
            const hianyAlap = kellAlap - vanAlap;
            // Visszakonvertálás a receptben megadott egységre
            const hianyKijelzett = (
                hianyAlap / valtoszamok[eredetiEgyseg]
            ).toFixed(1);
            li.innerHTML = `<span class="item-name">${nev}</span> <span class="missing">Kell még: ${hianyKijelzett} ${eredetiEgyseg}</span>`;
        } else {
            li.innerHTML = `<span class="item-name">${nev}</span> <span class="ok">Rendben ✅</span>`;
        }
        listaHelye.appendChild(li);
    }
}

// --- SEGÉDFÜGGVÉNYEK ---
function frissitMindenListat() {
    frissitKamraLista();
    frissitReceptLista();
    frissitMenuDisplay();
}

function openTab(evt, tabName) {
    const contents = document.getElementsByClassName('tab-content');
    for (let c of contents) c.classList.remove('active');

    const links = document.getElementsByClassName('tab-link');
    for (let l of links) l.classList.remove('active');

    document.getElementById(tabName).classList.add('active');
    if (evt) evt.currentTarget.classList.add('active');
}
