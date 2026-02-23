# cloudNein — Privacy-First Financial AI

> **Cloud? Nein.** Your financial data stays local.

A mobile-first financial AI assistant for CFOs that runs **entirely on-device** using FunctionGemma + Cactus Compute. When cloud reasoning is needed, we use a novel **reversible subgraph** — anonymizing all entities before sending to Gemini, then de-anonymizing the response locally.

**Real names never leave the device.**

---

## The Problem

CFOs handle the most sensitive data in any company: SSNs, salaries, M&A details, cash positions, client revenue. They need instant answers between meetings, but they'd **never** paste this into ChatGPT. Current solutions force a choice: privacy **or** intelligence.

## The Solution

**cloudNein** uses a **reversible subgraph** — a bidirectional anonymization system:

1. **Anonymize** all entities (vendors, clients, employees, PII) into node aliases (`Vendor_A`, `Client_B`, `Person_A`)
2. **Send** anonymized structural data to Gemini for reasoning
3. **De-anonymize** the response locally — real names restored on-device

The cloud sees financial relationships without knowing who the actual entities are. The CFO gets specific, actionable advice with real names.

### What Makes This Novel

**Reversible subgraph anonymization** — standard redaction is one-way (`"John Doe"` → `"[REDACTED]"`), breaking AI reasoning. We preserve structure:

```
LOCAL DEVICE (never transmitted)    CLOUD (Gemini)
────────────────────────────────    ──────────────
Baker McKenzie  ↔  Vendor_A         Sees: Vendor_A
Acme Corp       ↔  Client_A         Sees: Client_A
Sarah Chen      ↔  Employee_A       Sees: Employee_A
123-45-6789     ↔  SSN_A            Sees: SSN_A
```

Gemini reasons over relationships: *"Vendor_A has the highest legal spend. Consider renegotiating..."*

Locally, we swap aliases back: *"Baker McKenzie has the highest legal spend. Consider renegotiating..."*

### Privacy-Aware Routing

5-stage pipeline that autonomously decides what's safe to send to the cloud:

- **Stage 0:** PII detection + sensitivity scoring (<1ms)
- **Stage 1:** Complexity classification (data-lookup vs analytical)
- **Stage 2:** Context narrowing (7 tools → 2-3 relevant)
- **Stage 3:** FunctionGemma tool calling (~3s, on-device)
- **Stage 4:** Execution with 5 routing paths:
  - `local-tool` — SQL query on-device
  - `cloud-tool` — Gemini picks tool → SQL on-device
  - `cloud-analysis` — anonymize → Gemini → de-anonymize
  - `privacy-redact` — anonymize → Gemini compliance → de-anonymize
  - `local-fallback` — keyword extraction

---

## Tech Stack

- **FunctionGemma 270M** (via Cactus Compute) — on-device tool selection
- **Gemini 2.5 Flash** — cloud reasoning (only with anonymized data)
- **React Native + Expo** — cross-platform mobile
- **SQLite** — on-device financial database
- **TypeScript** — end-to-end type safety

---

## Demo

| Prompt | Routing Path | Result |
|---|---|---|
| "How much revenue from NovaPharma?" | `local-tool` | $76K, 3.5s, fully on-device |
| "Should we cut marketing spend?" | `cloud-analysis` | 34 entities anonymized → Gemini → de-anonymized |
| "John Smith SSN 123-45-6789 approved $50K" | `privacy-redact` | Person_A + SSN_A → compliance analysis → de-anonymized |
| Airplane mode → "Marketing budget?" | `local-tool` | Works fully offline |

**Showstopper:** Logs prove real vendor/client names never left the device.

---

## Getting Started

```bash
npm install --legacy-peer-deps
npm run start
```

To make things work on your local simulator, or on your phone, you need first to [run `eas build`](https://github.com/infinitered/ignite/blob/master/docs/expo/EAS.md). We have many shortcuts on `package.json` to make it easier:

```bash
npm run build:ios:sim # build for ios simulator
npm run build:ios:device # build for ios device
npm run build:ios:prod # build for ios device
```

### `./assets`

This directory is designed to organize and store various assets, making it easy for you to manage and use them in your application. The assets are further categorized into subdirectories, including `icons` and `images`:

```tree
assets
├── icons
└── images
```

**icons**
This is where your icon assets will live. These icons can be used for buttons, navigation elements, or any other UI components. The recommended format for icons is PNG, but other formats can be used as well.

Ignite comes with a built-in `Icon` component. You can find detailed usage instructions in the [docs](https://github.com/infinitered/ignite/blob/master/docs/boilerplate/app/components/Icon.md).

**images**
This is where your images will live, such as background images, logos, or any other graphics. You can use various formats such as PNG, JPEG, or GIF for your images.

Another valuable built-in component within Ignite is the `AutoImage` component. You can find detailed usage instructions in the [docs](https://github.com/infinitered/ignite/blob/master/docs/Components-AutoImage.md).

How to use your `icon` or `image` assets:

```typescript
import { Image } from 'react-native';

const MyComponent = () => {
  return (
    <Image source={require('assets/images/my_image.png')} />
  );
};
```

## Running Maestro end-to-end tests

Follow our [Maestro Setup](https://ignitecookbook.com/docs/recipes/MaestroSetup) recipe.

## Next Steps

### Ignite Cookbook

[Ignite Cookbook](https://ignitecookbook.com/) is an easy way for developers to browse and share code snippets (or “recipes”) that actually work.

### Upgrade Ignite boilerplate

Read our [Upgrade Guide](https://ignitecookbook.com/docs/recipes/UpdatingIgnite) to learn how to upgrade your Ignite project.

## Community

⭐️ Help us out by [starring on GitHub](https://github.com/infinitered/ignite), filing bug reports in [issues](https://github.com/infinitered/ignite/issues) or [ask questions](https://github.com/infinitered/ignite/discussions).

💬 Join us on [Slack](https://join.slack.com/t/infiniteredcommunity/shared_invite/zt-1f137np4h-zPTq_CbaRFUOR_glUFs2UA) to discuss.

📰 Make our Editor-in-chief happy by [reading the React Native Newsletter](https://reactnativenewsletter.com/).
