import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import solc from 'solc';
import ganache from 'ganache';
import {BrowserProvider, ContractFactory, Wallet, AbiCoder, keccak256, getBytes, Signature, ZeroAddress} from 'ethers';

// Ephemeral in-process chain only. Never loads production keys or contacts BSC.
test('escrow deposits, signature boundaries, expiry and failed-transfer rollback', async () => {
  const mock = `pragma solidity ^0.8.24;
  contract Token {
    mapping(address=>uint) public balanceOf;
    mapping(address=>mapping(address=>uint)) public allowance;
    uint public mode;
    constructor(){balanceOf[msg.sender]=10000;}
    function setMode(uint m) external {mode=m;}
    function approve(address to,uint n) external returns(bool){allowance[msg.sender][to]=n;return true;}
    function transferFrom(address from,address to,uint n) external returns(bool){
      require(allowance[from][msg.sender]>=n);allowance[from][msg.sender]-=n;
      return move(from,to,n);
    }
    function transfer(address to,uint n) external returns(bool){return move(msg.sender,to,n);}
    function move(address from,address to,uint n) internal returns(bool){
      if(mode==1)return false;
      require(balanceOf[from]>=n);balanceOf[from]-=n;balanceOf[to]+=mode==2?n-1:n;return true;
    }
  }`;
  const compiled=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{
    'GiftEscrow.sol':{content:readFileSync(new URL('../contracts/GiftEscrow.sol',import.meta.url),'utf8')},
    'Token.sol':{content:mock}},settings:{evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}})));
  assert.deepEqual((compiled.errors??[]).filter(e=>e.severity==='error'),[]);
  const chain=ganache.provider({logging:{quiet:true},chain:{chainId:56},wallet:{totalAccounts:3}});
  try {
    const provider=new BrowserProvider(chain); provider.pollingInterval=10;
    const sender=await provider.getSigner(0), recipient=await provider.getSigner(1), stranger=await provider.getSigner(2);
    const deploy=async(file,name)=>{
      const artifact=compiled.contracts[file][name];
      const contract=await new ContractFactory(artifact.abi,artifact.evm.bytecode.object,sender).deploy();
      await contract.waitForDeployment();return contract;
    };
    const escrow=await deploy('GiftEscrow.sol','GiftEscrow'), token=await deploy('Token.sol','Token');
    const address=await escrow.getAddress(), tokenAddress=await token.getAddress(), receiver=await recipient.getAddress();
    const key=Wallet.createRandom();
    await (await token.approve(address,10000)).wait();
    const now=Number((await provider.getBlock('latest')).timestamp), expiry=now+3600;
    await assert.rejects(escrow.deposit.staticCall(tokenAddress,0,key.address,expiry));
    await assert.rejects(escrow.deposit.staticCall(ZeroAddress,100,key.address,expiry));
    await assert.rejects(escrow.deposit.staticCall(tokenAddress,100,ZeroAddress,expiry));
    await assert.rejects(escrow.deposit.staticCall(tokenAddress,100,key.address,now));
    await assert.rejects(escrow.deposit.staticCall(tokenAddress,100,key.address,now+91*86400));
    await (await escrow.deposit(tokenAddress,100,key.address,expiry)).wait();
    assert.equal(await token.balanceOf(address),100n);
    const sign=async(id,to,chainId=56,contract=address)=>Signature.from(await key.signMessage(getBytes(keccak256(
      AbiCoder.defaultAbiCoder().encode(['uint256','address','uint256','address'],[chainId,contract,id,to])))));
    const claim=async(sig,to=receiver,id=0)=>escrow.claim.staticCall(id,to,sig.v,sig.r,sig.s);
    await assert.rejects(claim(await sign(0,receiver,1)));
    await assert.rejects(claim(await sign(0,receiver,56,tokenAddress)));
    await assert.rejects(claim(await sign(1,receiver)));
    await assert.rejects(claim(await sign(0,await stranger.getAddress())));
    await assert.rejects(escrow.reclaim.staticCall(0));
    const signature=await sign(0,receiver);
    await (await token.setMode(1)).wait();
    // Broadcast with explicit gas to verify reverted execution rolls back settlement.
    await assert.rejects(async()=>{await (await escrow.claim(0,receiver,signature.v,signature.r,signature.s,{gasLimit:300000})).wait();});
    assert.equal((await escrow.gifts(0)).settled,false);
    await (await token.setMode(0)).wait();
    await (await escrow.claim(0,receiver,signature.v,signature.r,signature.s)).wait();
    assert.equal(await token.balanceOf(receiver),100n);
    await assert.rejects(claim(signature));
    await (await token.setMode(2)).wait();
    await assert.rejects(async()=>{await (await escrow.deposit(tokenAddress,100,key.address,expiry,{gasLimit:300000})).wait();});
    assert.equal(await escrow.nextId(),1n);
    assert.equal(await token.balanceOf(address),0n);
    await (await token.setMode(0)).wait();
    await (await escrow.deposit(tokenAddress,200,key.address,expiry)).wait();
    await chain.request({method:'evm_increaseTime',params:[3601]});
    await chain.request({method:'evm_mine',params:[]});
    await assert.rejects(claim(await sign(1,receiver),receiver,1));
    await assert.rejects(escrow.connect(stranger).reclaim.staticCall(1));
    await (await escrow.reclaim(1)).wait();
    assert.equal(await token.balanceOf(address),0n);
    assert.equal(await token.balanceOf(await sender.getAddress()),9900n);
    await assert.rejects(escrow.reclaim.staticCall(1));
  } finally {await chain.disconnect();}
});
