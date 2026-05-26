// ==UserScript==
// @name         GitHub Mobile Time Display
// @namespace    https://raw.githubusercontent.com/hooray804/octopus/refs/heads/main/githubmobile.user.js
// @version      1.0.0
// @description  모바일 웹사이트에서 지원하지 않는 기능인 정확한 시간 보기를 추가합니다.
// @author       hooray804
// @match        https://docs.google.com/document/*/mobilebasic*
// @homepage     https://github.com/hooray804/
// @downloadURL  https://raw.githubusercontent.com/hooray804/octopus/refs/heads/main/githubmobile.user.js
// @updateURL    https://raw.githubusercontent.com/hooray804/octopus/refs/heads/main/githubmobile.user.jsgdocsmobile.user.js
// @grant        none
// ==/UserScript==

!function(){"use strict";const t=new Intl.DateTimeFormat(navigator.language,{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}),e=e=>{const n=e.nextSibling;if(!(n&&n.classList&&n.classList.contains("g-dt")))try{const n=e.getAttribute("datetime");if(!n)return;const i=new Date(n);if(isNaN(i.getTime()))return;const o=document.createElement("span");o.className="g-dt",o.textContent=` (${t.format(i)})`,Object.assign(o.style,{fontSize:"0.9em",color:"currentColor",marginLeft:"0.4em",display:"inline-block",whiteSpace:"normal"}),e.insertAdjacentElement("afterend",o)}catch(t){}},n=()=>{const t=document.querySelectorAll("relative-time");for(let n=0;n<t.length;n++)e(t[n]);requestAnimationFrame(n)};document.body?n():document.addEventListener("DOMContentLoaded",n)}();