# Claude Exporter Extension
English description below.

Herhangi bir Claude konuşmasını doğrudan tarayıcından tek bir tıkla temiz bir Markdown dosyası olarak dışa aktar.

## Özellikler

- Herhangi bir Claude sohbetinden tek tıkla dışarı aktarma
- Zaman damgalı, temiz Markdown çıktısı
- Python yok, terminal yok, kurulum yok
- Tamamen tarayıcında çalışır — hiçbir veri cihazından dışarı çıkmaz

## Kurulum

1. [Releases](../../releases/latest) sayfasından ZIP olarak indir
2. ZIP klasörünü aç (unzip)
3. Chrome'u aç → `chrome://extensions/` adresine git
4. Sağ üstte **Geliştirici modu**'nu etkinleştir
5. **"Paketlenmemiş öğe yükle"** butonuna tıkkla → açılan pencereden indirdiğin ZIP klasörü seç(unzip halini)
6. [claude.ai](https://claude.ai) üzerinde herhangi bir sohbeti aç
7. Araç çubuğundaki **eklenti simgesine** tıkla → dışa aktarma otomatik başlar

## Kullanım

1. [claude.ai](https://claude.ai) üzerinde herhangi bir konuşmayı aç
2. URL çubuğunun yanındaki **Claude Exporter simgesine** tıkla
3. `.md` dosyası otomatik olarak indirilir

## Gereksinimler

- Google Chrome (veya Chromium tabanlı tarayıcı: Brave, Edge, Arc)
- Chrome eklentilerinde Geliştirici modu etkin olmalı

## 📁 Proje Yapısı

| Dosya | Amaç |
|---|---|
| `manifest.json` | Eklenti kimliği — Chrome'a bu eklentinin ne olduğunu ve neye ihtiyaç duyduğunu söyler |
| `background.js` | Motor — simge tıklamalarını dinler ve dışa aktarmayı tetikler |
| `content_script.js` | Sayfa enjeksiyon katmanı — gelecekteki özellikler için hazır |
| `icons/` | Araç çubuğu ve eklenti sayfası simgeleri (16/48/128px) |
| `README.md` | Kullanım kılavuzu |

## 👤 Geliştirici

**[Sema Bulut](https://github.com/semaybulut)** tarafından orijinal çekirdek üzerine inşa edilerek genişletilmiştir.

> [!TIP]
> AxonodeAI sürümü — daha temiz bir deneyim ve iyileştirilmiş güvenilirlik için sıfırdan yeniden tasarlandı. 

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) ile korunmaktadır. [AxonodeAI](https://github.com/semaybulut) tarafından değiştirilmiş ve genişletilmiştir. 
Temel alınan çalışma: [claude-chat-exporter](https://github.com/agarwalvishal/claude-chat-exporter)

---

# Claude Exporter Extension

Export any Claude conversation as a clean Markdown file — directly from your browser.

## Features

- One-click export from any Claude conversation
- Clean Markdown output with timestamps
- No Python, no terminal, no setup
- Works entirely in your browser — no data leaves your machine

## Installation

1. Download the latest ZIP from [Releases](../../releases/latest)
2. Unzip the folder
3. Open Chrome → `chrome://extensions/`
4. Enable **Developer mode** (top right toggle)
5. Click **"Load unpacked"** → select the unzipped folder
6. Open any conversation on [claude.ai](https://claude.ai)
7. Click the **extension icon** in the toolbar → export starts automatically

## Usage

1. Open any conversation on claude.ai
2. Click the **Claude Exporter icon** next to the URL bar
3. A `.md` file downloads automatically

## Requirements

- Google Chrome (or any Chromium-based browser: Brave, Edge, Arc)
- Developer mode enabled in Chrome extensions

## 📁 Project Structure

| File | Purpose |
|---|---|
| `manifest.json` | Extension identity — tells Chrome what this extension is and what it needs |
| `background.js` | The engine — listens for icon clicks and triggers the export |
| `content_script.js` | Page injection layer — ready for future features |
| `icons/` | Toolbar and extension page icons (16/48/128px) |
| `README.md` | Usage guide |

## 👤 Developer

Built and extended by **[Sema Bulut](https://github.com/semaybulut)** on top of the original core.

> [!TIP]
> AxonodeAI version — re-engineered from the ground up for a cleaner experience and improved reliability.

## 📄 License

MIT License — based on [claude-chat-exporter](https://github.com/agarwalvishal/claude-chat-exporter)  
Modified and extended by [AxonodeAI](https://github.com/semaybulut)

