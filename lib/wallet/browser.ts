export type WalletProvider={request:(args:{method:string;params?:unknown[]})=>Promise<unknown>;on?:(event:string,listener:(value:unknown)=>void)=>void;removeListener?:(event:string,listener:(value:unknown)=>void)=>void};
export async function walletSnapshot(provider:WalletProvider,requestAccess=false) {
  const accounts=await provider.request({method:requestAccess?'eth_requestAccounts':'eth_accounts'});
  if(!Array.isArray(accounts)||typeof accounts[0]!=='string'||!/^0x[0-9a-fA-F]{40}$/.test(accounts[0]))throw new Error('No wallet account connected');
  const chain=await provider.request({method:'eth_chainId'});
  if(typeof chain!=='string'||!/^0x[0-9a-fA-F]+$/.test(chain)||BigInt(chain)!==BigInt(56))throw new Error('Switch your wallet to BNB Smart Chain (chain 56)');
  const balance=await provider.request({method:'eth_getBalance',params:[accounts[0],'latest']});
  if(typeof balance!=='string'||!/^0x[0-9a-fA-F]+$/.test(balance))throw new Error('Wallet returned an invalid balance');
  return {address:accounts[0],chainId:56,balanceWei:BigInt(balance).toString()};
}
