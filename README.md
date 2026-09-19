# Recovery Insurance Document Check

A fail-closed TanStack Start application that extracts PDF/image text and applies deterministic UK recovery-insurance checks. It does not use AI or third-party document-processing services.

## Local setup

Requires Node.js 20.19+ and npm. Native binaries for `@napi-rs/canvas` are installed by npm for supported systems.

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Run all production checks with `npm run check`.

## Processing

Uploads are validated by size and file signature. Digital PDFs use embedded text page by page; pages with too little text are rendered at 2× and OCR'd. Images use Tesseract OCR. Files remain in request memory and are discarded after the response.

## Vercel deployment

The project uses the official TanStack Start Nitro adapter with the Vercel preset. Uploads are limited to 4 MB so multipart requests remain below Vercel Functions' 4.5 MB payload limit.

1. Push the project to a GitHub repository.
2. In Vercel, select **Add New → Project** and import that repository.
3. Leave the detected **TanStack Start** framework settings unchanged.
4. Select **Deploy**.

The included `vercel.json` enables TanStack Start framework detection. No environment variables are currently required.

## Insurance rules

Edit `src/lib/insurance-rules.ts`. Approval requires every configured rule to pass, including labelled active dates, commercial motor-trade recovery use, customers' vehicles, and recovery/towing cover. Conflicting exclusions cause rejection. Social, domestic and pleasure use does not establish commercial recovery cover.

## Limitations

OCR can misread documents, layouts, or handwriting, so uncertain results are rejected. This tool does not contact an insurer, authenticate a certificate, detect all fraud, provide legal advice, or guarantee that cover remains active. A qualified person should review rejected or high-risk cases and confirm coverage directly with the insurer.
