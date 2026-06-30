# MedControl — Design System (Vercel/Geist Patterns)

> Sistema de design baseado no Geist (Vercel) aplicado ao MedControl.  
> Mantém a paleta de cores medicinal existente, mas adota completamente a arquitetura visual do Vercel: tipografia, espaçamento, bordas, sombras, botões, inputs, componentes e layout.
>
> Referência: https://vercel.com/design | https://vercel.com/geist

---

## 1. Filosofia

- **Hierarquia via contraste.** Use a escala de cinza para rankear informação. O que é importante é escuro; o que é secundário é claro.
- **Cor como pontuação.** A paleta medicinal (azul, teal) é usada para estado e ação principal, não decoração.
- **Espaço como hierarquia.** Whitespace agressivo comunica confiança. Ritmo de 3 passos: 8px dentro do grupo, 16px entre grupos, 32–40px entre seções.
- **Tipografia como identidade.** Work Sans para UI geral, Poppins para headings de alto impacto. Geist Mono para código e dados tabulares (quando disponível).
- **Interações aumentam contraste.** Hover > active > focus sempre escurecem ou clareiam 1 passo na escala.

---

## 2. Cores (Paleta Medicinal Existente)

```css
:root {
  /* === Gray Scale (10 passos — Vercel pattern) === */
  --ds-gray-100:  #f8f9fa;
  --ds-gray-200:  #f1f3f5;
  --ds-gray-300:  #e2e6ea;
  --ds-gray-400:  #ced4da;
  --ds-gray-500:  #adb5bd;
  --ds-gray-600:  #6c757d;
  --ds-gray-700:  #495057;
  --ds-gray-800:  #3d4349;
  --ds-gray-900:  #2b3035;
  --ds-gray-1000: #1a1d21;

  /* Gray-Alpha (bordas/overlays sobre qlqr fundo) */
  --ds-gray-alpha-100: rgba(0,0,0,0.04);
  --ds-gray-alpha-200: rgba(0,0,0,0.06);
  --ds-gray-alpha-300: rgba(0,0,0,0.08);
  --ds-gray-alpha-400: rgba(0,0,0,0.12);
  --ds-gray-alpha-500: rgba(0,0,0,0.20);
  --ds-gray-alpha-600: rgba(0,0,0,0.28);
  --ds-gray-alpha-700: rgba(0,0,0,0.36);
  --ds-gray-alpha-800: rgba(0,0,0,0.48);
  --ds-gray-alpha-900: rgba(0,0,0,0.60);
  --ds-gray-alpha-1000: rgba(0,0,0,0.80);

  /* === Aceno Medicinal === */
  --ds-blue:       #1a6fc4;
  --ds-blue-dark:  #14568f;
  --ds-blue-light: #e8f2fc;
  --ds-teal:       #2a9d8f;
  --ds-teal-dark:  #1f7a6e;
  --ds-teal-light: #e0f5f0;
  --ds-danger:     #d62828;
  --ds-warning:    #e07a2f;
  --ds-success:    #2a9d8f;

  /* === Backgrounds === */
  --ds-background-100: #ffffff;
  --ds-background-200: #f8f9fa;

  /* === Sidebar === */
  --ds-sidebar-bg:       #062e3a;
  --ds-sidebar-bg-dark:  #042028;
  --ds-sidebar-accent:   #17c3b2;
}
```

### Uso Semântico da Gray Scale (Vercel padrão)

| Token | Uso |
|-------|-----|
| `100` | Background padrão de componente |
| `200` | Hover background |
| `300` | Active background |
| `400` | Border default |
| `500` | Border hover |
| `600` | Border active |
| `700` | High contrast background |
| `800` | Hover high contrast |
| `900` | Texto e ícones secundários |
| `1000` | Texto e ícones primários |

---

## 3. Tipografia (Vercel Scale)

### Font Stacks

```css
--ds-font-sans: 'Work Sans', -apple-system, system-ui, 'Segoe UI', Roboto, sans-serif;
--ds-font-display: 'Poppins', var(--ds-font-sans);
--ds-font-mono: 'Geist Mono', 'SF Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
```

### Escala de Headings (Poppins — weight 600/700)

Usado para títulos de página e seção. Letter-spacing negativo.

| Token | Size | Weight | Line H | Letter-Spacing | Uso |
|-------|------|--------|--------|----------------|-----|
| `--ds-heading-48` | 48px | 700 | 1.1 | -0.03em | Hero marketing |
| `--ds-heading-40` | 40px | 700 | 1.15 | -0.025em | Hero página |
| `--ds-heading-32` | 32px | 700 | 1.2 | -0.02em | Título de painel |
| `--ds-heading-24` | 24px | 700 | 1.25 | -0.015em | Seção dashboard |
| `--ds-heading-20` | 20px | 600 | 1.3 | -0.01em | Card título |
| `--ds-heading-16` | 16px | 600 | 1.35 | normal | Subtítulo card |
| `--ds-heading-14` | 14px | 600 | 1.4 | normal | Agrupamento |

### Escala de Labels (Work Sans — weight 500/600)

Linha única, scannable. Para navegação, labels de formulário, headers de tabela, metadados.

| Token | Size | Weight | Line H | Uso |
|-------|------|--------|--------|-----|
| `--ds-label-16` | 16px | 500/600 | 1.3 | Título seção |
| `--ds-label-14` | 14px | 500/600 | 1.3 | **Mais comum.** Menus, tabelas, botões |
| `--ds-label-13` | 13px | 400 | 1.3 | Secundário |
| `--ds-label-12` | 12px | 400 | 1.3 | Terciário, badges |

### Escala de Copy (Work Sans — weight 400/600)

Multi-linha. Line-height mais alto.

| Token | Size | Weight | Line H | Uso |
|-------|------|--------|--------|-----|
| `--ds-copy-16` | 16px | 400/600 | 1.6 | Parágrafo introdutório |
| `--ds-copy-14` | 14px | 400/600 | 1.6 | **Padrão body text** |
| `--ds-copy-13` | 13px | 400 | 1.5 | Secundário |

### Escala de Botões (Work Sans — weight 500)

| Token | Size | Weight | Uso |
|-------|------|--------|-----|
| `--ds-button-16` | 16px | 500 | Botão large (48px) |
| `--ds-button-14` | 14px | 500 | Botão default (40px) |
| `--ds-button-12` | 12px | 500 | Botão small (32px) |

---

## 4. Espaçamento (Escala 4px — Vercel)

```css
--ds-space-1:   4px;
--ds-space-2:   8px;    /* Dentro de grupo */
--ds-space-3:   12px;
--ds-space-4:   16px;   /* Entre grupos / padding input */
--ds-space-5:   20px;
--ds-space-6:   24px;   /* Padding card default */
--ds-space-8:   32px;   /* Entre seções */
--ds-space-10:  40px;
--ds-space-12:  48px;
--ds-space-16:  64px;
--ds-space-24:  96px;   /* Seção hero */
--ds-space-32:  128px;
```

### Ritmo de 3 Passos

| Nível | Token | Onde usar |
|-------|-------|-----------|
| Micro | `--ds-space-2` (8px) | Gap entre elementos dentro de um grupo (ícone + texto, badge) |
| Meso | `--ds-space-4` (16px) | Gap entre grupos, padding de input/botão, gap entre cards |
| Macro | `--ds-space-8` (32px) | Gap entre seções, padding de container, entre painéis |

---

## 5. Border Radius (Vercel)

```css
--ds-radius-none: 0px;      /* Cards, containers de dashboard */
--ds-radius-sm:   4px;       /* Badges, avatares */
--ds-radius-md:   6px;       /* Inputs, botões (PADRÃO) */
--ds-radius-lg:   8px;       /* Modais, dropdowns, action cards */
--ds-radius-xl:   12px;      /* Cards especiais */
--ds-radius-full: 9999px;    /* Pill */
```

**Regra**: Child radius ≤ parent radius. Raios aninhados devem ser concêntricos.

---

## 6. Sombras (Layered — Vercel)

Duas camadas: ambiente + luz direcional. Nunca menos que 2 layers.

```css
--ds-shadow-card:      0 0 0 1px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04);
--ds-shadow-card-hover: 0 0 0 1px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.06);
--ds-shadow-modal:      0 0 0 1px rgba(0,0,0,0.08), 0 20px 48px rgba(0,0,0,0.12);
--ds-shadow-dropdown:   0 0 0 1px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08);
--ds-shadow-toast:      0 0 0 1px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.12);
--ds-shadow-glow:       0 2px 12px rgba(26,111,196,0.12);
```

---

## 7. Breakpoints (Vercel)

```css
--ds-bp-sm:  401px;
--ds-bp-md:  601px;
--ds-bp-lg:  961px;
--ds-bp-xl:  1200px;
--ds-bp-2xl: 1400px;
```

Mobile-first. Conteúdo centralizado em coluna de 1200px max-width.

---

## 8. Componentes

### Botões — Hierarchy (Vercel)

#### Variants

| Variant | Background | Border | Text | Hover | Active |
|---------|-----------|--------|------|-------|--------|
| **Primary** | `--ds-blue` | — | white | `--ds-blue-dark` | `--ds-blue-dark` |
| **Secondary** | `--ds-teal` | — | white | `--ds-teal-dark` | `--ds-teal-dark` |
| **Outline** | transparent | `--ds-blue` | `--ds-blue` | bg `--ds-blue-light` | — |
| **Ghost** | transparent | — | `--ds-gray-600` | bg `--ds-gray-100` | bg `--ds-gray-200` |
| **Danger** | `--ds-danger` | — | white | darker red | — |

#### Sizes

| Size | Height | Padding | Font |
|------|--------|---------|------|
| Small | 32px | 8px 16px | `--ds-button-12` |
| Default | 40px | 10px 20px | `--ds-button-14` |
| Large | 48px | 14px 28px | `--ds-button-16` |

#### States (Vercel)

```css
/* Focus ring — two-layer */
--ds-focus-ring: 0 0 0 2px var(--ds-background-100), 0 0 0 4px var(--ds-blue);
/* Disabled */
--ds-disabled-bg: var(--ds-gray-100);
--ds-disabled-text: var(--ds-gray-600);
--ds-disabled-cursor: not-allowed;
```

**Regras do Vercel:**
- Primary button: fundo sólido `--ds-blue`, label branca. Usado para a ação mais importante da view.
- Outline: fundo transparente, borda `--ds-blue`. Alternativa de média ênfase.
- Ghost: sem borda, sem fundo. Baixa ênfase. Tinge com `--ds-gray-alpha` no hover.
- Danger: fundo `--ds-danger`. Para ações destrutivas.
- Hover/active sobem 1 passo na escala (100 → 200 → 300).
- Disabled: fundo `gray-100`, texto `gray-600`, cursor not-allowed.

#### Estrutura HTML (Vercel pattern)

```html
<button class="btn btn--primary btn--lg">
  <i class="bx bx-plus"></i>
  Nova Prescrição
</button>
```

---

### Inputs (Vercel)

| Propriedade | Valor |
|-------------|-------|
| Height | 40px (default), 32px (small), 48px (large) |
| Padding | 10px 16px |
| Radius | `--ds-radius-md` (6px) |
| Background | `var(--ds-background-100)` |
| Border | 1.5px solid `var(--ds-gray-300)` |
| Placeholder | `var(--ds-gray-500)` |
| Hover border | `var(--ds-gray-400)` |
| Focus | `--ds-focus-ring` + border `--ds-blue` |
| Transition | all 150ms ease |

**Regras:**
- Input deve ter mesma altura que o botão default (40px) para alinhamento em fila.
- Focus ring sempre visível em `:focus-visible`, nunca `outline` sem ring.
- Label usa `--ds-label-14` weight 500.

---

### Cards (Vercel)

| Propriedade | Default | Compact | Hero |
|-------------|---------|---------|------|
| Padding | `--ds-space-6` (24px) | `--ds-space-4` (16px) | `--ds-space-8` (32px) |
| Radius | `--radius-md` (6px) | 6px | 8px |
| Shadow | `--ds-shadow-card` | — | `--ds-shadow-card-hover` |
| Background | `var(--ds-background-100)` | — | — |
| Border | 1px solid `--ds-gray-200` | — | — |

---

### Badges (Vercel)

| Propriedade | Valor |
|-------------|-------|
| Height | 20–24px |
| Padding | 4px 10px |
| Font | `--ds-label-12`, weight 500 |
| Radius | `--ds-radius-sm` (4px) |
| Background | `--ds-gray-200` (neutro) ou cor de aceno |
| Text | cor correspondente ao fundo |

Variantes semânticas: `badge--success` (teal), `badge--warning` (amber), `badge--danger` (red), `badge--info` (blue).

---

### Tabelas — Data Table (Vercel)

| Propriedade | Valor |
|-------------|-------|
| Header font | `--ds-label-12` uppercase, weight 600 |
| Body font | `--ds-copy-14` |
| Cell padding | 12px 16px |
| Border | Apenas bordas horizontais, `--ds-gray-200` |
| Hover row | bg `--ds-gray-100` |
| Border radius | 0 (tabela ocupa toda largura) |
| Header bg | `--ds-gray-100` |

---

### Modais (Vercel)

| Propriedade | Valor |
|-------------|-------|
| Overlay | `--ds-gray-alpha-800` com backdrop-filter: blur(4px) |
| Content padding | `--ds-space-8` (32px) |
| Radius | `--ds-radius-lg` (8px) |
| Shadow | `--ds-shadow-modal` |
| Width | 480px (default), 640px (large) |
| Animation | scale(0.95) → scale(1), opacity fade |

---

### Toasts (Vercel)

| Propriedade | Valor |
|-------------|-------|
| Padding | 12px 20px |
| Radius | `--ds-radius-md` (6px) |
| Shadow | `--ds-shadow-toast` |
| Background | white |
| Border-left | 4px solid (cor por tipo) |
| Animation | slide-in right + fade |

---

### Action Cards

| Propriedade | Valor |
|-------------|-------|
| Radius | `--ds-radius-lg` (8px) |
| Padding | 16px 20px |
| Shadow | `--ds-shadow-card` |
| Hover | translateY(-2px), `--ds-shadow-card-hover` |
| Icon bg | gradient `--ds-blue` → `--ds-blue-dark`, 44×44px, radius 10px |

---

## 9. Layout — Sidebar + Main Panel (Vercel Dashboard Pattern)

```
┌─────────────┬──────────────────────────────────────────────┐
│   Sidebar   │              Main Content                    │
│   240px     │                                              │
│             │  Header: title + search + actions            │
│  ───────    │  ─────────────────────────────────────────── │
│  MedControl │                                              │
│             │  Panel Body                                  │
│  Menu       │  ┌──────┐ ┌──────┐ ┌──────┐                 │
│   Visão     │  │ Stat │ │ Stat │ │ Stat │                 │
│   Pacientes │  └──────┘ └──────┘ └──────┘                 │
│   Prescrições│                                            │
│             │  ┌────────────────────────────────────────┐  │
│  Ações      │  │  Tabela / Conteúdo                     │  │
│   Nova      │  │                                        │  │
│   Paciente  │  └────────────────────────────────────────┘  │
│             │                                              │
│  ───────    │                                              │
│  Avatar     │                                              │
│  Dr. Nome   │                                              │
└─────────────┴──────────────────────────────────────────────┘
```

### Especificações

| Elemento | Largura/Altura | Padding |
|----------|---------------|---------|
| Sidebar | 240px (collapsed: 60px) | — |
| Sidebar item | — | 10px 16px |
| Header | — | 12px 24px |
| Panel body | — | 24px 32px |
| Content max-width | 1200px | — |

---

## 10. Animações (Vercel)

```css
--ds-duration-fast:   150ms;
--ds-duration-normal: 200ms;
--ds-duration-slow:   300ms;

--ds-ease-in:     cubic-bezier(0.4, 0, 1, 1);
--ds-ease-out:    cubic-bezier(0, 0, 0.2, 1);
--ds-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

Motion tokens:
- `fadeUp`: translateY(8px) + opacity, duração normal
- `floatSoft`: translateY flutuante 6s infinite (ícones)
- `pulseGlow`: box-shadow pulsante (alertas)
- `toastSlide`: slide da direita com fade

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 11. Princípios de Interface (Vercel Web Guidelines)

1. **Alinhamento óptico** — Ajuste ±1px quando percepção vencer geometria.
2. **Alinhamento deliberado** — Todo elemento alinha com algo intencionalmente.
3. **Nested radii** — Raio do filho ≤ raio do pai. Curvas concêntricas.
4. **Sombras em camadas** — Sempre ≥ 2 layers: ambiente + direcional.
5. **Bordas nítidas** — Combinar borda + sombra. Borda semi-transparente melhora clareza.
6. **Cor sozinha não sinaliza estado** — Acompanhar com ícone ou label para acessibilidade.
7. **Não misturar mais de 2 raios ou 2 weights de fonte na mesma view.**
8. **Interações aumentam contraste** — Hover/active/focus sempre > estado de repouso.
9. **Navegação sem scroll excessivo** — Só renderizar scrollbars onde útil.
10. **Deixe o browser dimensionar** — Prefira flex/grid/intrínseco a medir em JS.

---

## 12. Checklist de Aplicação

- [ ] Substituir variáveis CSS antigas pelos novos tokens `--ds-*`
- [ ] Aplicar `--ds-font-sans` no body, `--ds-font-display` em h1/h2/h3
- [ ] Padronizar altura de inputs e botões (32/40/48px)
- [ ] Atualizar `--radius-*` para os novos valores (6px default)
- [ ] Substituir shadows por layered shadows (2 layers)
- [ ] Aplicar escala de espaçamento 4px (remover margins soltas)
- [ ] Atualizar variantes de botão (primary/secondary/outline/ghost)
- [ ] Padronizar tabelas (border horizontal, `--ds-label-12` header)
- [ ] Adicionar focus ring two-layer em todos os elementos interativos
- [ ] Testar responsivo nos 5 breakpoints
