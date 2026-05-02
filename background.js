// İkona tıklanınca aktif tab'da export fonksiyonunu çalıştır
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url?.includes('claude.ai')) return;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: runExport,
  });
});

function runExport() {
  // Zaten çalışıyorsa tekrar çalıştırma
  if (window.__claudeExporterRunning) return;
  window.__claudeExporterRunning = true;

  async function fetchConversationData() {
    const conversationId = window.location.pathname.split('/').pop();
    const orgId = document.cookie.match(/lastActiveOrg=([^;]+)/)?.[1];
    if (!conversationId || !orgId) throw new Error('Conversation ID not found.');

    const url = `/api/organizations/${orgId}/chat_conversations/${conversationId}?tree=true&rendering_mode=messages&render_all_tools=true`;
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
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

  function buildMarkdown(data) {
    const title = data.name?.trim() || 'Claude Conversation';
    const messages = data.chat_messages || [];

    let md = `# ${title}\n\n`;
    md += `> **Exported:** ${new Date().toLocaleString()}\n`;
    md += `> **Messages:** ${messages.length}\n\n---\n\n`;

    for (const msg of messages) {
      const sender = msg.sender === 'human' ? '🧑 You' : '🤖 Claude';
      const ts = formatTimestamp(msg.created_at);
      const header = ts ? `### ${sender}  \`${ts}\`` : `### ${sender}`;

      const textParts = (msg.content || [])
        .filter(c => c.type === 'text' && c.text?.trim())
        .map(c => c.text.trim());

      const text = textParts.join('\n\n');
      if (!text) continue;

      md += `${header}\n\n${text}\n\n---\n\n`;
    }
    return md;
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

  function showToast(message, isError = false) {
    const existing = document.getElementById('claude-exporter-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'claude-exporter-toast';
    toast.style.cssText = `
      position:fixed;top:16px;right:16px;z-index:99999;
      background:${isError ? '#4a1515' : '#1b4332'};
      color:${isError ? '#f87171' : '#4ade80'};
      padding:10px 16px;border-radius:8px;
      font-family:monospace;font-size:13px;
      box-shadow:0 4px 12px rgba(0,0,0,0.4);
      border:1px solid ${isError ? '#7f1d1d' : '#166534'};
      transition:opacity 0.3s;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  (async () => {
    try {
      showToast('⏳ Exporting...');
      const data = await fetchConversationData();
      const md = buildMarkdown(data);
      const name = data.name?.trim();
      const filename = (name && name !== 'New conversation')
        ? sanitizeFilename(name) + '.md'
        : 'claude_conversation.md';
      downloadMarkdown(md, filename);
      showToast(`✅ ${filename}`);
    } catch (err) {
      showToast(`❌ ${err.message}`, true);
      console.error('[Claude Exporter]', err);
    } finally {
      window.__claudeExporterRunning = false;
    }
  })();
}
