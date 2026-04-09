import{C as y,_ as g}from"./capacitor-5BlV1paa.js";function d(e){return e.replace(/[^a-z0-9._-]/gi,"_").replace(/_+/g,"_").replace(/^[_.]+|[_.]+$/g,"").toLowerCase().slice(0,80).trim()||"itineraire"}const b=(e,a,n)=>{const r=i=>i.toFixed(6),t=a.map(i=>{const s=i.elevation!==void 0?`
        <ele>${i.elevation.toFixed(1)}</ele>`:"";return`      <trkpt lat="${r(i.lat)}" lon="${r(i.lng)}">${s}
      </trkpt>`}).join(`
`);return`<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SportConnect" 
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd"
     xmlns="http://www.topografix.com/GPX/1/1" 
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata>
    <name>${c(e)}</name>
    <desc>${c(n||"Itinéraire exporté depuis SportConnect")}</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${c(e)}</name>
    <desc>${c(n||"")}</desc>
    <trkseg>
${t}
    </trkseg>
  </trk>
</gpx>`},c=e=>e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"),m=(e,a)=>{const n=new Blob([a],{type:"application/gpx+xml"}),r=URL.createObjectURL(n),t=document.createElement("a");t.href=r,t.download=`${d(e)}.gpx`,document.body.appendChild(t),t.click(),document.body.removeChild(t),URL.revokeObjectURL(r)};function _(){return typeof navigator>"u"?!1:/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent||"")}function f(e){return!!(e instanceof DOMException&&e.name==="AbortError"||e&&typeof e=="object"&&"name"in e&&e.name==="AbortError")}async function P(e,a,n){const{Filesystem:r,Directory:t,Encoding:o}=await g(async()=>{const{Filesystem:l,Directory:p,Encoding:h}=await import("./capacitor-5BlV1paa.js").then(x=>x.l);return{Filesystem:l,Directory:p,Encoding:h}},[],import.meta.url),{Share:i}=await g(async()=>{const{Share:l}=await import("./capacitor-5BlV1paa.js").then(p=>p.f);return{Share:l}},[],import.meta.url),s=d(e),u=`runconnect_gpx_${Date.now()}_${s}.gpx`;await r.writeFile({path:u,data:a,directory:t.Cache,encoding:o.UTF8});const{uri:w}=await r.getUri({path:u,directory:t.Cache});await i.share({title:n||"Itinéraire GPX",text:"Trace GPX RunConnect — enregistrer dans Fichiers ou partager.",files:[w]})}async function v(e,a,n){if(typeof navigator>"u"||typeof File>"u"||!navigator.share)return!1;const r=`${d(e)}.gpx`,t=new File([a],r,{type:"application/gpx+xml"}),o={title:n||"Itinéraire GPX",text:"Trace GPX",files:[t]};if(navigator.canShare&&!navigator.canShare({files:[t]}))return!1;try{return await navigator.share(o),!0}catch(i){return!!f(i)}}async function G(e,a,n){var t;const r=((t=n==null?void 0:n.title)==null?void 0:t.trim())||"Itinéraire GPX";if(y.isNativePlatform()){try{await P(e,a,r)}catch(o){if(f(o))return;console.warn("[gpxExport] Partage natif échoué, téléchargement de secours",o),m(e,a)}return}_()&&await v(e,a,r)||m(e,a)}export{b as e,G as s};
