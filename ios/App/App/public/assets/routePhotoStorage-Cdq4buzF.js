function n(t){const o="/route-photos/",r=t.indexOf(o);if(r===-1)return null;const e=t.slice(r+o.length).split("?")[0];try{return decodeURIComponent(e)}catch{return e}}export{n as r};
