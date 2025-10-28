import { hydrateCatalog } from "./app.catalog.js";
window.addEventListener("DOMContentLoaded", hydrateCatalog);

const API = location.origin;

const SLO = {
  TV1:{label:"Tijdvak 1: Jagers en boeren (tot 3000 v.Chr.)",kas:[
    {id:"1",name:"De levenswijze van jagers-verzamelaars"},
    {id:"2",name:"Het ontstaan van landbouw en landbouwsamenlevingen"},
    {id:"3",name:"De eerste stedelijke gemeenschappen"}]},
  TV2:{label:"Tijdvak 2: Grieken en Romeinen (3000 v.Chr.–500)",kas:[
    {id:"4",name:"Wetenschappelijk denken en burgerschap in de Griekse polis"},
    {id:"5",name:"Klassieke vormentaal van de Grieks-Romeinse cultuur"},
    {id:"6",name:"Groei van het Romeinse imperium"},
    {id:"7",name:"Confrontatie Grieks-Romeinse en Germaanse cultuur"},
    {id:"8",name:"Ontwikkeling van jodendom en christendom"}]},
  TV3:{label:"Tijdvak 3: Monniken en ridders (500–1000)",kas:[
    {id:"9",name:"Verspreiding van het christendom in Europa"},
    {id:"10",name:"Ontstaan en verspreiding van de islam"},
    {id:"11",name:"Hofstelsel en horigheid"},
    {id:"12",name:"Feodale verhoudingen"}]},
  TV4:{label:"Tijdvak 4: Steden en staten (1000–1500)",kas:[
    {id:"13",name:"Opkomst handel/ambacht en herleven stedelijke cultuur"},
    {id:"14",name:"Opkomst burgerij en zelfstandigheid van steden"},
    {id:"15",name:"Primaat wereldlijke of geestelijke macht?"},
    {id:"16",name:"Expansie christelijke wereld (kruistochten)"},
    {id:"17",name:"Begin staatsvorming en centralisatie"}]},
  TV5:{label:"Tijdvak 5: Ontdekkers en hervormers (1500–1600)",kas:[
    {id:"18",name:"Europese overzeese expansie"},
    {id:"19",name:"Renaissance: mens- en wereldbeeld"},
    {id:"20",name:"Heroriëntatie op de klassieke oudheid"},
    {id:"21",name:"Reformatie en kerksplitsing"},
    {id:"22",name:"Ontstaan van de Nederlandse staat"}]},
  TV6:{label:"Tijdvak 6: Regenten en vorsten (1600–1700)",kas:[
    {id:"23",name:"Absolutisme"},
    {id:"24",name:"Bijzondere plaats/bloei van de Republiek"},
    {id:"25",name:"Wereldeconomie en handelskapitalisme"},
    {id:"26",name:"Wetenschappelijke revolutie"}]},
  TV7:{label:"Tijdvak 7: Pruiken en revoluties (1700–1800)",kas:[
    {id:"27",name:"Verlichting"},
    {id:"28",name:"Ancien Régime en verlicht absolutisme"},
    {id:"29",name:"Democratische revoluties"},
    {id:"30",name:"Europees imperialisme, slavernij, abolitionisme"}]},
  TV8:{label:"Tijdvak 8: Burgers en stoommachines (1800–1900)",kas:[
    {id:"31",name:"Industriële revolutie"},
    {id:"32",name:"Sociale kwestie"},
    {id:"33",name:"Voortschrijdende democratisering"},
    {id:"34",name:"Emancipatiebewegingen"},
    {id:"35",name:"Politiek-maatschappelijke stromingen"},
    {id:"36",name:"Modern imperialisme"}]},
  TV9:{label:"Tijdvak 9: De wereldoorlogen (1900–1950)",kas:[
    {id:"37",name:"Propaganda/communicatiemiddelen en massaorganisatie"},
    {id:"38",name:"Totalitaire ideologieën"},
    {id:"39",name:"Crisis wereldkapitalisme"},
    {id:"40",name:"Twee wereldoorlogen"},
    {id:"41",name:"Racisme en genocide"}]},
  TV10:{label:"Tijdvak 10: Televisie en computer (1950–heden)",kas:[
    {id:"42",name:"Koude Oorlog"},
    {id:"43",name:"Dekolonisatie"},
    {id:"44",name:"Eenwording van Europa"},
    {id:"45",name:"Welvaart en sociaal-culturele veranderingen"},
    {id:"46",name:"Pluriforme en multiculturele samenlevingen"}]}
};

const elTv = document.getElementById("selTv");
const elKa = document.getElementById("selKa");
const elBouw = document.getElementById("selBouw");
const elLeerweg = document.getElementById("selLeerweg");
const elOps = document.getElementById("txtOpmerkingen");
const elCards = document.getElementById("cards");
const elStatus = document.getElementById("status");
const elBtnSuggest = document.getElementById("btnSuggest");
const elBtnGen = document.getElementById("btnGen");
const elBtnDl = document.getElementById("btnDownload");
const elOut = document.getElementById("lessonOut");

function fillTv(){
  elTv.innerHTML = Object.keys(SLO).map(tv => `<option value="${tv}">${SLO[tv].label}</option>`).join("");
  elTv.value = "TV5";
}
function fillKa(){
  const tv = elTv.value;
  elKa.innerHTML = SLO[tv].kas.map(k => `<option value="${k.id}">KA ${k.id} — ${k.name}</option>`).join("");
  elKa.value = SLO[tv].kas[0].id;
}
fillTv(); fillKa();
elTv.addEventListener("change", fillKa);

document.getElementById("btnSuggest").addEventListener("click", async ()=>{
  elStatus.textContent = "Voorstellen ophalen…";
  elBtnGen.disabled = true; elBtnDl.disabled = true; elOut.value = ""; elCards.innerHTML = "";
  try{
    const resp = await fetch(`${API}/api/suggest`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ tijdvak: elTv.value, ka: elKa.value })
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    // Toon kaarten
    elCards.innerHTML = (data.suggestions||[]).map(c => `
      <div class="card" data-id="${c.id}">
        <div class="muted">TV ${c.tv} • KA ${c.ka}</div>
        <h3>${c.title}</h3>
        <div><strong>Hoofdvraag</strong><br>${c.head_question}</div>
        <div class="muted" style="margin-top:6px">${c.context||""}</div>
        <ul>${(c.learning_summary||[]).map(x=>`<li>${x}</li>`).join("")}</ul>
        <button class="btn btnPick" style="margin-top:8px;width:100%">Kies deze</button>
      </div>`).join("");
    elStatus.textContent = "Kies 1 kaart en klik ‘Genereer les’.";
    elCards.querySelectorAll(".btnPick").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        elCards.querySelectorAll(".card").forEach(x=> x.style.borderColor="#e5e7eb");
        const card = btn.closest(".card");
        card.style.borderColor="#111";
        elBtnGen.dataset.sel = card.dataset.id;
        elBtnGen.disabled = false;
      });
    });
  }catch(e){
    elStatus.textContent = "Fout bij voorstellen: " + e.message;
  }
});

document.getElementById("btnGen").addEventListener("click", async ()=>{
  const chosenId = elBtnGen.dataset.sel;
  const card = [...elCards.querySelectorAll(".card")].find(c=> c.dataset.id===chosenId);
  if(!card) return;

  const s = {
    id: chosenId,
    tv: elTv.value,
    ka: elKa.value,
    title: card.querySelector("h3").textContent,
    head_question: card.querySelector("div strong").parentElement.nextSibling ? card.querySelector("div strong").parentElement.parentElement.children[1].textContent : card.querySelectorAll("div")[1].textContent,
    context: card.querySelectorAll(".muted")[1].textContent.trim()
  };

  elBtnGen.disabled = true; elBtnGen.textContent = "Bezig…"; elStatus.textContent = "Les genereren…";
  try{
    const resp = await fetch(`${API}/api/generate`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        selectedSuggestion: s,
        bouw: elBouw.value,
        leerweg: elLeerweg.value,
        opmerkingen: elOps.value
      })
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    elOut.value = data.markdown || "";
    elBtnDl.disabled = !elOut.value.trim();
  }catch(e){
    elStatus.textContent = "Fout bij lesgeneratie: " + e.message;
  }finally{
    elBtnGen.disabled = false; elBtnGen.textContent = "Genereer les";
  }
});

document.getElementById("btnDownload").addEventListener("click", ()=>{
  const txt = elOut.value || "";
  if(!txt.trim()) return;
  const blob = new Blob([txt], {type:"text/plain;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "masterprompt-les.txt";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(a.href), 1200);
});
