let kamra = JSON.parse(localStorage.getItem("preciz_kamra")) || {};
let sajatReceptek = JSON.parse(localStorage.getItem("preciz_receptek")) || [];
let toroltAlapNevek = JSON.parse(localStorage.getItem("torolt_alapok")) || [];
let osszesRecept = [];
let kivalasztottMenu = [];
let ideiglenesHozzavalok = [];

// KONVERZIÓS TÁBLÁZAT (Minden az alapegységre: g, ml vagy db váltódik)
const valtoszamok = {
        // Tömeg (alap: g)
        g: 1,
        kg: 1000,
        // Űrmérték (alap: ml)
        ml: 1,
        dl: 100,
        l: 1000,
        // Egyéb (alap: db)
        db: 1,
};

// Melyik egység melyik családba tartozik
const egysegTipusok = {
        g: "tomeg",
        kg: "tomeg",
        ml: "folyadek",
        dl: "folyadek",
        l: "folyadek",
        db: "darab",
};

window.onload = async () => {
        await receptekBetolteseEsOsszefuzese();
        frissitReceptLista();
        frissitKamraLista();
};

async function receptekBetolteseEsOsszefuzese() {
        let alapReceptek = [];
        try {
                const response = await fetch("data/alap_receptek.json");
                if (response.ok) alapReceptek = await response.json();
        } catch (e) {
                console.warn("JSON hiba");
        }
        const szurtAlap = alapReceptek.filter(
                (r) => !toroltAlapNevek.includes(r.nev),
        );
        osszesRecept = [...szurtAlap, ...sajatReceptek];
}

// --- KAMRA ---
function hozzaadKamra() {
        const nev = document.getElementById("k-nev").value.trim().toLowerCase();
        const menny = parseFloat(document.getElementById("k-menny").value);
        const egyseg = document.getElementById("k-egyseg").value;

        if (!nev || isNaN(menny)) return;

        kamra[nev] = { mennyiseg: menny, egyseg: egyseg };
        localStorage.setItem("preciz_kamra", JSON.stringify(kamra));
        frissitKamraLista();
        document.getElementById("k-nev").value = "";
        document.getElementById("k-menny").value = "";
}

function frissitKamraLista() {
        const list = document.getElementById("kamraLista");
        list.innerHTML = "";
        for (let nev in kamra) {
                list.innerHTML += `<li><span class="item-name">${nev}</span><span>${kamra[nev].mennyiseg} ${kamra[nev].egyseg}</span>
        <button class="delete-btn" onclick="torolKamra('${nev}')">X</button></li>`;
        }
}

function torolKamra(nev) {
        delete kamra[nev];
        localStorage.setItem("preciz_kamra", JSON.stringify(kamra));
        frissitKamraLista();
}

// --- RECEPT SZERKESZTÉS ---
function hozzaadIdeiglenesHozzavalo() {
        const nev = document
                .getElementById("r-h-nev")
                .value.trim()
                .toLowerCase();
        const menny = parseFloat(document.getElementById("r-h-menny").value);
        const egyseg = document.getElementById("r-h-egyseg").value;
        if (!nev || isNaN(menny)) return;
        ideiglenesHozzavalok.push({ nev, mennyiseg: menny, egyseg });
        frissitIdeiglenesLista();
        document.getElementById("r-h-nev").value = "";
        document.getElementById("r-h-menny").value = "";
}

function frissitIdeiglenesLista() {
        const l = document.getElementById("ideiglenesLista");
        l.innerHTML = "";
        ideiglenesHozzavalok.forEach((h, i) => {
                l.innerHTML += `<li>${h.nev}: ${h.mennyiseg} ${h.egyseg} <button class="delete-btn" onclick="ideiglenesHozzavalok.splice(${i},1);frissitIdeiglenesLista();">X</button></li>`;
        });
}

function mentesRecept() {
        const nev = document.getElementById("receptNev").value.trim();
        if (!nev || ideiglenesHozzavalok.length === 0) return;
        sajatReceptek.push({ nev, hozzavalok: [...ideiglenesHozzavalok] });
        localStorage.setItem("preciz_receptek", JSON.stringify(sajatReceptek));
        document.getElementById("receptNev").value = "";
        ideiglenesHozzavalok = [];
        frissitIdeiglenesLista();
        receptekBetolteseEsOsszefuzese().then(() => frissitReceptLista());
}

function frissitReceptLista() {
        const container = document.getElementById("receptLista");
        container.innerHTML = "";
        osszesRecept.forEach((r, i) => {
                container.innerHTML += `<li><span class="item-name">${r.nev}</span><div><button onclick="menuhozAd(${i})">➕</button><button class="delete-btn" onclick="torolRecept(${i})">X</button></div></li>`;
        });
}

function torolRecept(i) {
        if (!confirm("Törlöd?")) return;
        const r = osszesRecept[i];
        const sIdx = sajatReceptek.findIndex((sr) => sr.nev === r.nev);
        if (sIdx !== -1) {
                sajatReceptek.splice(sIdx, 1);
                localStorage.setItem(
                        "preciz_receptek",
                        JSON.stringify(sajatReceptek),
                );
        } else {
                toroltAlapNevek.push(r.nev);
                localStorage.setItem(
                        "torolt_alapok",
                        JSON.stringify(toroltAlapNevek),
                );
        }
        receptekBetolteseEsOsszefuzese().then(() => frissitReceptLista());
}

// --- MENÜ ÉS INTELLIGENS ÖSSZESÍTÉS ---
function menuhozAd(i) {
        kivalasztottMenu.push(osszesRecept[i]);
        frissitMenuDisplay();
}

function frissitMenuDisplay() {
        const l = document.getElementById("kivalasztottReceptek");
        l.innerHTML = "";
        kivalasztottMenu.forEach((r, i) => {
                l.innerHTML += `<li>${r.nev} <button class="delete-btn" onclick="kivalasztottMenu.splice(${i},1);frissitMenuDisplay();">X</button></li>`;
        });
}

function bevasarloListaGeneralasa() {
        if (kivalasztottMenu.length === 0) return;

        let szuksegesAlapban = {}; // Mindent g-ban vagy ml-ben számolunk

        kivalasztottMenu.forEach((recept) => {
                recept.hozzavalok.forEach((h) => {
                        const nev = h.nev;
                        const alapMennyiseg =
                                h.mennyiseg * valtoszamok[h.egyseg];
                        const tipus = egysegTipusok[h.egyseg];

                        if (!szuksegesAlapban[nev]) {
                                szuksegesAlapban[nev] = {
                                        mennyiseg: 0,
                                        tipus: tipus,
                                        eredetiEgyseg: h.egyseg,
                                };
                        }
                        szuksegesAlapban[nev].mennyiseg += alapMennyiseg;
                });
        });

        const listaHelye = document.getElementById("bevasarloLista");
        listaHelye.innerHTML = "";
        document.getElementById("osszesitettListaCard").style.display = "block";

        for (let nev in szuksegesAlapban) {
                const kellAlap = szuksegesAlapban[nev].mennyiseg;
                const tipus = szuksegesAlapban[nev].tipus;
                const eredetiEgyseg = szuksegesAlapban[nev].eredetiEgyseg;

                // Kamra készlet átszámítása alapra
                let vanAlap = 0;
                if (kamra[nev]) {
                        vanAlap =
                                kamra[nev].mennyiseg *
                                valtoszamok[kamra[nev].egyseg];
                }

                const li = document.createElement("li");
                if (vanAlap < kellAlap) {
                        const hianyAlap = kellAlap - vanAlap;
                        // Visszaszámoljuk az eredeti mértékegységre a kijelzéshez
                        const hianyKijelzett = (
                                hianyAlap / valtoszamok[eredetiEgyseg]
                        ).toFixed(1);
                        li.innerHTML = `<span>${nev}</span> <span class="missing">Hiány: ${hianyKijelzett} ${eredetiEgyseg}</span>`;
                } else {
                        li.innerHTML = `<span>${nev}</span> <span class="ok">Rendben ✅</span>`;
                }
                listaHelye.appendChild(li);
        }
}

function openTab(evt, tabName) {
        const contents = document.getElementsByClassName("tab-content");
        for (let c of contents) c.classList.remove("active");
        const links = document.getElementsByClassName("tab-link");
        for (let l of links) l.classList.remove("active");
        document.getElementById(tabName).classList.add("active");
        if (evt) evt.currentTarget.classList.add("active");
}
