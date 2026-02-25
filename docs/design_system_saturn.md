# Saturn Design System — Reference for LLM

> A structured description of the Saturn (saturnos.com) visual design language. Use this as a reference when building UI components for Helio to ensure visual consistency with the Saturn brand.

---

## 1. Overall Design Philosophy

```json
{
  "philosophy": {
    "style": "Minimal enterprise SaaS",
    "feeling": "Clean, confident, trustworthy, premium",
    "principles": [
      "Generous white space — let content breathe",
      "Restrained colour palette — mostly monochrome with one accent",
      "Typography does the heavy lifting — large bold headlines, lighter body text",
      "Flat design with subtle depth — no heavy shadows or gradients",
      "Content-first — UI chrome is minimal, content is prominent",
      "High contrast sections — alternate white and dark navy blocks"
    ],
    "avoid": [
      "Clutter or dense layouts",
      "Multiple competing colours",
      "Heavy borders or outlines",
      "Rounded bubbly shapes (keep things sharp and professional)",
      "Gratuitous animation or motion"
    ]
  }
}
```

---

## 2. Colour Palette

```json
{
  "colours": {
    "primary": {
      "white": "#FFFFFF",
      "offWhite": "#F9FAFB",
      "lightGray": "#F3F4F6",
      "description": "Dominant background colour. Most sections are white or near-white."
    },
    "secondary": {
      "darkNavy": "#0F172A",
      "nearBlack": "#1E293B",
      "description": "Used for hero sections, footer, and alternating contrast blocks. Deep, rich, not pure black."
    },
    "accent": {
      "blue": "#2563EB",
      "blueHover": "#1D4ED8",
      "description": "Single accent colour used ONLY for primary CTAs and key interactive elements. Used very sparingly."
    },
    "text": {
      "heading": "#0F172A",
      "body": "#475569",
      "muted": "#94A3B8",
      "onDark": "#F1F5F9",
      "onDarkMuted": "#94A3B8",
      "description": "Dark headings, medium-gray body text, light muted text for captions/labels."
    },
    "borders": {
      "subtle": "#E2E8F0",
      "verySubtle": "#F1F5F9",
      "description": "Borders are barely visible. Used to separate cards or table rows, never heavy."
    },
    "status": {
      "success": "#22C55E",
      "warning": "#F59E0B",
      "error": "#EF4444",
      "info": "#3B82F6",
      "description": "Only used in data-heavy contexts (dashboards, alerts). Never in marketing/landing sections."
    }
  },
  "usage_rules": [
    "The page should feel 80% white/light, 15% dark navy, 5% blue accent",
    "Never use more than one accent colour in a single view",
    "Dark sections are used as contrast breaks between light sections",
    "Blue appears only on: primary buttons, key links, active states",
    "Avoid coloured backgrounds on cards — keep them white with subtle border or shadow"
  ]
}
```

---

## 3. Typography

```json
{
  "typography": {
    "fontFamily": {
      "heading": "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "body": "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "mono": "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      "note": "Single typeface (Inter or similar geometric sans-serif). Differentiation comes from weight and size, not different fonts."
    },
    "scale": {
      "hero_headline": {
        "size": "48px - 64px (3rem - 4rem)",
        "weight": "700 (bold)",
        "lineHeight": "1.1",
        "letterSpacing": "-0.02em",
        "colour": "heading or white (on dark)",
        "usage": "Main hero title only. One per page."
      },
      "section_headline": {
        "size": "36px - 42px (2.25rem - 2.625rem)",
        "weight": "700 (bold)",
        "lineHeight": "1.2",
        "letterSpacing": "-0.01em",
        "colour": "heading",
        "usage": "Section titles. Centered or left-aligned."
      },
      "card_title": {
        "size": "20px - 24px (1.25rem - 1.5rem)",
        "weight": "600 (semibold)",
        "lineHeight": "1.3",
        "colour": "heading",
        "usage": "Feature cards, list item headers."
      },
      "body": {
        "size": "16px - 18px (1rem - 1.125rem)",
        "weight": "400 (regular)",
        "lineHeight": "1.6 - 1.75",
        "colour": "body (#475569)",
        "usage": "Paragraphs, descriptions. Deliberately lighter than headings."
      },
      "small_label": {
        "size": "12px - 14px (0.75rem - 0.875rem)",
        "weight": "500 (medium)",
        "lineHeight": "1.4",
        "letterSpacing": "0.02em - 0.05em",
        "colour": "muted (#94A3B8)",
        "textTransform": "uppercase (optional)",
        "usage": "Section labels, eyebrow text above headlines, metadata."
      }
    },
    "rules": [
      "Headlines are large and bold — they anchor each section",
      "Body text is noticeably lighter (gray, not black) to create visual hierarchy",
      "Eyebrow labels above section headlines are small, uppercase, muted — often blue or gray",
      "Max line width for body text: ~65-75 characters (max-w-prose or max-w-2xl)",
      "No justified text — always left-aligned or centered"
    ]
  }
}
```

---

## 4. Layout & Spacing

```json
{
  "layout": {
    "maxWidth": "1280px (max-w-7xl)",
    "contentMaxWidth": "768px (max-w-3xl) for text-heavy sections",
    "horizontalPadding": "24px mobile, 48px tablet, 80px+ desktop",
    "grid": {
      "columns": "12-column grid on desktop",
      "gap": "24px - 32px (gap-6 to gap-8)",
      "common_layouts": [
        "1 column centered (hero, text sections)",
        "2 columns 50/50 (feature + image)",
        "3 columns equal (feature cards)",
        "2 columns 40/60 or 60/40 (text + screenshot)"
      ]
    },
    "sectionSpacing": {
      "between_sections": "96px - 128px (py-24 to py-32)",
      "within_section": "48px - 64px (space-y-12 to space-y-16)",
      "between_heading_and_content": "16px - 24px",
      "description": "Very generous vertical spacing. Sections never feel cramped."
    },
    "rules": [
      "White space is a feature, not waste — never fill space just because it's empty",
      "Content is always centered within max-width container",
      "Asymmetric layouts (text left, image right) create visual interest",
      "Each section should be visually distinct — clear start and end"
    ]
  }
}
```

---

## 5. Components

```json
{
  "components": {
    "navbar": {
      "style": "Minimal, fixed top, white or transparent background",
      "height": "64px - 72px",
      "logo": "Left-aligned. Text mark ('Saturn') or small logomark. No tagline.",
      "links": "Center or right-aligned. 4-5 items max. Regular weight, dark text.",
      "cta": "One CTA button on the right. Blue, small-medium size.",
      "border": "Very subtle bottom border (#E2E8F0) or none",
      "onScroll": "Optional: slight background blur/opacity on scroll"
    },
    "hero": {
      "layout": "Centered text, generous top padding (pt-24 to pt-32)",
      "eyebrow": "Small uppercase label above headline (optional, blue or muted)",
      "headline": "Hero size (48-64px), bold, tight line height",
      "subtitle": "Body size (18px), muted colour, max-w-2xl, 1-2 sentences",
      "cta": "Primary blue button, large size. Optionally a secondary ghost button next to it.",
      "image": "Full-width or contained screenshot/mockup below the text, with subtle shadow or border",
      "background": "White or dark navy. If dark: white text, blue CTA still works."
    },
    "buttons": {
      "primary": {
        "background": "#2563EB (blue-600)",
        "text": "white",
        "padding": "12px 24px (px-6 py-3)",
        "borderRadius": "8px (rounded-lg)",
        "fontSize": "16px, weight 500",
        "hover": "Darker blue (#1D4ED8), subtle scale or shadow",
        "active": "Even darker, slight press effect"
      },
      "secondary": {
        "background": "transparent or white",
        "text": "#0F172A (dark)",
        "border": "1px solid #E2E8F0",
        "padding": "same as primary",
        "borderRadius": "8px",
        "hover": "Light gray background (#F9FAFB)"
      },
      "ghost": {
        "background": "transparent",
        "text": "#2563EB or #475569",
        "border": "none",
        "hover": "Underline or light background"
      },
      "rules": [
        "Only ONE primary (blue) button per visible section",
        "Secondary buttons are understated — they don't compete with primary",
        "Button text is short: 2-4 words ('Get Started', 'Learn More', 'Book a Demo')"
      ]
    },
    "cards": {
      "background": "white (#FFFFFF)",
      "border": "1px solid #E2E8F0 or none",
      "borderRadius": "12px (rounded-xl)",
      "shadow": "none or very subtle: shadow-sm (0 1px 2px rgba(0,0,0,0.05))",
      "padding": "24px - 32px",
      "hover": "Optional: slight shadow increase or border colour change",
      "content": "Icon (small, muted) → Title (semibold) → Description (body, muted)",
      "rules": [
        "Cards are flat — minimal shadow, no heavy elevation",
        "Consistent card sizes within a grid — no ragged heights",
        "If cards have images, they are top-aligned and full-width within the card"
      ]
    },
    "product_screenshots": {
      "style": "Contained in a rounded container with subtle shadow",
      "border": "1px solid #E2E8F0",
      "borderRadius": "12px - 16px",
      "shadow": "shadow-lg or shadow-xl (these are the only elements with noticeable shadow)",
      "presentation": "Slightly angled or straight-on. Often placed below hero text or beside feature text.",
      "background": "Sometimes placed on a light gray (#F3F4F6) section for contrast"
    },
    "section_alternation": {
      "pattern": [
        "White background section",
        "Off-white or light gray section (#F9FAFB or #F3F4F6)",
        "White section",
        "Dark navy section (#0F172A) — used for testimonials, social proof, or emphasis",
        "White section",
        "Dark navy footer"
      ],
      "rules": [
        "Alternate backgrounds to create visual rhythm without using colour",
        "Dark sections are reserved for high-impact content (quotes, stats, key CTAs)",
        "Never stack two dark sections or two gray sections"
      ]
    },
    "testimonials": {
      "style": "Quote text in large italic or regular, attribution below with photo",
      "background": "Dark navy section or white card",
      "photo": "Small circular avatar (48px - 64px)",
      "attribution": "Name (semibold) + Role/Company (muted)",
      "quote_marks": "Optional, subtle. Never decorative."
    },
    "footer": {
      "background": "Dark navy (#0F172A)",
      "text": "Light (#F1F5F9) for headings, muted (#94A3B8) for links",
      "layout": "Multi-column: logo + description, product links, company links, legal links",
      "bottom": "Copyright line, very small, muted"
    }
  }
}
```

---

## 6. Iconography & Imagery

```json
{
  "icons": {
    "style": "Line icons (not filled). Thin stroke weight (1.5px - 2px).",
    "library": "Lucide React (recommended) or Heroicons (outline variant)",
    "size": "20px - 24px in UI, 32px - 40px in feature cards",
    "colour": "Muted gray (#94A3B8) or body color (#475569). Never blue unless interactive.",
    "usage": [
      "Feature card decorations (small, top-left of card)",
      "Navigation items (optional, small)",
      "Button icons (left of text, same colour as text)",
      "Status indicators in dashboards"
    ]
  },
  "images": {
    "photography": "Professional, candid office/work scenes. Not stock-feeling. Warm tones.",
    "screenshots": "Real product UI, clean and legible. May be cropped or focused on key area.",
    "illustrations": "None or very minimal. Saturn uses real UI and photography, not illustrations.",
    "treatment": "No filters, no overlays. Clean, high-resolution. Rounded corners if contained."
  }
}
```

---

## 7. Motion & Interaction

```json
{
  "motion": {
    "philosophy": "Subtle and purposeful. Motion should clarify, not decorate.",
    "transitions": {
      "duration": "150ms - 200ms for hovers, 300ms for reveals",
      "easing": "ease-out or cubic-bezier(0.16, 1, 0.3, 1)",
      "properties": "opacity, transform (translateY), box-shadow"
    },
    "patterns": [
      "Fade-up on scroll (elements enter from 20px below, opacity 0 → 1)",
      "Hover: subtle shadow increase on cards, colour darken on buttons",
      "No bouncing, no spinning, no sliding panels",
      "Page transitions: simple fade (if using SPA navigation)"
    ],
    "rules": [
      "If you remove all animation, the page should still make perfect sense",
      "Never animate text content — only containers and decorative elements",
      "Loading states: subtle pulse/shimmer, never spinners"
    ]
  }
}
```

---

## 8. Dashboard-Specific Patterns (for Helio App)

> These extend the Saturn design language into the data-rich app context.

```json
{
  "dashboard": {
    "layout": "Two-panel: chat (left) + dashboard (right). Clean divider.",
    "cards": {
      "same_as_marketing": true,
      "additions": [
        "Data cards can have a coloured left border (4px) for status: green/amber/red",
        "Cards can contain charts, tables, progress bars",
        "Card headers: title (semibold) + optional subtitle (muted) + optional action button (ghost)"
      ]
    },
    "charts": {
      "colours": [
        "#2563EB (blue-600, primary data)",
        "#7C3AED (violet-600, secondary data)",
        "#059669 (emerald-600, positive/savings)",
        "#DC2626 (red-600, negative/charges)",
        "#F59E0B (amber-500, warning/neutral)"
      ],
      "style": "Clean, minimal. No gridlines or light gridlines only. No 3D. No gradients in bars.",
      "labels": "Small, muted text. Outside the chart area where possible."
    },
    "tables": {
      "style": "Minimal. No zebra striping. Subtle row borders. Header row slightly bolder.",
      "alignment": "Text left, numbers right",
      "highlight": "Bold or coloured text for key values, not row background"
    },
    "progress_bars": {
      "height": "8px - 12px",
      "borderRadius": "full (rounded-full)",
      "background": "#E2E8F0 (track)",
      "fill_colours": {
        "green": "#22C55E (< 50% used)",
        "amber": "#F59E0B (50-80% used)",
        "red": "#EF4444 (> 80% used or expired)"
      }
    },
    "alerts": {
      "style": "Left-bordered cards. Icon + title + description.",
      "border_colours": {
        "critical": "#EF4444",
        "warning": "#F59E0B",
        "opportunity": "#22C55E",
        "info": "#3B82F6"
      }
    },
    "chat_bubbles": {
      "user": {
        "background": "#2563EB",
        "text": "white",
        "alignment": "right",
        "borderRadius": "12px, bottom-right squared"
      },
      "assistant": {
        "background": "#F3F4F6",
        "text": "#0F172A",
        "alignment": "left",
        "borderRadius": "12px, bottom-left squared"
      }
    }
  }
}
```

---

## 9. Quick Reference: Tailwind Classes

For fast implementation, these are the approximate Tailwind classes that map to the Saturn design:

```json
{
  "tailwind_mapping": {
    "backgrounds": {
      "white_section": "bg-white",
      "offwhite_section": "bg-gray-50",
      "dark_section": "bg-slate-900 text-white",
      "card": "bg-white border border-gray-200 rounded-xl shadow-sm"
    },
    "text": {
      "hero_headline": "text-5xl md:text-6xl font-bold tracking-tight text-slate-900",
      "section_headline": "text-3xl md:text-4xl font-bold tracking-tight text-slate-900",
      "card_title": "text-xl font-semibold text-slate-900",
      "body": "text-base md:text-lg text-slate-600 leading-relaxed",
      "eyebrow": "text-sm font-medium uppercase tracking-wider text-blue-600",
      "muted": "text-sm text-slate-400"
    },
    "spacing": {
      "section_padding": "py-24 md:py-32",
      "container": "max-w-7xl mx-auto px-6 md:px-12",
      "text_container": "max-w-3xl mx-auto",
      "card_padding": "p-6 md:p-8",
      "grid_gap": "gap-6 md:gap-8"
    },
    "buttons": {
      "primary": "bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors",
      "secondary": "bg-white hover:bg-gray-50 text-slate-900 border border-gray-200 px-6 py-3 rounded-lg font-medium transition-colors",
      "ghost": "text-blue-600 hover:text-blue-700 hover:underline font-medium"
    }
  }
}
```

---

## 10. Design Don'ts

```json
{
  "avoid": [
    "Gradients on backgrounds or buttons",
    "Multiple font families",
    "Bright/saturated background colours on sections",
    "Heavy drop shadows (anything above shadow-lg is too much, except product screenshots)",
    "Bordered containers with thick borders (>1px)",
    "Full-width coloured banners",
    "Icon-heavy layouts — icons are accents, not content",
    "Dense data tables without spacing",
    "Modals/popups when inline expansion would work",
    "Skeleton UI that is more complex than the actual content"
  ]
}
```

---

*Reference image: `/assets/www.saturnos.com_-96257680-b345-4648-970e-3ee95502ef3b.png`*
*Use this document when prompting an LLM to build UI for Helio. Paste relevant sections into the system prompt or provide as context.*
