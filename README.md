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
- OpenAI API key OR OAuth credentials (optional, for prompt generation)

### Installation

```bash
npm install
```

### Configuration

#### Option 1: OpenAI OAuth (Recommended)
1. Go to [OpenAI Platform Settings](https://platform.openai.com/settings/organization/oauth)
2. Create a new OAuth app with:
   - **Client name:** Product Image Studio
   - **Redirect URI:** `http://localhost:3000/api/auth/openai/callback`
   - **Scopes:** `openid email model`
3. Copy the Client ID and Secret

#### Option 2: OpenAI API Key (Fallback)
Get your API key from: https://platform.openai.com/api-keys

Create a `.env.local` file:

```env
# Nano Banana Pro (Gemini) API Key
# Get from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key

# OpenAI OAuth (Recommended)
NEXT_PUBLIC_OPENAI_CLIENT_ID=your_client_id
OPENAI_CLIENT_SECRET=your_client_secret
OPENAI_REDIRECT_URI=http://localhost:3000/api/auth/openai/callback

# OR OpenAI API Key (Fallback)
# OPENAI_API_KEY=your_openai_api_key
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## OAuth Setup for Production

For production deployment on Vercel:

1. Update your OAuth redirect URI to:
   ```
   https://your-app.vercel.app/api/auth/openai/callback
   ```

2. Add these environment variables in Vercel:
   - `NEXT_PUBLIC_OPENAI_CLIENT_ID`
   - `OPENAI_CLIENT_SECRET`
   - `OPENAI_REDIRECT_URI`
   - `GEMINI_API_KEY`

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **AI:** Nano Banana Pro (Gemini 3 Pro Image), OpenAI GPT-4
- **Authentication:** OAuth 2.0 + API Key fallback
- **Image Processing:** Sharp
- **Deployment:** Vercel

## License

MIT
