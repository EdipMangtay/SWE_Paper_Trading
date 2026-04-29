# UML Diyagramları — 4+1 View Model

Bu klasör **Software Architecture Document v2** kapsamındaki tüm UML diyagramlarını içerir.

## Hızlı Bakış

`preview.html` dosyasını çift tıklayarak tarayıcıda açın — tüm 10 diyagram canlı olarak render edilir (mermaid.js CDN üzerinden).

```
docs/diagrams/preview.html  ← BURAYI AÇ
```

## Diyagram Listesi

| # | Dosya | View | Açıklama |
|---|-------|------|----------|
| 1 | `01_use_case.mmd` | Use Case | Trader & Admin aktörleri ile use case'ler |
| 2 | `02_class_diagram.mmd` | Logical | Domain modelleri ve ilişkiler |
| 3 | `03_sequence_market_order.mmd` | Process | Market Order akışı |
| 4 | `04_sequence_limit_order.mmd` | Process | Limit Order akışı + worker |
| 5 | `05_sequence_portfolio.mmd` | Process | Portfolio valuation akışı |
| 6 | `06_activity_diagram.mmd` | Process | Tam trading döngüsü |
| 7 | `07_state_machine.mmd` | Process | Order state machine |
| 8 | `08_component_diagram.mmd` | Development | Layered components |
| 9 | `09_deployment_diagram.mmd` | Physical (+1) | Deployment topology |
| 10 | `10_package_diagram.mmd` | Development | Paket organizasyonu |

## Manuel Render

Eğer bireysel SVG çıktısı isterseniz:

**Yöntem 1 — Mermaid Live Editor:**
1. https://mermaid.live adresine git
2. Bir `.mmd` dosyasının içeriğini kopyala-yapıştır
3. SVG/PNG olarak indir

**Yöntem 2 — Mermaid CLI (lokal):**
```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i 01_use_case.mmd -o 01_use_case.svg -t dark -b transparent
```

**Yöntem 3 — Tarayıcıda toplu görüntüleme:**
`preview.html` dosyasını aç (önerilen).

## 4+1 View Model Eşleşmesi

```
                    ┌──────────────────────┐
                    │   USE CASE VIEW      │
                    │   (Senaryolar)       │
                    │   ─────────────────  │
                    │   Diagram #1         │
                    └──────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐   ┌─────────▼────────┐   ┌────────▼────────┐
│  LOGICAL VIEW  │   │  PROCESS VIEW    │   │  DEVELOPMENT    │
│  (Yapı)        │   │  (Davranış)      │   │  VIEW (Kod)     │
│  ─────────     │   │  ────────        │   │  ─────────      │
│  Diagram #2    │   │  Diagrams        │   │  Diagrams       │
│                │   │  #3, #4, #5,     │   │  #8, #10        │
│                │   │  #6, #7          │   │                 │
└────────────────┘   └──────────────────┘   └─────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │  PHYSICAL VIEW (+1)  │
                    │  (Deployment)        │
                    │  ─────────────────   │
                    │  Diagram #9          │
                    └──────────────────────┘
```
