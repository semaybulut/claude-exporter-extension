// Claude Exporter - Content Script
// Based on claude-chat-exporter (MIT License)
// Modified and extended by AxonodeAI

(function () {
  if (!window.location.pathname.startsWith('/chat')) return;
  if (document.getElementById('claude-exporter-btn')) return;

  // ── Yardımcı fonksiyonlar ───────────────────────────────────
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
    const conversationId = window.location.pathname.split('/').pop();
    const orgId = document.cookie.match(/lastActiveOrg=([^;]+)/)?.[1];
    if (!conversationId || !orgId) throw new Error('Conversation ID bulunamadı.');

    const url = `/api/organizations/${orgId}/chat_conversations/${conversationId}?tree=true&rendering_mode=messages&render_all_tools=true`;
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`API hatası: ${res.status}`);
    return await res.json();
  }

  // ── Conversation → Markdown ─────────────────────────────────
  function buildMarkdown(data) {
    const title = data.name?.trim() || 'Claude Conversation';
    const messages = data.chat_messages || [];

    let md = `# ${title}\n\n`;
    md += `> **Export tarihi:** ${new Date().toLocaleString('tr-TR')}\n`;
    md += `> **Mesaj sayısı:** ${messages.length}\n\n---\n\n`;

    for (const msg of messages) {
      const sender = msg.sender === 'human' ? '🧑 Sen' : '🤖 Claude';
      const ts = formatTimestamp(msg.created_at);
      const header = ts ? `### ${sender}  \`${ts}\`` : `### ${sender}`;

      // Content bloklarından text çıkar
      const textParts = (msg.content || [])
        .filter(c => c.type === 'text' && c.text?.trim())
        .map(c => c.text.trim());

      const text = textParts.join('\n\n');
      if (!text) continue;

      md += `${header}\n\n${text}\n\n---\n\n`;
    }

    return md;
  }

  function getFilename(data) {
    const name = data.name?.trim();
    if (name && name !== 'New conversation') return sanitizeFilename(name) + '.md';
    return 'claude_conversation.md';
  }

  // ── Status göstergesi ───────────────────────────────────────
  function createStatus() {
    const div = document.createElement('div');
    div.style.cssText = `
      position:fixed;top:12px;right:12px;z-index:10000;
      background:#1a1a2e;color:#e0e0e0;padding:10px 16px;
      border-radius:8px;font-family:monospace;font-size:12px;
      box-shadow:0 4px 12px rgba(0,0,0,0.4);min-width:220px;
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

    try {
      status.textContent = '📡 Conversation verisi çekiliyor...';
      const data = await fetchConversationData();

      status.textContent = '📝 Markdown oluşturuluyor...';
      const md = buildMarkdown(data);
      const filename = getFilename(data);

      downloadMarkdown(md, filename);

      status.textContent = `✅ İndirildi: ${filename}`;
      status.style.background = '#1b4332';
      btn.textContent = '✅ Exported!';

    } catch (err) {
      status.textContent = `❌ Hata: ${err.message}`;
      status.style.background = '#4a1515';
      btn.textContent = '⬇️ Export MD';
      btn.disabled = false;
      console.error('[Claude Exporter]', err);
    } finally {
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

  // Route değişince butonu yeniden ekle
  injectButton();
  const observer = new MutationObserver(() => {
    if (window.location.pathname.startsWith('/chat')) injectButton();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
