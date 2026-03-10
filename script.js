/**
 * SZAKÁCSSEGÉD - DINAMIKUS KATEGÓRIÁK KAMRÁHOZ ÉS RECEPTEKHEZ
 */

// --- GLOBÁLIS ADATOK ---
let kamra = {};
let sajatReceptek = [];
let osszesRecept = [];
let kivalasztottMenu = [];
let ideiglenesHozzavalok = []; // Az éppen készülő recept hozzávalói

// --- KÖZPONTI ADATBÁZIS ---
const kategoriaAdatok = {
    'Zöldség/Gyümölcs': [
        'Burgonya',
        'Vöröshagyma',
        'Fokhagyma',
        'Paradicsom',
        'Paprika',
        'Sárgarépa',
        'Uborka',
        'Alma',
        'Banán',
    ],
    Tejtermék: [
        'Tej',
        'Tejföl',
        'Sajt (Trappista)',
        'Vaj',
        'Túró',
        'Joghurt',
        'Főzőtejszín',
    ],
    'Hús/Húskészítmény': [
        'Csirkemell',
        'Sertéscomb',
        'Marhahús',
        'Szalonna',
        'Sonka',
        'Tojás',
        'Virsli',
    ],
    Pékáru: [
        'Kenyér',
        'Kifli',
        'Zsemle',
        'Liszt (Finom)',
        'Liszt (Rétes)',
        'Zsemlemorzsa',
    ],
    'Fűszer/Szárazáru': [
        'Só',
        'Bors',
        'Pirospaprika',
        'Cukor',
        'Olaj',
        'Rizs',
        'Száraztészta',
        'Bab',
        'Lencse',
    ],
    Egyéb: ['Kávé', 'Tea', 'Citromlé', 'Mustár', 'Ketchup', 'Majonéz'],
};

const valtoszamok = { g: 1, kg: 1000, ml: 1, dl: 100, l: 1000, db: 1 };

// --- INICIALIZÁLÁS ---
window.onload = async () => {
    // Kategória listák feltöltése mindkét helyen
    toltsdFelKategoriakkal('k-kategoria'); // Kamra fül
    toltsdFelKategoriakkal('r-kategoria'); // Recept fül

    await betoltesFirebasebol();
    await alapReceptekBetoltese();
    frissitMindenListat();
};

function toltsdFelKategoriakkal(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">Válassz kategóriát...</option>';
    Object.keys(kategoriaAdatok).forEach((kat) => {
        let opt = document.createElement('option');
        opt.value = opt.innerText = kat;
        select.appendChild(opt);
    });
}

// --- DINAMIKUS VÁLASZTÓK LOGIKÁJA ---

// Kamra fülhöz
function frissitAlapanyagOpciok() {
    frissitAlszint('k-kategoria', 'k-nev-select');
}

// Recept fülhöz
function frissitReceptAlapanyagOpciok() {
    frissitAlszint('r-kategoria', 'r-nev-select');
}

// Általános függvény az al-lista frissítésére
function frissitAlszint(katId, termekId) {
    const kategoria = document.getElementById(katId).value;
    const termekValaszto = document.getElementById(termekId);

    termekValaszto.innerHTML = '<option value="">Válassz terméket...</option>';
    termekValaszto.disabled = !kategoria;

    if (kategoria && kategoriaAdatok[kategoria]) {
        kategoriaAdatok[kategoria].forEach((t) => {
            let opt = document.createElement('option');
            opt.value = opt.innerText = t;
            termekValaszto.appendChild(opt);
        });
    }
}

// --- RECEPT HOZZÁADÁSA ---

function hozzaadIdeiglenesHozzavalo() {
    const nev = document.getElementById('r-nev-select').value;
    const menny = parseFloat(document.getElementById('r-menny').value);
    const egyseg = document.getElementById('r-egyseg').value;

    if (!nev || isNaN(menny)) {
        alert('Válassz alapanyagot és mennyiséget!');
        return;
    }

    ideiglenesHozzavalok.push({ nev, mennyiseg: menny, egyseg });

    // Lista megjelenítése a felületen (opcionális segédfüggvény)
    megjelenitIdeiglenesLista();

    // Mezők ürítése
    document.getElementById('r-menny').value = '';
}

async function receptMentese() {
    const nev = document.getElementById('recept-nev').value.trim();
    if (!nev || ideiglenesHozzavalok.length === 0) {
        alert('Adj nevet a receptnek és legalább egy hozzávalót!');
        return;
    }

    const ujRecept = { nev, hozzavalok: [...ideiglenesHozzavalok] };
    sajatReceptek.push(ujRecept);
    osszesRecept.push(ujRecept);

    await mentesFirebasebe();
    ideiglenesHozzavalok = [];
    document.getElementById('recept-nev').value = '';
    frissitReceptLista();
    alert('Recept elmentve!');
}

// --- EGYÉB FUNKCIÓK (KAMRA, MENÜ, FIREBASE) ---
// (Itt maradnak a korábbi válaszban megírt kamrakezelő és listaépítő függvények...)

async function hozzaadKamra() {
    const nev = document.getElementById('k-nev-select').value;
    const menny = parseFloat(document.getElementById('k-menny').value);
    const egyseg = document.getElementById('k-egyseg').value;

    if (!nev || isNaN(menny)) return alert('Hiányzó adatok!');

    const kulcs = nev.toLowerCase();
    if (kamra[kulcs]) kamra[kulcs].mennyiseg += menny;
    else kamra[kulcs] = { nev, mennyiseg: menny, egyseg };

    await mentesFirebasebe();
    frissitKamraLista();
    document.getElementById('k-menny').value = '';
}

function frissitKamraLista() {
    const lista = document.getElementById('kamraLista');
    if (!lista) return;
    lista.innerHTML = '';
    for (let k in kamra) {
        const t = kamra[k];
        lista.innerHTML += `<li><span class="item-name">${t.nev}</span> <span>${t.mennyiseg} ${t.egyseg}</span> <button onclick="torolKamra('${k}')">Törlés</button></li>`;
    }
}

async function mentesFirebasebe() {
    if (typeof db !== 'undefined') {
        await db
            .collection('felhasznalok')
            .doc('teszt-user')
            .set({ kamra, sajatReceptek });
    }
}

async function betoltesFirebasebol() {
    if (typeof db !== 'undefined') {
        const doc = await db.collection('felhasznalok').doc('teszt-user').get();
        if (doc.exists) {
            kamra = doc.data().kamra || {};
            sajatReceptek = doc.data().sajatReceptek || [];
        }
    }
}

async function alapReceptekBetoltese() {
    // Itt tölthetsz be külső JSON-t, de a sajatReceptek már benne lesz
    osszesRecept = [...sajatReceptek];
}

function frissitMindenListat() {
    frissitKamraLista();
    frissitReceptLista();
}

function frissitReceptLista() {
    const lista = document.getElementById('receptLista');
    if (!lista) return;
    lista.innerHTML = '';
    osszesRecept.forEach((r, i) => {
        lista.innerHTML += `<div class="recept-card"><h4>${r.nev}</h4><button onclick="hozzaadMenuhoz(${i})">Választ</button></div>`;
    });
}

// --- HIÁNYZÓ MENÜ KEZELÉS ---
function hozzaadMenuhoz(index) {
    kivalasztottMenu.push(osszesRecept[index]);
    frissitMenuDisplay();
}

function frissitMenuDisplay() {
    const lista = document.getElementById('kivalasztottReceptek');
    if (!lista) return;
    lista.innerHTML = '';
    kivalasztottMenu.forEach((r, i) => {
        const li = document.createElement('li');
        li.innerHTML = `${r.nev} <button onclick="torolMenubol(${i})">❌</button>`;
        lista.appendChild(li);
    });
}

function torolMenubol(i) {
    kivalasztottMenu.splice(i, 1);
    frissitMenuDisplay();
}

function menuUritese() {
    kivalasztottMenu = [];
    frissitMenuDisplay();
    document.getElementById('osszesitettListaCard').style.display = 'none';
}

// --- IDEIGLENES LISTA MEGJELENÍTÉSE RECEPTÍRÁSKOR ---
function megjelenitIdeiglenesLista() {
    const lista = document.getElementById('ideiglenesLista');
    const kontener = document.getElementById('ideiglenesListaHelye');
    if (!lista || !kontener) return;

    lista.innerHTML = '';
    ideiglenesHozzavalok.forEach((h, i) => {
        lista.innerHTML += `<li>${h.nev}: ${h.mennyiseg} ${h.egyseg}</li>`;
    });

    // Csak akkor mutatjuk a Mentés gombot, ha van hozzávaló
    kontener.style.display = ideiglenesHozzavalok.length > 0 ? 'block' : 'none';
}

function openTab(evt, tabName) {
    let i, tabcontent, tablinks;

    // Összes tartalom elrejtése
    tabcontent = document.getElementsByClassName('tab-content');
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = 'none';
        tabcontent[i].classList.remove('active');
    }

    // Összes gomb deaktiválása
    tablinks = document.getElementsByClassName('tab-link');
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove('active');
    }

    // Csak a kiválasztott fül megjelenítése
    document.getElementById(tabName).style.display = 'block';
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
}
