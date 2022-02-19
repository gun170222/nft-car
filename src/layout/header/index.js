import React, { useState, useEffect } from "react";
import Web3 from "web3";
import Web3Modal from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import MenuItem from "../../components/item/menuitem";
import { menuList } from "./menu";
import Logo from '../../assets/images/logo.png'
import IcoMenu from '../../assets/icons/ic_menu.svg'
import { contractABI } from "../../contract-abi";
import { useAppContext } from "../../contexts/AppContext";
import { Modal } from "../../modal";

const Header = () => {
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  const context = useAppContext();

  useEffect(()=>{
    console.log(context.walletConnected);
    init();
  }, [])

  async function init() {
    if(typeof window.ethereum === 'undefined') {
      setMessage("Please install the MataMask");
      setOpen(true);
    } else {
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

  const [openMenu, setOpenMenu] = useState(false)
  return (
    <div className="absolute h-36 md:h-52 lg:h-60 flex justify-between items-center w-full px-10 lg:px-20 z-30">
      <img src={Logo} alt="logo" className="w-36 md:w-52 lg:w-73" />
      <div className="md:flex gap-4 hidden">
        <div className="flex gap-8">
          {menuList.map((menu, idx) => (
            <MenuItem menu={menu} key={idx} />
          ))}
        </div>
        <button className="border-app-primary border-2 text-app-primary px-4 py-1 lg:px-8 lg:py-3 rounded-full" onClick={() => { onConnect() }}>
          {context.walletConnected ? ( 
            "Connected: " +
            String(context.walletAddress).substring(0, 6) +
            "..." +
            String(context.walletAddress).substring(38)
          ) : (
            <span>Connect Wallet</span>
          )}
        </button>
      </div>
      <div className="flex md:hidden " onClick={() => setOpenMenu(!openMenu)}>
        <img src={IcoMenu} alt="menu" />
      </div>
      <div className={` fixed top-0 right-0 w-screen z-50 min-h-screen bg-black bg-opacity-90 transform shadow-lg shadow-white ${openMenu ? " -trasnlate-x-0" : " translate-x-full"} duration-200`}>
        <div className="h-36 flex bg-black items-center pr-10 justify-end" onClick={() => setOpenMenu(!openMenu)}>
          <p className="text-5xl cursor-pointer text-white">×</p>
        </div>
        <div className="w-full flex justify-center flex-col items-center gap-8 pt-10">
          <div className="flex gap-8 flex-col">
            {menuList.map((menu, idx) => (
              <MenuItem menu={menu} key={idx} className="text-2xl"/>
            ))}
          </div>
          <button className="border-app-primary border-2 text-app-primary px-4 py-1 lg:px-8 lg:py-3 rounded-full w-max text-2xl">Connect Wallet</button>
        </div>
      </div>
      <Modal open={ open } onClose={ () => setOpen(false) } content={content} message={message}/>
    </div>
  )
}



export default Header