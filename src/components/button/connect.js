import React, { useEffect, useState } from "react";
import { useAppContext } from '../../contexts/AppContext';
import Web3 from 'web3';
import Web3Modal from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { contractABI } from "../../contract-abi";
import { Modal } from "../../modal";

export const WalletConnectButton = (props) =>{
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  const context = useAppContext();

  useEffect(()=>{
    init();
  }, [])

  function init() {
    console.log(context.web3Modal);
    if(context.web3Modal === null ){ 
      const providerOptions = {
        walletconnect: {
          package: WalletConnectProvider,
          display: {
            name: "WalletConnect",
            description: ""
          },
          options: {
            rpc: {
              56: 'https://bsc-dataseed.binance.org/'
            },
            network:'binance'
          }
        },
      };
      let web3_Modal = new Web3Modal({
        cacheProvider: false, // optional
        providerOptions, // required
        disableInjectedProvider: false, // optional. For MetaMask / Brave / Opera.
        theme: {
          background: "rgb(39, 49, 56)",
          main: "rgb(199, 199, 199)",
          secondary: "rgb(136, 136, 136)",
          border: "rgba(195, 195, 195, 0.14)",
          hover: "rgb(16, 26, 32)"
        }
      });
  
      context.setWeb3Modal(web3_Modal);
    }
  }

  async function fetchAccountData() {
    let contractAddress = '0x7c888940ec0d635ee98b9633c6a9fc80b2e3d091';

    let web3 = new Web3(context.provider);
    context.setWeb3(web3);
  
    const chainId = await web3.eth.getChainId();
    if(chainId === 43114) {
      const myContract = new web3.eth.Contract(contractABI, contractAddress);

      const accounts = await web3.eth.getAccounts();

      context.setChainId(chainId);
  
      const tokenBalance = await myContract.methods.balanceOf(accounts[0]).call(); 
      const totalSupply = await myContract.methods.totalSupply().call();

      const ownerAddresses = [];

      for(let i=0; i<totalSupply; i++) {
        const tokenId = await myContract.methods.tokenByIndex(i).call();
        const address = await myContract.methods.ownerOf(tokenId).call();

        if(ownerAddresses.indexOf(address) === -1) {
          ownerAddresses.push(address);
        }
      }

      context.setBalance(tokenBalance);
      context.setTotalBalance(ownerAddresses.length);
      context.setAddresses(ownerAddresses);
  
      context.setWallet(accounts[0]);
    } else {
      setMessage("Please select the Avalanche Network");
      setOpen(true);
    }
  }

  async function refreshAccountData() {
    console.log("refreshAccountData");
    await fetchAccountData(context.provider);
  }

  async function onConnect() {
    if(typeof window.ethereum === 'undefined') {
      setMessage("Please install the MataMask");
      setOpen(true);
    } else {
      console.log(context.walletConnected);
      if(!context.walletConnected) {
        try {
          context.provider = await context.web3Modal.connect();
        } catch(e) {
          console.log("Could not get a wallet connection", e);
          return;
        }
        context.setProvider(context.provider);
        // Subscribe to accounts change
        context.provider.on("accountsChanged", (accounts) => {
          fetchAccountData();
        });
        console.log('provider chain changed')
        // Subscribe to chainId change
        context.provider.on("chainChanged", (chainId) => {
          fetchAccountData();
        });
        console.log('provider network changed')
        // Subscribe to networkId change
        context.provider.on("networkChanged", (networkId) => {
          fetchAccountData();
        });
        context.setWalletConnected(true);
        await refreshAccountData();
      } else {
        context.setWalletConnected(!context.walletConnected);
        await Disconnect();
      }
    }
  }

  async function Disconnect() {
    if(context.provider.close) {
      await context.provider.close();
  
      await context.web3Modal.clearCachedProvider();
      context.setProvider(null);
    }
    context.setWalletConnected(false);
  }

  return(
    <>
      <button className='rounded-full border-2 border-app-primary px-8 py-2 text-app-primary w-max text-xl' onClick={() => { onConnect() }}>
        {context.walletConnected ? ( 
          "Connected: " +
          String(context.walletAddress).substring(0, 6) +
          "..." +
          String(context.walletAddress).substring(38)
        ) : (
          <span>Connect Wallet</span>
        )}
      </button>
      <Modal open={ open } onClose={ () => setOpen(false) } content={content} message={message}/>
    </>
  )
}