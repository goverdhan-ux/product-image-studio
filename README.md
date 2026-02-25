# Product Image Studio

AI-powered product image generation and enhancement app using Nano Banana Pro (Gemini 3 Pro Image).

## Features

### 1. Hero Image Creator
Generate professional, studio-quality product photos from your product images using AI.

### 2. Product on Bed Generator
Upload a bed image as the base, then upload a product (pillow, mattress protector, etc.) and AI will intelligently place and align the product on the bed.

### 3. Multi-Angle Generator
Generate consistent multiple camera angles from a single lifestyle image. Maintains visual consistency across all angles.

### 4. AI Prompt Assistant
Integrated AI analysis to generate optimized prompts for your product images.

## Getting Started

### Prerequisites
- Node.js 18+
- Nano Banana Pro API key
- OpenAI API key (optional, for prompt generation)

### Installation

```bash
npm install
```

### Configuration

Create a `.env.local` file:

```env
# Nano Banana Pro (Gemini) API Key
# Get from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key

# OpenAI API Key (optional)
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **AI:** Nano Banana Pro (Gemini 3 Pro Image), OpenAI GPT-4
- **Image Processing:** Sharp
- **Deployment:** Vercel

## License

MIT
