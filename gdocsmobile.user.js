// ==UserScript==
// @name         Highlight Google Docs for mobile
// @namespace    https://raw.githubusercontent.com/hooray804/octopus/refs/heads/main/gdocsmobile.user.js
// @version      1.1.0
// @description  모바일 웹사이트에서 지원하지 않는 기능인 텍스트 자동 검색, 강조 기능을 추가합니다.
// @author       hooray804
// @match        https://docs.google.com/document/d/*/mobilebasic*
// @homepage     https://github.com/hooray804/
// @downloadURL  https://raw.githubusercontent.com/hooray804/octopus/refs/heads/main/gdocsmobile.user.js
// @updateURL    https://raw.githubusercontent.com/hooray804/octopus/refs/heads/main/gdocsmobile.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const highlightStyle = 'background-color: #ffeb3b !important; color: #000 !important; font-weight: bold !important; padding: 2px !important; border-radius: 2px !important; box-shadow: 0 0 5px rgba(0,0,0,0.2) !important;';
    const focusStyle = 'background-color: #ff9800 !important; color: #fff !important; font-weight: bold !important; padding: 2px !important; border-radius: 2px !important; box-shadow: 0 0 8px rgba(0,0,0,0.5) !important;';

    let highlightElements = [];
    let currentHighlightIndex = -1;

    function getList() {
        try {
            const data = localStorage.getItem('gdocs_highlight_list');
            if (!data) return [];
            let parsed = JSON.parse(data);
            if (!Array.isArray(parsed)) return [];
            
            return parsed.map(item => {
                if (typeof item === 'string') return { text: item, isRegex: false };
                if (typeof item === 'object' && item !== null && item.text) return { text: String(item.text), isRegex: !!item.isRegex };
                return null;
            }).filter(item => item !== null && item.text.trim() !== '');
        } catch(e) {
            return [];
        }
    }

    function saveList(list) {
        localStorage.setItem('gdocs_highlight_list', JSON.stringify(list));
    }

    function applyHighlight() {
        document.querySelectorAll('mark.gdocs-hi').forEach(mark => {
            const parent = mark.parentNode;
            if(parent) {
                parent.replaceChild(document.createTextNode(mark.textContent), mark);
                parent.normalize();
            }
        });

        highlightElements = [];
        currentHighlightIndex = -1;

        const list = getList();
        if (list.length === 0) {
            updateNavDisplay();
            return;
        }

        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const nodesToReplace = [];

        while (node = walk.nextNode()) {
            if (node.parentNode.tagName === 'SCRIPT' || node.parentNode.tagName === 'STYLE' || node.parentNode.tagName === 'MARK') continue;
            
            let matchFound = false;
            for (let i = 0; i < list.length; i++) {
                const item = list[i];
                if (item.isRegex) {
                    try {
                        const regex = new RegExp(item.text, 'g');
                        if (regex.test(node.textContent)) { matchFound = true; break; }
                    } catch(e) {}
                } else {
                    if (node.textContent.includes(item.text)) { matchFound = true; break; }
                }
            }
            if (matchFound) {
                nodesToReplace.push(node);
            }
        }

        if (nodesToReplace.length > 0) {
            let regexParts = [];
            list.forEach(item => {
                if (item.text.trim() === '') return;
                if (item.isRegex) {
                    regexParts.push(`(?:${item.text})`);
                } else {
                    const escaped = item.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    regexParts.push(`(?:${escaped})`);
                }
            });
            
            let combinedRegex;
            try {
                combinedRegex = new RegExp(regexParts.join('|'), 'g');
            } catch(e) { return; }

            nodesToReplace.forEach(textNode => {
                let parent = textNode.parentNode;
                if (!parent) return;

                let content = textNode.textContent;
                let fragment = document.createDocumentFragment();
                let lastIndex = 0;
                let match;

                combinedRegex.lastIndex = 0;
                while ((match = combinedRegex.exec(content)) !== null) {
                    if (match[0].length === 0) {
                        combinedRegex.lastIndex++;
                        continue;
                    }
                    
                    if (match.index > lastIndex) {
                        fragment.appendChild(document.createTextNode(content.slice(lastIndex, match.index)));
                    }
                    
                    const mark = document.createElement('mark');
                    mark.className = 'gdocs-hi';
                    mark.textContent = match[0];
                    mark.style.cssText = highlightStyle;
                    fragment.appendChild(mark);
                    highlightElements.push(mark);
                    
                    lastIndex = combinedRegex.lastIndex;
                }
                
                if (lastIndex < content.length) {
                    fragment.appendChild(document.createTextNode(content.slice(lastIndex)));
                }

                parent.replaceChild(fragment, textNode);
            });
        }
        
        updateNavDisplay();
    }
    
    function updateNavDisplay() {
        const navText = document.getElementById('gdocs-nav-text');
        if (navText) {
            if (highlightElements.length === 0) {
                navText.textContent = '0 / 0';
            } else {
                navText.textContent = `${currentHighlightIndex + 1} / ${highlightElements.length}`;
            }
        }
    }

    function navigateHighlight(direction) {
        if (highlightElements.length === 0) return;
        
        if (currentHighlightIndex >= 0 && currentHighlightIndex < highlightElements.length) {
            highlightElements[currentHighlightIndex].style.cssText = highlightStyle;
        }

        currentHighlightIndex += direction;
        
        if (currentHighlightIndex < 0) {
            currentHighlightIndex = highlightElements.length - 1;
        } else if (currentHighlightIndex >= highlightElements.length) {
            currentHighlightIndex = 0;
        }

        const target = highlightElements[currentHighlightIndex];
        target.style.cssText = focusStyle;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        updateNavDisplay();
    }

    function createModal() {
        if (document.getElementById('gdocs-highlight-modal')) return;

        const hideUntil = localStorage.getItem('hideHighlightModalUntil');
        if (hideUntil && Date.now() < parseInt(hideUntil, 10)) return;

        const modal = document.createElement('div');
        modal.id = 'gdocs-highlight-modal';
        modal.style.cssText = 'position: fixed !important; bottom: 0 !important; left: 0 !important; width: 100% !important; background: #fff !important; color: #000 !important; padding: 8px !important; box-sizing: border-box !important; z-index: 999999 !important; border-top: 1px solid #000 !important; display: flex !important; flex-direction: column !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; max-height: 35vh !important; overflow-y: auto !important; margin: 0 !important;';

        const inputRow = document.createElement('div');
        inputRow.style.cssText = 'display: flex !important; gap: 6px !important; align-items: center !important; width: 100% !important; margin-bottom: 6px !important; box-sizing: border-box !important;';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '단어/정규식 입력';
        input.style.cssText = 'flex: 1 1 0% !important; padding: 4px 8px !important; box-sizing: border-box !important; border: 1px solid #000 !important; font-size: 13px !important; color: #000 !important; background: #fff !important; min-width: 0 !important; height: 28px !important; outline: none !important; margin: 0 !important;';

        const regexLabel = document.createElement('label');
        regexLabel.style.cssText = 'display: flex !important; align-items: center !important; gap: 4px !important; font-size: 12px !important; color: #000 !important; white-space: nowrap !important; cursor: pointer !important; margin: 0 !important; padding: 0 !important; height: 28px !important; font-weight: 600 !important;';
        const regexCheck = document.createElement('input');
        regexCheck.type = 'checkbox';
        regexCheck.style.cssText = 'margin: 0 !important; width: 14px !important; height: 14px !important; accent-color: #000 !important;';
        regexLabel.appendChild(regexCheck);
        regexLabel.appendChild(document.createTextNode('Regex'));

        const addBtn = document.createElement('button');
        addBtn.textContent = '추가';
        addBtn.style.cssText = 'padding: 0 12px !important; height: 28px !important; background: #000 !important; color: #fff !important; border: 1px solid #000 !important; cursor: pointer !important; font-size: 13px !important; white-space: nowrap !important; font-weight: bold !important; margin: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important;';
        
        inputRow.appendChild(input);
        inputRow.appendChild(regexLabel);
        inputRow.appendChild(addBtn);

        const listContainer = document.createElement('ul');
        listContainer.style.cssText = 'display: flex !important; flex-wrap: wrap !important; gap: 6px !important; margin: 0 0 6px 0 !important; padding: 6px !important; list-style: none !important; max-height: 100px !important; min-height: 30px !important; overflow-y: auto !important; border: 1px solid #000 !important; background: #fff !important; box-sizing: border-box !important; width: 100% !important;';

        function renderList() {
            while (listContainer.firstChild) {
                listContainer.removeChild(listContainer.firstChild);
            }
            
            const list = getList();
            
            if (list.length === 0) {
                const emptyMsg = document.createElement('li');
                emptyMsg.textContent = '등록된 단어가 없습니다.';
                emptyMsg.style.cssText = 'display: block !important; text-align: center !important; color: #000 !important; font-size: 12px !important; width: 100% !important; padding: 6px 0 !important; font-weight: normal !important; line-height: 1.5 !important; border: none !important; background: transparent !important; margin: 0 !important;';
                listContainer.appendChild(emptyMsg);
                return;
            }

            list.forEach((item, index) => {
                const row = document.createElement('li');
                row.style.cssText = 'display: flex !important; justify-content: space-between !important; align-items: center !important; background: #fff !important; padding: 4px 6px !important; margin: 0 !important; font-size: 12px !important; border: 1px solid #000 !important; box-sizing: border-box !important; width: calc((100% - 12px) / 3) !important; flex-shrink: 0 !important; height: 24px !important;';
                
                const textSpan = document.createElement('span');
                textSpan.textContent = (item.isRegex ? '[R] ' : '') + item.text;
                textSpan.style.cssText = 'display: block !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; flex: 1 1 0% !important; min-width: 0 !important; margin-right: 4px !important; color: #000 !important; font-weight: 600 !important; text-align: left !important; line-height: 1.2 !important;';
                
                const delBtn = document.createElement('button');
                delBtn.textContent = '✕';
                delBtn.style.cssText = 'background: #000 !important; color: #fff !important; border: none !important; cursor: pointer !important; padding: 0 !important; width: 16px !important; height: 16px !important; font-size: 10px !important; font-weight: bold !important; flex-shrink: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; margin: 0 !important;';
                delBtn.onclick = () => {
                    list.splice(index, 1);
                    saveList(list);
                    renderList();
                    applyHighlight();
                };

                row.appendChild(textSpan);
                row.appendChild(delBtn);
                listContainer.appendChild(row);
            });
        }

        addBtn.onclick = () => {
            const val = input.value.trim();
            if (val !== '') {
                const list = getList();
                list.push({ text: val, isRegex: regexCheck.checked });
                saveList(list);
                input.value = '';
                renderList();
                applyHighlight();
            }
        };

        const bottomRow = document.createElement('div');
        bottomRow.style.cssText = 'display: flex !important; gap: 6px !important; align-items: center !important; justify-content: space-between !important; width: 100% !important; box-sizing: border-box !important; flex-wrap: nowrap !important;';

        const navGroup = document.createElement('div');
        navGroup.style.cssText = 'display: flex !important; gap: 6px !important; align-items: center !important; background: #fff !important; border: 1px solid #000 !important; padding: 2px 6px !important; flex: 1 !important; justify-content: center !important;';

        const prevBtn = document.createElement('button');
        prevBtn.textContent = '◀';
        prevBtn.style.cssText = 'padding: 0 12px !important; height: 24px !important; background: #000 !important; color: #fff !important; border: none !important; cursor: pointer !important; font-size: 12px !important; font-weight: bold !important; margin: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important;';
        prevBtn.onclick = () => navigateHighlight(-1);

        const navText = document.createElement('span');
        navText.id = 'gdocs-nav-text';
        navText.textContent = '0 / 0';
        navText.style.cssText = 'font-size: 13px !important; min-width: 50px !important; text-align: center !important; font-weight: bold !important; color: #000 !important; flex-shrink: 0 !important; display: block !important;';

        const nextBtn = document.createElement('button');
        nextBtn.textContent = '▶';
        nextBtn.style.cssText = 'padding: 0 12px !important; height: 24px !important; background: #000 !important; color: #fff !important; border: none !important; cursor: pointer !important; font-size: 12px !important; font-weight: bold !important; margin: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important;';
        nextBtn.onclick = () => navigateHighlight(1);

        navGroup.appendChild(prevBtn);
        navGroup.appendChild(navText);
        navGroup.appendChild(nextBtn);

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display: flex !important; gap: 6px !important; flex-shrink: 0 !important;';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '닫기';
        closeBtn.style.cssText = 'padding: 0 12px !important; height: 24px !important; background: #000 !important; color: #fff !important; border: none !important; cursor: pointer !important; font-size: 12px !important; font-weight: bold !important; margin: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important;';
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };

        const hideBtn = document.createElement('button');
        hideBtn.textContent = '7일 숨김';
        hideBtn.style.cssText = 'padding: 0 12px !important; height: 24px !important; background: #000 !important; color: #fff !important; border: none !important; cursor: pointer !important; font-size: 12px !important; font-weight: bold !important; margin: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important;';
        hideBtn.onclick = () => {
            localStorage.setItem('hideHighlightModalUntil', Date.now() + 7 * 24 * 60 * 60 * 1000);
            modal.style.display = 'none';
        };

        btnGroup.appendChild(closeBtn);
        btnGroup.appendChild(hideBtn);

        bottomRow.appendChild(navGroup);
        bottomRow.appendChild(btnGroup);

        modal.appendChild(inputRow);
        modal.appendChild(listContainer);
        modal.appendChild(bottomRow);
        document.body.appendChild(modal);

        renderList();
    }

    window.addEventListener('load', () => {
        applyHighlight();
        createModal();
    });
    setTimeout(() => {
        applyHighlight();
        createModal();
    }, 200);
})();
