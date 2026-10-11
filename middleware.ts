import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { clerkConfigForHost,clerkIssuerMatches } from '@/lib/clerk-server-config';
export default clerkMiddleware(async(auth,request)=>{
  const identity=await auth();
  if(identity.userId&&!clerkIssuerMatches(request.headers.get('host'),identity.sessionClaims?.iss))return NextResponse.json({error:'Invalid authentication issuer'},{status:401});
},request=>clerkConfigForHost(request.headers.get('host')));
export const config = { matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)','/(api|trpc)(.*)','/__clerk/:path*'] };
