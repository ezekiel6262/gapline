// Server/middleware only. Never import this module into a client component.
export function clerkConfigForHost(host: string | null) {
  const hostname=(host??'').toLowerCase().split(':')[0];
  if(hostname==='trygapline.xyz') {
    const publishableKey=process.env.NEXT_PUBLIC_GAPLINE_CUSTOM_CLERK_PUBLISHABLE_KEY;
    const secretKey=process.env.GAPLINE_CUSTOM_CLERK_SECRET_KEY;
    if(!publishableKey||!secretKey) throw new Error('Custom-domain authentication is not configured');
    return {publishableKey,secretKey,proxyUrl:undefined,authorizedParties:['https://trygapline.xyz']};
  }
  return {
    publishableKey:process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    proxyUrl:process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_')?'https://gapline-mu.vercel.app/__clerk':undefined,
    authorizedParties:process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_')?['https://gapline-mu.vercel.app']:undefined,
  };
}

export function clerkIssuerMatches(host:string|null,issuer:unknown) {
  const {publishableKey,proxyUrl}=clerkConfigForHost(host);
  if(!publishableKey||typeof issuer!=='string')return false;
  const encoded=publishableKey.replace(/^pk_(live|test)_/,'');
  let frontendApi:string;
  try{frontendApi=atob(encoded).replace(/\$$/,'');}catch{return false;}
  return issuer===`https://${frontendApi}`||(proxyUrl!==undefined&&issuer===proxyUrl);
}
