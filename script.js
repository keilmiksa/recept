// --- GLOBÁLIS ADATOK ---
let kamra = {};
let sajatReceptek = [];
let kivalasztottMenu = [];
let ideiglenesHozzavalok = [];

const valtoszamok = { g: 1, kg: 1000, ml: 1, dl: 100, l: 1000, db: 1 };

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
    'Alapvető/Száraz': [
        'Liszt',
        'Cukor',
        'Só',
        'Rizs',
        'Tészta',
        'Olaj',
        'Zsemlemorzsa',
        'Pirospaprika',
    ],
};

// --- INICIALIZÁLÁS ---
window.onload = async () => {
    await betoltesFirebasebol();
    toltsdFelKategoriakkal('k-kategoria');
    toltsdFelKategoriakkal('r-kategoria');
    frissitMindenListat();
};

function toltsdFelKategoriakkal(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">Kategória...</option>';
    for (let kat in kategoriaAdatok) {
        let opt = document.createElement('option');
        opt.value = kat;
        opt.innerHTML = kat;
        select.appendChild(opt);
    }
}

function frissitAlapanyagOpciok() {
    const kat = document.getElementById('k-kategoria').value;
    const select = document.getElementById('k-nev-select');
    select.innerHTML = '<option value="">Alapanyag...</option>';
    if (!kat) {
        select.disabled = true;
        return;
    }
    select.disabled = false;
    kategoriaAdatok[kat].forEach((a) => {
        let opt = document.createElement('option');
        opt.value = a;
        opt.innerHTML = a;
        select.appendChild(opt);
    });
}

function frissitReceptAlapanyagOpciok() {
    const kat = document.getElementById('r-kategoria').value;
    const select = document.getElementById('r-nev-select');
    select.innerHTML = '<option value="">Alapanyag...</option>';
    if (!kat) {
        select.disabled = true;
        return;
    }
    select.disabled = false;
    kategoriaAdatok[kat].forEach((a) => {
        let opt = document.createElement('option');
        opt.value = a;
        opt.innerHTML = a;
        select.appendChild(opt);
    });
}

// --- KAMRA KEZELÉS ---
async function hozzaadKamra() {
    const nev = document.getElementById('k-nev-select').value;
    const menny = parseFloat(document.getElementById('k-menny').value);
    const egyseg = document.getElementById('k-egyseg').value;

    if (!nev || isNaN(menny)) return;

    if (kamra[nev] && kamra[nev].egyseg === egyseg) {
        kamra[nev].mennyiseg += menny;
    } else {
        kamra[nev] = { nev, mennyiseg: menny, egyseg };
    }
    await mentesFirebasebe();
    frissitKamraLista();
}

async function torolKamra(nev) {
    if (confirm(`Törlöd a(z) ${nev} alapanyagot a kamrából?`)) {
        delete kamra[nev];
        await mentesFirebasebe();
        frissitKamraLista();
    }
}

// --- RECEPT KEZELÉS ---
function hozzaadIdeiglenesHozzavalo() {
    const nev = document.getElementById('r-nev-select').value;
    const menny = parseFloat(document.getElementById('r-menny').value);
    const egyseg = document.getElementById('r-egyseg').value;

    if (!nev || isNaN(menny)) return;
    ideiglenesHozzavalok.push({ nev, mennyiseg: menny, egyseg });
    megjelenitIdeiglenesLista();
}

function torolIdeiglenesHozzavalo(index) {
    ideiglenesHozzavalok.splice(index, 1);
    megjelenitIdeiglenesLista();
}

function megjelenitIdeiglenesLista() {
    const lista = document.getElementById('ideiglenesLista');
    const kontener = document.getElementById('ideiglenesListaHelye');
    lista.innerHTML = '';
    ideiglenesHozzavalok.forEach((h, i) => {
        lista.innerHTML += `<li>${h.nev}: ${h.mennyiseg} ${h.egyseg} <button onclick="torolIdeiglenesHozzavalo(${i})">✖</button></li>`;
    });
    kontener.style.display = ideiglenesHozzavalok.length > 0 ? 'block' : 'none';
}

async function receptMentese() {
    const nev = document.getElementById('recept-nev').value;
    if (!nev || ideiglenesHozzavalok.length === 0) {
        alert('Adj meg nevet és legalább egy hozzávalót!');
        return;
    }

    const ujRecept = { nev, hozzavalok: [...ideiglenesHozzavalok] };
    sajatReceptek.push(ujRecept);

    await mentesFirebasebe();
    ideiglenesHozzavalok = [];
    document.getElementById('recept-nev').value = '';
    megjelenitIdeiglenesLista();
    frissitReceptLista();
}

async function torolReceptet(index) {
    if (
        confirm(
            `Biztosan törölni akarod a "${sajatReceptek[index].nev}" receptet?`
        )
    ) {
        sajatReceptek.splice(index, 1);
        await mentesFirebasebe();
        frissitReceptLista();
    }
}

// --- MENÜ ÉS BEVÁSÁRLÓLISTA ---
function hozzaadMenuhoz(index) {
    kivalasztottMenu.push(sajatReceptek[index]);
    frissitMenuDisplay();
}

function frissitMenuDisplay() {
    const lista = document.getElementById('kivalasztottReceptek');
    lista.innerHTML = '';
    kivalasztottMenu.forEach((r, i) => {
        lista.innerHTML += `<li>${r.nev} <button onclick="torolMenubol(${i})">❌</button></li>`;
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

function bevasarloListaGeneralas() {
    if (kivalasztottMenu.length === 0) {
        alert('Válassz ki legalább egy receptet a menühöz!');
        return;
    }
    const listaHelye = document.getElementById('bevasarloLista');
    listaHelye.innerHTML = '';
    document.getElementById('osszesitettListaCard').style.display = 'block';

    let szukseg = {};

    kivalasztottMenu.forEach((r) => {
        r.hozzavalok.forEach((h) => {
            let alapMenny = h.mennyiseg * valtoszamok[h.egyseg];
            if (!szukseg[h.nev])
                szukseg[h.nev] = { menny: 0, egyseg: h.egyseg };
            szukseg[h.nev].menny += alapMenny;
        });
    });

    for (let nev in szukseg) {
        let vanAlap = kamra[nev]
            ? kamra[nev].mennyiseg * valtoszamok[kamra[nev].egyseg]
            : 0;
        let kellAlap = szukseg[nev].menny;
        let li = document.createElement('li');

        if (vanAlap < kellAlap) {
            let hiany = (kellAlap - vanAlap) / valtoszamok[szukseg[nev].egyseg];
            li.innerHTML = `<strong>${nev}</strong> - <span style="color:#e74c3c;">Kell: ${hiany.toFixed(
                1
            )} ${szukseg[nev].egyseg}</span>`;
        } else {
            li.innerHTML = `<strong>${nev}</strong> - <span style="color:#2ecc71;">Van elég ✅</span>`;
        }
        listaHelye.appendChild(li);
    }
}

// --- TAB KEZELÉS ---
function openTab(evt, tabName) {
    let tabcontent = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabcontent.length; i++)
        tabcontent[i].style.display = 'none';
    let tablinks = document.getElementsByClassName('tab-link');
    for (let i = 0; i < tablinks.length; i++)
        tablinks[i].classList.remove('active');
    document.getElementById(tabName).style.display = 'block';
    evt.currentTarget.classList.add('active');
}

// --- LISTÁK FRISSÍTÉSE ---
function frissitMindenListat() {
    frissitKamraLista();
    frissitReceptLista();
}

function frissitKamraLista() {
    const lista = document.getElementById('kamraLista');
    lista.innerHTML = '';
    for (let k in kamra) {
        lista.innerHTML += `<li>${kamra[k].nev}: ${kamra[k].mennyiseg} ${kamra[k].egyseg} <button onclick="torolKamra('${k}')">Törlés</button></li>`;
    }
}

function frissitReceptLista() {
    const lista = document.getElementById('receptLista');
    lista.innerHTML = '';
    sajatReceptek.forEach((r, i) => {
        lista.innerHTML += `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                <h4>${r.nev}</h4>
                <div>
                    <button onclick="hozzaadMenuhoz(${i})" style="background:#3498db; margin-right:5px;">Választ</button>
                    <button onclick="torolReceptet(${i})" style="background:#e74c3c;">Törlés</button>
                </div>
            </div>`;
    });
}

// --- FIREBASE SZINKRON ---
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
