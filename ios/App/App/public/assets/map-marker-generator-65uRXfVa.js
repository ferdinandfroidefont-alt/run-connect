const n=async t=>{try{const r=await(await fetch(t)).blob();return new Promise((a,i)=>{const o=new FileReader;o.onloadend=()=>a(o.result),o.onerror=i,o.readAsDataURL(r)})}catch(e){return console.error("Failed to convert image to base64:",e),"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI0UwRTBFMCIvPjxwYXRoIGQ9Ik0xMiAxMkM5LjI0IDEyIDcgOS43NiA3IDdDNyA0LjI0IDkuMjQgMiAxMiAyQzE0Ljc2IDIgMTcgNC4yNCAxNyA3QzE3IDkuNzYgMTQuNzYgMTIgMTIgMTJaTTEyIDE0QzE2LjQyIDE0IDIwIDE1Ljc5IDIwIDE4VjIwSDRWMThDNCAxNS43OSA3LjU4IDE0IDEyIDE0WiIgZmlsbD0iIzk5OTk5OSIvPjwvc3ZnPg=="}},I=(t,e=48)=>{const r=e/2,a=3;return`
    <svg width="${e}" height="${e}" viewBox="0 0 ${e} ${e}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <clipPath id="profileClip-${e}">
          <circle cx="${r}" cy="${r}" r="${r-a}"/>
        </clipPath>
      </defs>
      
      <!-- White border circle -->
      <circle cx="${r}" cy="${r}" r="${r-1}" fill="white"/>
      
      <!-- Profile photo -->
      <image xlink:href="${t}" 
             x="${a}" 
             y="${a}" 
             width="${e-a*2}" 
             height="${e-a*2}" 
             clip-path="url(#profileClip-${e})"
             preserveAspectRatio="xMidYMid slice"/>
    </svg>
  `.trim().replace(/\s+/g," ")},c=(t,e=48)=>I(t,e),s=t=>`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(t)))}`;export{c as a,I as g,n as i,s};
