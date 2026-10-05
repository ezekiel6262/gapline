import { clerkMiddleware } from '@clerk/nextjs/server';
export default clerkMiddleware({proxyUrl:process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_') ? 'https://gapline-mu.vercel.app/api/clerk' : undefined});
export const config = { matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)','/(api|trpc)(.*)'] };
