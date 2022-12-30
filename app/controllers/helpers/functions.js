const Web3 = require("web3");
const mongoose = require('mongoose');
const LogsDecoder = require('logs-decoder');
const http = require("http");
const https = require("https");
const logsDecoder = LogsDecoder.create()
const config = require("dotenv").config();
const { NFT, Collection, Category, Brand } = require("./../../models");
var web3 = new Web3(process.env.NETWORK_RPC_URL);
const ABI = require("./../../../abis/marketplace.json");
logsDecoder.addABI(ABI);
const CONTRACT_ADDRESS = '0x8026FEB064ef99d431CDC37a273fb7fADeC30D12';
const BlockchainConnect = require('./../../../blockchainconnect');
const chain = new BlockchainConnect();
const contract = chain.Contract(ABI, CONTRACT_ADDRESS);
const nftMetaBaseURL = process.env.NFT_META_BASE_URL;
const chainID = process.env.CHAIN_ID;

const options = {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
};
mongoose.connect(process.env.DB_URL, options)
    .then(() => console.log('Database conncted'))
    .catch((error) => { throw error; });
const helperFunctions = {};

helperFunctions.increaseNFTCount = async function (collectionID) {
    console.log("Helper Called", collectionID)
    Collection.findOne({ _id: mongoose.Types.ObjectId(collectionID) }, async function (err, resData) {
        if (err) {
            console.log("Error in Fetching Collection Data");
            return false;
        } else {
            // console.log("Data", resData)
            let nextID = resData.getNextID();
            let nftCountCol = resData.getNextNftCount();
            console.log("nftCountCol ", nftCountCol)
            resData.nextID = nextID;
            resData.nftCount = nftCountCol;
            resData.save();
            Brand.findOne({ _id: mongoose.Types.ObjectId(resData.brandID) }, async function (errBrands, resDataBrands) {
                if (errBrands) {
                    console.log("Error in Fetching Brands Data");
                } else {
                    let nftCountBrands = resDataBrands.getNextNftCount();
                    resDataBrands.nftCount = nftCountBrands;
                    resDataBrands.save();
                }
            });
            return true;
        }
    });
}

module.exports = helperFunctions;