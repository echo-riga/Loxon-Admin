This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Image uploads

Admin image fields upload to Cloudinary through the server route at `/api/uploads/images`. Add these server-only values to `.env.local` or your deployment environment:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Restart the development server after changing environment variables. The app builds without these values; upload attempts return a clear configuration message until all three are present. Never expose `CLOUDINARY_API_SECRET` through a `NEXT_PUBLIC_` variable.

## Admin security

The dashboard requires an eight-hour signed login session. API mutations, uploads, and private submission lists require that session. Public forms, login, uploads, and chat are rate-limited through Upstash Redis.

Copy every value from `.env.example` into `.env.local` for development and into the matching Vercel project environments for deployment. Password hashes, session secrets, Redis tokens, database credentials, Cloudinary secrets, Resend keys, and Groq keys must remain server-only. Set `ALLOWED_ORIGINS` to exact comma-separated URLs without paths.

## Public content CDN cache

Successful GET responses for projects, project images, products/services, clients (including memberships and partners), and jobs are cached by Vercel's CDN for 60 seconds. Browser responses use `max-age=0, must-revalidate` so visitors check the server rather than reuse a fresh browser cache. CORS responses vary by `Origin`. No extra stale-while-revalidate window is configured.

Dashboard collection requests use `?fresh=1`, which returns `no-store` responses and bypasses the public CDN cache so edits are visible immediately in Admin. Public content may reflect edits after its existing CDN entry expires. Error responses, private submission lists, authentication, uploads, and POST/PUT/DELETE operations do not receive the public cache policy.

Redeploy Admin on Vercel to activate these headers. After deployment, repeat a public GET with the same Origin and inspect `x-vercel-cache` for `HIT` and `age` for its cache age. Local development verifies the headers but does not provide a Vercel CDN cache.
