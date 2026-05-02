// Claude Exporter - Content Script
// Based on claude-chat-exporter (MIT License)
// Modified and extended by AxonodeAI

(function () {
  // Sayfa claude.ai/chat/* değilse çalışma
  if (!window.location.pathname.startsWith('/chat')) return;

  // Buton zaten eklendiyse tekrar ekleme
  if (document.getElementById('claude-exporter-btn')) return;

  // ── Selectors ──────────────────────────────────────────────
  const SELECTORS = {
    copyButton: 'button[data-testid="action-bar-copy"]',
    conversationTitle:
      '[data-testid="chat-title-button"] .truncate, button[data-testid="chat-title-button"] div.truncate',
    messageActionsGroup: '[role="group"][aria-label="Message actions"]',
    feedbackButton: 'button[aria-label="Give positive feedback"]',
  };

  // ── Yardımcı fonksiyonlar ───────────────────────────────────
  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function formatTimestamp(isoString) {
    if (!isoString) return null;
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  function sanitizeFilename(name) {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase()
      .substring(0, 100);
  }

  function downloadMarkdown(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  // ── Claude API'den conversation verisi çek ──────────────────
  async function fetchConversationData() {
    try {
      const conversationId = window.location.pathname.split('/').pop();
      const orgId = document.cookie.match(/lastActiveOrg=([^;]+)/)?.[1];
      if (!conversationId || !orgId) return null;

      const url = `/api/organizations/${orgId}/chat_conversations/${conversationId}?tree=true&rendering_mode=messages&render_all_tools=true`;
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  function getTimestampMap(data) {
    const map = new Map();
    if (!data?.chat_messages) return map;
    for (const msg of data.chat_messages) {
      if (msg.sender === 'human') {
        const text = msg.content?.map((c) => c.text ?? '').join('').trim();
        if (text) map.set(text, formatTimestamp(msg.created_at));
      }
    }
    return map;
  }

  function getTitle(data) {
    const raw = data?.name?.trim();
    if (raw && raw !== 'New conversation') return sanitizeFilename(raw);
    const el = document.querySelector(SELECTORS.conversationTitle);
    const dom = el?.textContent?.trim();
    if (dom && dom !== 'Claude' && !dom.includes('New conversation'))
      return sanitizeFilename(dom);
    return 'claude_conversation';
  }

  // ── Kopyalama ───────────────────────────────────────────────
  function getCopyButtons(claudeOnly) {
    const groups = document.querySelectorAll(SELECTORS.messageActionsGroup);
    const buttons = [];
    groups.forEach((g) => {
      const hasFeedback = !!g.querySelector(SELECTORS.feedbackButton);
      if (hasFeedback === claudeOnly) {
        const btn = g.querySelector(SELECTORS.copyButton);
        if (btn) buttons.push(btn);
      }
    });
    return buttons;
  }

  async function triggerButtons(buttons) {
    for (let i = 0; i < buttons.length; i++) {
      if (buttons[i].offsetParent !== null) {
        buttons[i].scrollIntoView({ behavior: 'instant', block: 'nearest' });
        buttons[i].click();
      }
      if (i < buttons.length - 1) await delay(100);
    }
  }

  async function waitForCapture(arr, expected) {
    const max = 2000, step = 100;
    let elapsed = 0;
    while (elapsed < max) {
      if (arr.length >= expected) return;
      await delay(step);
      elapsed += step;
    }
  }

  // ── Markdown oluştur ────────────────────────────────────────
  function buildMarkdown(human, claude, timestamps) {
    let md = '# Conversation with Claude\n\n';
    const len = Math.max(human.length, claude.length);
    for (let i = 0; i < len; i++) {
      if (i < human.length) {
        const ts = timestamps?.get(human[i].content?.trim());
        md += `## Human${ts ? ` (${ts})` : ''}:\n\n${human[i].content}\n\n---\n\n`;
      }
      if (i < claude.length) {
        md += `## Claude:\n\n${claude[i].content}\n\n---\n\n`;
      }
    }
    return md;
  }

  // ── Status göstergesi ───────────────────────────────────────
  function createStatus() {
    const div = document.createElement('div');
    div.style.cssText = `
      position:fixed;top:12px;right:12px;z-index:10000;
      background:#1a1a2e;color:#e0e0e0;padding:10px 16px;
      border-radius:8px;font-family:monospace;font-size:12px;
      box-shadow:0 4px 12px rgba(0,0,0,0.4);min-width:200px;
      border:1px solid #333;
    `;
    document.body.appendChild(div);
    return div;
  }

  // ── Ana export fonksiyonu ───────────────────────────────────
  async function runExport(btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Exporting...';

    const status = createStatus();
    const humanMsgs = [];
    const claudeMsgs = [];
    const originalWrite = navigator.clipboard.writeText;
    let target = humanMsgs;
    let active = true;

    navigator.clipboard.writeText = function (text) {
      if (active && text) target.push({ content: text });
    };

    try {
      status.textContent = '📡 Fetching conversation data...';
      const data = await fetchConversationData();
      const timestamps = getTimestampMap(data);

      const humanBtns = getCopyButtons(false);
      const claudeBtns = getCopyButtons(true);

      if (!humanBtns.length && !claudeBtns.length)
        throw new Error('No messages found.');

      status.textContent = '📋 Copying human messages...';
      target = humanMsgs;
      await triggerButtons(humanBtns);
      await waitForCapture(humanMsgs, humanBtns.length);

      status.textContent = '🤖 Copying Claude responses...';
      target = claudeMsgs;
      await triggerButtons(claudeBtns);
      await waitForCapture(claudeMsgs, claudeBtns.length);

      const md = buildMarkdown(humanMsgs, claudeMsgs, timestamps);
      const filename = `${getTitle(data)}.md`;
      downloadMarkdown(md, filename);

      status.textContent = `✅ Saved: ${filename}`;
      status.style.background = '#1b4332';
      btn.textContent = '✅ Exported!';

    } catch (err) {
      status.textContent = `❌ Error: ${err.message}`;
      status.style.background = '#4a1515';
      btn.textContent = '⬇️ Export MD';
      btn.disabled = false;
    } finally {
      active = false;
      navigator.clipboard.writeText = originalWrite;
      setTimeout(() => {
        if (document.body.contains(status)) document.body.removeChild(status);
        btn.textContent = '⬇️ Export MD';
        btn.disabled = false;
      }, 3000);
    }
  }

  // ── Butonu sayfaya ekle ─────────────────────────────────────
  function injectButton() {
    if (document.getElementById('claude-exporter-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'claude-exporter-btn';
    btn.textContent = '⬇️ Export MD';
    btn.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:9999;
      background:#1a1a2e;color:#e0e0e0;border:1px solid #444;
      padding:8px 16px;border-radius:8px;font-size:13px;
      cursor:pointer;font-family:monospace;
      box-shadow:0 4px 12px rgba(0,0,0,0.3);
      transition:background 0.2s;
    `;
    btn.onmouseenter = () => (btn.style.background = '#2d2d4e');
    btn.onmouseleave = () => (btn.style.background = '#1a1a2e');
    btn.onclick = () => runExport(btn);
    document.body.appendChild(btn);
  }

  // Sayfa yüklenince ve route değişince butonu ekle
  injectButton();
  const observer = new MutationObserver(() => {
    if (window.location.pathname.startsWith('/chat')) injectButton();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
