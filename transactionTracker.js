const Web3 = require("web3");
const mongoose = require('mongoose');
const LogsDecoder = require('logs-decoder');
const http = require("http");
const https = require("https");
const logsDecoder = LogsDecoder.create()
const config = require("dotenv").config();
const { NFT, Collection, User, Bid, Order, History, Transaction } = require("./app/models");
// TODO: Change the URL to MainNet URL
var web3 = new Web3(process.env.NETWORK_RPC_URL);
const ABI = require("./abis/marketplace.json")
logsDecoder.addABI(ABI);
const CONTRACT_ADDRESS = '0x6EA10E384e1e1E7Aa4d81242539a2A7A77F030D5';
const BlockchainConnect = require('./blockchainconnect');
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
  .catch((error) => {
    throw error;
  });

const helperFunctions = require("./app/controllers/helpers/functions");

async function checkCollection() {
  try {
    console.log("Checking for Collection Hash...");
    Collection.find({ hashStatus: 0 },
      async function (err, resData) {
        if (err) {
        } else {
          if (resData.length > 0) {
            for (const data of resData) {
              let dataID = await data?._id;
              let dataHash = await data?.hash;
              if (dataHash !== undefined && dataHash !== "0x0") {
                console.log("Collection Hash is", dataHash)
                let receipt = await web3.eth.getTransactionReceipt(dataHash);
                console.log("receipt is---->", receipt)
                if (receipt === null) {
                  return;
                } else if (receipt.status === false) {
                  let updateData = { hashStatus: 2 };
                  await Collection.findByIdAndUpdate(
                    dataID,
                    updateData,
                    (err, resData) => {
                      if (resData) {
                        console.log("Updated Collection record", dataID)
                      }
                    }
                  ).catch((e) => {
                    return;
                  });
                } else if (receipt.status === true) {
                  let contractAddress = receipt.logs[0].address;
                  let updateData = { hashStatus: 1, contractAddress: contractAddress };
                  await Collection.findByIdAndUpdate(
                    dataID,
                    updateData,
                    (err, resData) => {
                      if (resData) {
                        console.log("Updated Collection record", dataID)
                      }
                    }
                  ).catch((e) => {
                    return;
                  });
                }
              }
            }
          }
        }
      })
  } catch (error) {
    console.log(error);
  }
}

async function checkNFTs() {
  try {
    console.log("Checking for NFT Hash...");
    NFT.find({ hashStatus: 0 },
      async function (err, resData) {
        if (err) {
        } else {
          if (resData.length > 0) {
            for (const data of resData) {
              let dataID = await data?._id;
              let dataHash = await data?.hash;
              if (dataHash !== undefined && dataHash !== "0x0") {
                console.log("NFT Hash is", dataHash)
                let receipt = await web3.eth.getTransactionReceipt(dataHash);
                if (receipt === null) {
                  return;
                } else if (receipt.status === false) {
                  let updateData = { hashStatus: 2 };
                  await NFT.findByIdAndUpdate(
                    dataID,
                    updateData,
                    (err, resData) => {
                      if (resData) {
                        console.log("Updated NFT record", dataID)
                      }
                    }
                  ).catch((e) => {
                    return;
                  });
                } else if (receipt.status === true) {
                  let updateData = { hashStatus: 1 };
                  await NFT.findByIdAndUpdate(
                    dataID,
                    updateData,
                    (err, resData) => {
                      if (resData) {
                        console.log("Updated NFT record", dataID)
                      }
                    }
                  ).catch((e) => {
                    return;
                  });
                }
              }
            }
          }
        }
      })
  } catch (error) {
    console.log(error);
  }
}

async function checkOrders() {
  try {
    console.log("Checking for Order Hash...");
    let currentTime = new Date().getTime();
    let minutes = 2 * 60 * 1000;
    let newDateTime = new Date(currentTime + minutes);
    Order.find({ hashStatus: 0 },
      async function (err, resData) {
        if (err) {
        } else {
          if (resData.length > 0) {
            for (const data of resData) {
              let dataID = await data?._id;
              let dataHash = await data?.hash;
              let dataSalesType = await data?.salesType;
              let dataNftID = await data?.nftID;
              let dataSellerID = await data?.sellerID;
              let dataPrice = await data?.price;
              let dataPaymentToken = await data?.paymentToken

              if (dataHash !== undefined && dataHash !== "0x0" && dataHash !== "" && dataHash?.length >= 66) {
                console.log("Order Hash", dataHash);
                web3.eth.getTransactionReceipt(dataHash, async function (e, receipt) {
                  if (receipt === null) {
                    console.log("Rec Null")
                    return;
                  } else if (receipt.status === false) {
                    console.log("Inside false");
                    let updateData = { hashStatus: 2 };
                    await Order.findByIdAndUpdate(
                      dataID,
                      updateData,
                      (err, resData) => {
                        if (resData) {
                          console.log("Updated Order record", dataID)
                        }
                      }
                    ).catch((e) => {
                      return;
                    });
                  } else if (receipt.status === true) {

                    console.log("Inside True");
                    const decodedLogs = logsDecoder.decodeLogs(receipt.logs);


                    let saleData = [];

                    if (dataSalesType === 1) {
                      if (decodedLogs[7]?.events !== undefined && decodedLogs[7]?.events.length === 6) {
                        saleData = decodedLogs[7]?.events;
                      }
                      if (decodedLogs[11]?.events !== undefined && decodedLogs[11]?.events.length === 6) {
                        saleData = decodedLogs[11]?.events;
                      }
                    } else {
                      if (decodedLogs[7]?.events !== undefined && decodedLogs[7]?.events.length === 6) {
                        saleData = decodedLogs[7]?.events;
                      }
                      if (decodedLogs[11]?.events !== undefined && decodedLogs[11]?.events.length === 6) {
                        saleData = decodedLogs[11]?.events;
                      }
                    }
                    console.log("saleData CheckOrder after", saleData)

                    let orderID = dataID;
                    let nftID = dataNftID;
                    let buyer = "";
                    let seller = "";
                    let amount = "";
                    let bidsamount = "";
                    let quantity = "";
                    try {
                      console.log("saleData CheckOrder", saleData)
                      for (const sales of saleData) {
                        if (sales.name === "buyer") {
                          buyer = sales.value;
                        }
                        if (sales.name === "seller") {
                          seller = sales.value;
                        }
                        if (sales.name === "tokenAddress") {
                          tokenAddress = sales.value;
                        }
                        if (sales.name === "tokenId") {
                          tokenId = sales.value;
                        }
                        if (sales.name === "amount") {
                          amount = sales.value;
                          bidsamount = sales.value;
                        }
                        if (sales.name === "quantity") {
                          quantity = sales.value;
                        }
                      }
                      console.log("Order---->>", seller + " " + buyer, amount)

                      Order.findById(orderID, async (err, orderData) => {
                        console.log("order dataaaa--->> ", err, orderData)
                        if (err) {
                          return;
                        }
                        if (!orderData) {
                          return;
                        } else {
                          let transaction = new Transaction({
                            nftID: orderData.nftID,
                            collectionAddress: web3.utils.toChecksumAddress(orderData.collectionAddress),
                            sellerID: orderData.sellerID,
                            quantity_sold: parseInt(quantity),
                            price: amount,
                            tokenID: orderData.tokenID,
                            paymentToken: orderData.paymentToken,
                            hash: orderData.hash,
                            createdBy: orderData.createdBy,
                          });
                          transaction.save(async function (saveerr, transactionSaveResult) {
                            if (saveerr) {
                              console.log("Created NFT error", saveerr);
                            }
                            if (transactionSaveResult) {
                              console.log("Created NFT Success", transactionSaveResult);
                            }
                          });

                          console.log("quantity", quantity)
                          await Order.updateOne(
                            { _id: orderID },
                            { $set: { quantity_sold: parseInt(quantity) } },
                            (err) => {
                              return;
                            }
                          );

                          await NFT.findOne({ _id: mongoose.Types.ObjectId(nftID) },
                            async (err, checkNFT) => {
                              if (err) {
                                console.log("Error on Query", err)
                                return false;
                              }
                              if (!checkNFT) {
                                console.log("Error on Fetching NFTs")
                                return false;
                              }
                              if (checkNFT?.type === 1) {
                                let OwnedBy = [];
                                OwnedBy.push({
                                  address: buyer.toLowerCase(),
                                  quantity: 1,
                                });
                                let updateNFTData = { ownedBy: OwnedBy }
                                await NFT.findOneAndUpdate({ _id: mongoose.Types.ObjectId(nftID) },
                                  { $set: updateNFTData }, { new: true }, async function (err, updateNFT) { });
                              } else {
                                let NFTData = await NFT.find({
                                  _id: mongoose.Types.ObjectId(nftID),
                                  "ownedBy.address": seller.toLowerCase(),
                                }).select("ownedBy -_id");
                                // console.log("NFTData-------->", NFTData);
                                let currentQty;
                                if (NFTData.length > 0) {
                                  currentQty = NFTData[0].ownedBy.find(
                                    (o) => o.address === seller.toLowerCase()
                                  ).quantity;
                                }
                                let boughtQty = parseInt(quantity);
                                console.log("boughtQty", boughtQty)
                                let leftQty = parseInt(currentQty) - parseInt(boughtQty);
                                console.log("leftQty", leftQty);
                                if (leftQty < 1) {
                                  console.log("leftQty is less than 1");
                                  await NFT.findOneAndUpdate(
                                    { _id: mongoose.Types.ObjectId(nftID) },
                                    {
                                      $pull: {
                                        ownedBy: { address: seller },
                                      },
                                    }
                                  ).catch((e) => {
                                    return;
                                  });
                                } else {
                                  console.log("leftQty is greater than 1");
                                  await NFT.findOneAndUpdate(
                                    {
                                      _id: mongoose.Types.ObjectId(nftID),
                                      "ownedBy.address": seller,
                                    },
                                    {
                                      $set: {
                                        "ownedBy.$.quantity": parseInt(leftQty),
                                      },
                                    }
                                  ).catch((e) => {
                                    return;
                                  });
                                }
                                console.log("Crediting Buyer");
                                let subDocId = await NFT.exists({
                                  _id: mongoose.Types.ObjectId(nftID),
                                  "ownedBy.address": buyer,
                                });
                                if (subDocId) {
                                  let NFTData_Buyer = await NFT.findOne({
                                    _id: mongoose.Types.ObjectId(nftID),
                                    "ownedBy.address": buyer,
                                  }).select("ownedBy -_id");
                                  console.log("NFTData_Buyer-------->", NFTData_Buyer);
                                  console.log(
                                    "Quantity found for buyers",
                                    NFTData_Buyer.ownedBy.find(
                                      (o) => o.address === buyer.toLowerCase()
                                    ).quantity
                                  );
                                  currentQty = NFTData_Buyer.ownedBy.find(
                                    (o) => o.address === buyer.toLowerCase()
                                  ).quantity
                                    ? parseInt(
                                      NFTData_Buyer.ownedBy.find(
                                        (o) => o.address === buyer.toLowerCase()
                                      ).quantity
                                    )
                                    : 0;
                                  boughtQty = quantity;
                                  let ownedQty = parseInt(currentQty) + parseInt(boughtQty);
                                  console.log("777");
                                  console.log("ownedQty", ownedQty);
                                  console.log("buyer", buyer);
                                  await NFT.findOneAndUpdate(
                                    {
                                      _id: mongoose.Types.ObjectId(nftID),
                                      "ownedBy.address": buyer,
                                    },
                                    {
                                      $set: {
                                        "ownedBy.$.quantity": parseInt(ownedQty),
                                      },
                                    },
                                    { upsert: true, runValidators: true }
                                  ).catch((e) => {
                                    console.log("Error1", e.message);
                                  });
                                } else {
                                  console.log("Subdocument Id not found");
                                  let dataToadd = {
                                    address: buyer,
                                    quantity: parseInt(quantity),
                                  };
                                  await NFT.findOneAndUpdate(
                                    { _id: mongoose.Types.ObjectId(nftID) },
                                    { $addToSet: { ownedBy: dataToadd } },

                                    { upsert: true }
                                  );
                                  console.log("wasn't there but added");
                                }
                              }
                            });

                          await NFT.findOneAndUpdate(
                            { _id: mongoose.Types.ObjectId(nftID) },
                            {
                              $set: {
                                quantity_minted: Number(quantity),
                              },
                            }
                          ).catch((e) => {
                            return;
                          });

                        }
                      });

                      if (dataSalesType === 1) {
                        let sellerID = "";
                        let buyerID = "";
                        User.findOne(
                          {
                            walletAddress: _.toChecksumAddress(seller)?.toLowerCase(),
                          },
                          (err, user) => {
                            if (err) {
                              return;
                            }
                            if (!user) {
                              return;
                            }
                            sellerID = user._id;
                            User.findOne(
                              {
                                walletAddress: _.toChecksumAddress(buyer)?.toLowerCase(),
                              },
                              (err, user2) => {
                                if (err) {
                                  return;
                                }
                                if (!user2) {
                                  return;
                                }
                                buyerID = user2._id;
                                Bid.findOneAndUpdate(
                                  {
                                    orderID: mongoose.Types.ObjectId(orderID),
                                    nftID: mongoose.Types.ObjectId(nftID),
                                    owner: mongoose.Types.ObjectId(sellerID),
                                    bidderID: mongoose.Types.ObjectId(buyerID),
                                  },
                                  { bidStatus: "Accepted" },
                                  function (err, acceptBid) {
                                    if (err) {
                                      return;
                                    } else {
                                      console.log("Bid Accepted ");
                                      return;
                                    }
                                  });
                                Bid.deleteMany({
                                  orderID: mongoose.Types.ObjectId(orderID),
                                  nftID: mongoose.Types.ObjectId(nftID),
                                  owner: mongoose.Types.ObjectId(sellerID),
                                  bidStatus: "Bid",
                                }).then(function () {
                                  console.log("Bid Data deleted");
                                }).catch(function (error) {
                                  console.log(error);
                                });
                              }
                            );
                          }
                        );
                      }

                      let updateData = { hashStatus: 1 };
                      console.log("start")
                      await Order.findByIdAndUpdate(
                        orderID,
                        updateData,
                        async (err, resData) => {
                          console.log("resData", resData)
                          if (resData) {
                            console.log("Updated Order record", orderID)
                            await User.findOne({ walletAddress: _.toChecksumAddress(buyer) },
                              async (err, user) => {
                                if (err) {
                                  return;
                                }
                                if (!user) {
                                  return;
                                }
                                await Bid.deleteMany({ nftID: mongoose.Types.ObjectId(nftID), bidderID: mongoose.Types.ObjectId(user._id), bidStatus: "MakeOffer" }).then(function () {
                                  console.log("Bid Offer Data Deleted UpdateOrder - order API");
                                }).catch(function (error) {
                                  console.log("Error in Bid Offer Data Deleted UpdateOrder - order API", error);
                                });
                                await Bid.updateMany({ nftID: mongoose.Types.ObjectId(nftID), bidStatus: "MakeOffer" }, { owner: mongoose.Types.ObjectId(user._id) }).then(function () {
                                  console.log("Bid Offer Data Owner Updated UpdateOrder - order API");
                                }).catch(function (error) {
                                  console.log("Error in Bid Offer Data Owner Updated UpdateOrder - order API", error);
                                });
                                let buyerID = user._id;
                                let sellerID = dataSellerID;
                                let action = "";
                                let price = "";
                                let type = "";
                                if (dataSalesType === 1) {
                                  action = "Bid";
                                  price = bidsamount;
                                  type = "Accepted";
                                } else {
                                  action = "Sold";
                                  price = dataPrice;
                                }
                                console.log("after user.findone")
                                let paymentToken = dataPaymentToken;
                                let createdBy = "";
                                if (dataSalesType === 1) {
                                  createdBy = user._id;
                                } else {
                                  createdBy = dataSellerID;
                                }

                                console.log("before new history")

                                const insertData = new History({
                                  nftID: nftID,
                                  buyerID: buyerID,
                                  sellerID: sellerID,
                                  action: action,
                                  type: type,
                                  paymentToken: paymentToken,
                                  price: price,
                                  quantity: quantity,
                                  createdBy: createdBy,
                                  byCron: true
                                });
                                if (dataHash === "" || dataHash === undefined) {
                                  insertData.hash = "";
                                  console.log("Insert Data History is " + insertData);
                                  insertData.save().then(async (insresult) => {
                                    console.log("Insert Data History is " + insresult);
                                  }).catch((error) => {
                                    console.log("Error in creating Record", error);
                                  });
                                } else {
                                  insertData.hash = dataHash;
                                  await History.findOne({ hash: dataHash },
                                    async (err, record) => {
                                      if (err) {
                                        console.log("Error in fetching History Records ", err)
                                      }
                                      if (!record) {
                                        insertData.save().then(async (insresult) => {
                                          console.log("Insert Data History is " + insresult);
                                        }).catch((error) => {
                                          console.log("Error in creating Record", error);
                                        });
                                      } else {
                                        let updateHistoryData = {
                                          nftID: nftID,
                                          buyerID: buyerID,
                                          sellerID: sellerID,
                                          action: action,
                                          type: type,
                                          paymentToken: paymentToken,
                                          price: price,
                                          quantity: quantity,
                                          hash: dataHash,
                                          createdBy: createdBy,
                                          byCron: true
                                        }
                                        await History.findOneAndUpdate(
                                          { _id: mongoose.Types.ObjectId(record._id) },
                                          { $set: updateHistoryData }, { new: true }, function (err, updateHistory) {
                                            if (err) {
                                              console.log("Error in Updating History" + err);
                                            } else {
                                              console.log("History Updated: ", updateHistory);
                                            }
                                          }
                                        );
                                      }
                                    }
                                  )
                                }
                              });
                          }
                        }
                      ).catch((e) => {
                        return;
                      });
                    } catch (error) {
                      console.log("Error in Processing - CheckOrder API", error)
                      return;
                    }

                    await Order.deleteMany({ _id: mongoose.Types.ObjectId(orderID) }).then(function () {
                      console.log("Order Data Deleted Cronjon");
                    }).catch(function (error) {
                      console.log("Error in Order Data Deleted Cronjon", error);
                    });
                    await Bid.deleteMany({ orderID: mongoose.Types.ObjectId(orderID), bidStatus: "Bid", }).then(function () {
                      console.log("Order Bid Deleted Cronjon");
                    }).catch(function (error) {
                      console.log("Error in Bid Data Deleted Cronjon", error);
                    });

                    await User.findOne({ walletAddress: _.toChecksumAddress(buyer)?.toLowerCase() },
                      async (err, checkUser) => {
                        if (err) {
                          console.log("Error in Finding Bidder ID in User Table Cronjon ", err);
                        }
                        if (!checkUser) {
                          console.log("Error in Bid Offer Data Deleted UpdateOrder Cronjon", error);
                        } else {
                          await Bid.deleteMany({ nftID: mongoose.Types.ObjectId(nftID), bidderID: mongoose.Types.ObjectId(checkUser._id), bidStatus: "MakeOffer" }).then(function () {
                            console.log("Bid Offer Data Deleted UpdateOrder Cronjon");
                          }).catch(function (error) {
                            console.log("Error in Bid Offer Data Deleted UpdateOrder Cronjon", error);
                          });
                          await Bid.updateMany({ nftID: mongoose.Types.ObjectId(nftID), bidStatus: "MakeOffer" }, { owner: mongoose.Types.ObjectId(checkUser._id) }).then(function () {
                            console.log("Bid Offer Data Owner Updated UpdateOrder Cronjon");
                          }).catch(function (error) {
                            console.log("Error in Bid Offer Data Owner Updated UpdateOrder Cronjon", error);
                          });
                        }
                      }
                    );
                  }
                })
              }
            }
          }
        }
      })
    console.log("updated through cron")
  } catch (error) {
    console.log("Error is", error);
  }
}

async function checkOffers() {
  try {
    console.log("Checking for Offer Hash...");
    let currentTime = new Date().getTime();
    let minutes = 2 * 60 * 1000;
    let newDateTime = new Date(currentTime + minutes);
    Bid.find({ hashStatus: 0, bidStatus: "MakeOffer" },
      async function (err, resData) {
        if (err) {
        } else {
          if (resData.length > 0) {
            for (const data of resData) {
              let dataID = await data?._id;
              let dataHash = await data?.hash;
              let dataNftID = await data?.nftID;
              let dataOwner = await data?.owner;
              let dataPaymentToken = await data?.paymentToken;
              let dataPrice = await data?.bidPrice;
              let dataBidderID = await data?.bidderID;
              let dataHashStatus = await data?.hashStatus

              if (dataHash !== undefined && dataHash !== "0x0" && dataHashStatus !== 1) {
                console.log("Offer Hash", dataHash);

                web3.eth.getTransactionReceipt(dataHash, async function (e, receipt) {
                  if (receipt === null) {
                    console.log("Rec Null")
                    return;
                  } else if (receipt.status === false) {
                    let updateData = { hashStatus: 2 };
                    await Bid.findByIdAndUpdate(
                      dataID,
                      updateData,
                      (err, resData) => {
                        if (resData) {
                          console.log("Updated Bid record", dataID)
                        }
                      }
                    ).catch((e) => {
                      return;
                    });
                  } else if (receipt.status === true) {

                    const decodedLogs = logsDecoder.decodeLogs(receipt.logs);
                    let index = 0;
                    for (let i = 0; i < decodedLogs?.length; i++) {
                      if (decodedLogs[i]?.events?.length === 6) {
                        index = i
                        break;
                      }
                    }
                    console.log("decoded---", decodedLogs, index)
                    let saleData = decodedLogs[index].events;
                    console.log("saleData in offer", saleData)
                    let bidID = dataID;
                    let nftID = dataNftID;
                    let owner = dataOwner;
                    let buyer = "";
                    let seller = "";
                    let tokenAddress = "";
                    let tokenId = "";
                    let amount = "";
                    let quantity = "";
                    try {
                      console.log("here....11")
                      for (const sales of saleData) {
                        if (sales.name === "buyer") {
                          buyer = sales.value;
                        }
                        if (sales.name === "seller") {
                          seller = sales.value;
                        }
                        if (sales.name === "tokenAddress") {
                          tokenAddress = sales.value;
                        }
                        if (sales.name === "tokenId") {
                          tokenId = sales.value;
                        }
                        if (sales.name === "amount") {
                          amount = sales.value;
                        }
                        if (sales.name === "quantity") {
                          quantity = sales.value;
                        }
                      }
                      console.log("here....22")
                      console.log(web3.utils.toChecksumAddress(tokenAddress))
                      let transaction = new Transaction({
                        nftID: dataNftID,
                        collectionAddress: web3.utils.toChecksumAddress(tokenAddress),
                        sellerID: dataOwner,
                        quantity_sold: parseInt(quantity),
                        price: amount,
                        tokenID: tokenId,
                        paymentToken: dataPaymentToken,
                        hash: dataHash,
                      });
                      console.log("here....33")
                      transaction.save(async function (saveerr, transactionSaveResult) {
                        if (saveerr) {
                          console.log("Created NFT error", saveerr);
                        }
                        if (transactionSaveResult) {
                          console.log("Created NFT Success", transactionSaveResult);
                        }
                      });

                      let boughtQty = parseInt(quantity);
                      console.log("boughtQty", boughtQty)
                      console.log("seller", seller, " buyer ", buyer, " NFT ", nftID);

                      await NFT.findOne({ _id: mongoose.Types.ObjectId(nftID) },
                        async (err, checkNFT) => {
                          if (err) {
                            console.log("Error on Query")
                            return false;
                          }
                          if (!checkNFT) {
                            console.log("Error on Fetching NFTs")
                            return false;
                          }
                          if (checkNFT?.type === 1) {
                            let OwnedBy = [];
                            OwnedBy.push({
                              address: buyer.toLowerCase(),
                              quantity: 1,
                            });
                            let updateNFTData = { ownedBy: OwnedBy }
                            await NFT.findOneAndUpdate({ _id: mongoose.Types.ObjectId(nftID) },
                              { $set: updateNFTData }, { new: true }, async function (err, updateNFT) { });
                          } else {

                            //deduct previous owner
                            let _NFT = await NFT.find({ _id: mongoose.Types.ObjectId(nftID), "ownedBy.address": seller }).select("ownedBy -_id");
                            console.log("_NFT-------->", _NFT);
                            let currentQty;
                            if (_NFT.length > 0)
                              currentQty = _NFT[0].ownedBy.find((o) => o.address === seller.toLowerCase()).quantity;
                            console.log("currentQty", currentQty)

                            let leftQty = parseInt(currentQty) - parseInt(boughtQty);
                            console.log("leftQty", leftQty)
                            if (leftQty < 1) {
                              await NFT.findOneAndUpdate(
                                { _id: mongoose.Types.ObjectId(nftID) },
                                {
                                  $pull: {
                                    ownedBy: { address: seller },
                                  },
                                }
                              ).catch((e) => {
                                console.log("Error1", e.message);
                                return;
                              });
                            } else {
                              console.log("leftQty", leftQty)
                              await NFT.findOneAndUpdate(
                                {
                                  _id: mongoose.Types.ObjectId(nftID),
                                  "ownedBy.address": seller,
                                },
                                {
                                  $set: {
                                    "ownedBy.$.quantity": parseInt(leftQty),
                                  },
                                }
                              ).catch((e) => {
                                console.log("Error2", e.message);
                                return;
                              });
                            }
                            //Credit the buyer
                            console.log("Crediting Buyer");
                            let subDocId = await NFT.exists({
                              _id: mongoose.Types.ObjectId(nftID),
                              "ownedBy.address": buyer,
                            });
                            if (subDocId) {
                              console.log("Subdocument Id", subDocId);
                              let NFTNewData = await NFT.findOne({
                                _id: mongoose.Types.ObjectId(nftID),
                                "ownedBy.address": buyer,
                              }).select("ownedBy -_id");
                              console.log("NFTNewData-------->", NFTNewData);
                              console.log(
                                "Quantity found for buyers",
                                NFTNewData.ownedBy.find((o) => o.address === buyer.toLowerCase())
                                  .quantity
                              );

                              currentQty = NFTNewData.ownedBy.find(
                                (o) => o.address === buyer.toLowerCase()
                              ).quantity
                                ? parseInt(
                                  NFTNewData.ownedBy.find(
                                    (o) => o.address === buyer.toLowerCase()
                                  ).quantity
                                )
                                : 0;

                              let ownedQty = parseInt(currentQty) + parseInt(boughtQty);
                              await NFT.findOneAndUpdate(
                                {
                                  _id: mongoose.Types.ObjectId(nftID),
                                  "ownedBy.address": buyer,
                                },
                                {
                                  $set: {
                                    "ownedBy.$.quantity": parseInt(ownedQty),
                                  },
                                },
                                { upsert: true, runValidators: true }
                              ).catch((e) => {
                                console.log("Error1", e.message);
                              });
                            } else {
                              console.log("Subdocument Id not found");
                              let dataToadd = {
                                address: buyer,
                                quantity: parseInt(boughtQty),
                              };
                              await NFT.findOneAndUpdate(
                                { _id: mongoose.Types.ObjectId(nftID) },
                                { $addToSet: { ownedBy: dataToadd } },
                                { upsert: true }
                              );
                              console.log("wasn't there but added");
                            }
                          }
                        });
                    } catch (e) {
                      console.log("error", e)
                      return
                    }

                    await Bid.findOneAndUpdate(
                      {
                        _id: mongoose.Types.ObjectId(bidID),
                      },
                      { bidStatus: "Accepted" },
                      function (err, acceptBid) {
                        if (err) {
                          console.log("Error in Accepting Offer" + err);
                        } else {
                          console.log("Offer Accepted : ", acceptBid);
                        }
                      }
                    );

                    await Bid.deleteMany({
                      owner: mongoose.Types.ObjectId(owner),
                      nftID: mongoose.Types.ObjectId(nftID),
                      bidStatus: "Bid",
                    }).then(function () {
                      // console.log("Data deleted");
                    }).catch(function (error) {
                      console.log(error);
                    });

                    await User.findOne({ walletAddress: _.toChecksumAddress(buyer)?.toLowerCase() },
                      async (err, checkUser) => {
                        if (err) {
                          console.log("Error in Finding Bidder ID in User Table Cronjon 1", err);
                        }
                        if (!checkUser) {
                          console.log("Error in Bid Offer Data Deleted UpdateOrder Cronjon 1", error);
                        } else {
                          await Bid.deleteMany({ nftID: mongoose.Types.ObjectId(nftID), bidderID: mongoose.Types.ObjectId(checkUser._id), bidStatus: "MakeOffer" }).then(function () {
                            console.log("Bid Offer Data Deleted UpdateOrder Cronjon");
                          }).catch(function (error) {
                            console.log("Error in Bid Offer Data Deleted UpdateOrder Cronjon 1", error);
                          });
                        }
                      }
                    );

                    await Order.deleteMany({
                      nftID: mongoose.Types.ObjectId(nftID),
                      sellerID: mongoose.Types.ObjectId(owner)
                    }).then(function () {
                      console.log("Order Data deleted - in Offer API CronJob");
                    }).catch(function (error) {
                      console.log("Error in  Order Data deleted - in Offer API CronJob");
                      console.log(error);
                    });
                    let updateData = { hashStatus: 1 };
                    await Bid.findByIdAndUpdate(
                      dataID,
                      updateData,
                      async (err, resData) => {
                        if (resData) {
                          console.log("Updated Bid record", dataID)
                          let buyerID = dataBidderID;
                          let sellerID = dataOwner;
                          let action = "Offer";
                          let type = "Accepted";
                          let paymentToken = dataPaymentToken;
                          let price = dataPrice;
                          let createdBy = dataBidderID;

                          const insertData = new History({
                            nftID: nftID,
                            buyerID: buyerID,
                            sellerID: sellerID,
                            action: action,
                            type: type,
                            paymentToken: paymentToken,
                            price: price,
                            quantity: quantity,
                            createdBy: createdBy,
                            byCron: true
                          });
                          if (dataHash === "" || dataHash === undefined) {
                            insertData.hash = "";
                            console.log("Insert Data History is " + insertData);
                            insertData.save().then(async (insresult) => {
                              console.log("Insert Data History is " + insresult);
                            }).catch((error) => {
                              console.log("Error in creating Record", error);
                            });
                          } else {
                            insertData.hash = dataHash;
                            await History.findOne({ hash: dataHash },
                              async (err, record) => {
                                if (err) {
                                  console.log("Error in fetching History Records ", err)
                                }
                                if (!record) {
                                  insertData.save().then(async (insresult) => {
                                    console.log("Insert Data History is " + insresult);
                                  }).catch((error) => {
                                    console.log("Error in creating Record", error);
                                  });
                                } else {
                                  let updateHistoryData = {
                                    nftID: nftID,
                                    buyerID: buyerID,
                                    sellerID: sellerID,
                                    action: action,
                                    type: type,
                                    paymentToken: paymentToken,
                                    price: price,
                                    quantity: quantity,
                                    hash: dataHash,
                                    createdBy: createdBy,
                                    byCron: true
                                  }
                                  await History.findOneAndUpdate(
                                    { _id: mongoose.Types.ObjectId(record._id) },
                                    { $set: updateHistoryData }, { new: true }, function (err, updateHistory) {
                                      if (err) {
                                        console.log("Error in Updating History" + err);
                                      } else {
                                        console.log("History Updated: ", updateHistory);
                                      }
                                    }
                                  );
                                }
                              }
                            )
                          }
                        }
                      }
                    ).catch((e) => {
                      console.log("Error 1212", e);
                    });

                  }
                });
              }
            }
          }
        }
      })
  } catch (error) {
    console.log(error);
  }
}

async function checkCollectionStatus() {
  try {
    console.log("Check Collection Status Import FAST API....");
    Collection.find({ isImported: 1, progressStatus: 0 },
      async function (err, resData) {
        if (err) {
        } else {
          if (resData.length > 0) {
            for (const data of resData) {
              console.log("Collection ID", data._id)
              if (data.contractAddress !== "0x") {
                let tokenURI = nftMetaBaseURL + "collections?ChainId=" + chainID + "&ContractAddress=" + data.contractAddress;
                console.log("tokenURI - checkCollectionStatus API ", tokenURI)
                try {
                  https.get(tokenURI, (res) => {
                    let body = "";
                    res.on("data", (chunk) => {
                      body += chunk;
                    });
                    res.on("end", async () => {
                      try {
                        let newJSON = JSON.parse(body);
                        let apiStatus = newJSON[0]?.apiStatus;
                        let totalSupply = 0;
                        if (newJSON[0]?.total_supply !== "TODO") {
                          totalSupply = parseInt(newJSON[0]?.total_supply);
                        }
                        let updateCollectionData = {
                          apiStatus: apiStatus,
                          totalSupply: totalSupply
                        }
                        if (apiStatus === "available" && data.progressStatus === 0) {
                          updateCollectionData.progressStatus = 1;
                        }
                        await Collection.findOneAndUpdate(
                          { _id: mongoose.Types.ObjectId(data._id) },
                          { $set: updateCollectionData }, { new: true }, function (err, updateCollection) {
                            if (err) {
                              console.log("Error in Updating Collection - checkCollectionStatus API " + err);
                            } else {
                              console.log("Collection status Updated - checkCollectionStatus API ");
                            }
                          }
                        );
                      } catch (error) {
                        console.log("Error ", error);
                      };
                    });
                  }).on("error", (error) => {
                    console.log("Error ", error);
                  });
                } catch (error) {
                  console.log("Error ", error);
                }
              }
            }
          }
        }
      })
  } catch (error) {
    console.log(error);
  }
}

async function refreshCollectionMeta() {
  try {
    console.log("Check Collection Status Import FAST API....");
    Collection.find({ isImported: 1, progressStatus: 2 },
      async function (err, resData) {
        if (err) {
        } else {
          if (resData.length > 0) {
            for (const collectionData of resData) {
              let collectionAddress = await collectionData.contractAddress;
              let collectionID = await collectionData._id;
              let brandID = await collectionData.brandID;
              let categoryID = await collectionData.categoryID;
              let progressStatus = await collectionData.progressStatus;
              let tokenURI = nftMetaBaseURL + "collections?ChainId=" + chainID + "&ContractAddress=" + collectionAddress;
              console.log("Check Collection Status Import tokenURI", tokenURI);
              try {
                https.get(tokenURI, (resData) => {
                  let body = "";
                  resData.on("data", (chunk) => {
                    body += chunk;
                  });
                  resData.on("end", async () => {
                    try {
                      let newJSON = JSON.parse(body);
                      console.log("last_updated", newJSON[0]?.last_updated)
                      let lastUpdated = newJSON[0]?.last_updated;
                      let totalSupply = newJSON[0]?.total_supply;
                      var d = new Date(0);
                      let lastUpdateMetaDB = d.setUTCSeconds(lastUpdated);

                      let apiStatus = newJSON[0].status;
                      console.log("Collection ", collectionAddress, totalSupply);
                      console.log("File Status", apiStatus);
                      if (apiStatus === "available" && progressStatus === 2) {
                        let NFTDataList = nftMetaBaseURL + "tokenDetailsExtended?ChainId=" + chainID + "&ContractAddress=" + collectionAddress;
                        console.log("NFTDataList", NFTDataList);
                        try {
                          await https.get(NFTDataList, (resData) => {
                            let body = "";
                            resData.on("data", (chunk) => {
                              body += chunk;
                            });
                            resData.on("end", async () => {
                              try {
                                let jsonNFTData = JSON.parse(body);
                                jsonNFTData.forEach(nftRecord => {

                                  // console.log("metadata_last_updated", nftRecord?.name, nftRecord?.description, nftRecord?.metadata_last_updated) 
                                  let lastUpdated = nftRecord?.metadata_last_updated;
                                  var d = new Date(0);
                                  let lastUpdateMetaDBNFT = d.setUTCSeconds(lastUpdated);
                                  var d1 = new Date(lastUpdateMetaDBNFT);
                                  NFT.find({ collectionID: mongoose.Types.ObjectId(collectionID), tokenID: nftRecord.token_id }, async function (err, nftData) {
                                    if (err) {
                                      console.log("Error in nft Query", err)
                                    } else {
                                      if (nftData.length == 0) {
                                        let nft = new NFT({
                                          name: nftRecord.name,
                                          description: nftRecord.description,
                                          tokenID: nftRecord.token_id,
                                          collectionID: collectionID,
                                          collectionAddress: collectionAddress,
                                          totalQuantity: 1,
                                          isImported: 1,
                                          type: 1,
                                          isMinted: 1,
                                          previewImg: nftRecord?.S3Images?.S3Image300 ? nftRecord.S3Images.S3Image300 : "",
                                          hashStatus: 1,
                                          brandID: brandID,
                                          categoryID: categoryID,
                                          ownedBy: [],
                                        });
                                        console.log("Date is", lastUpdateMetaDBNFT)
                                        if (lastUpdateMetaDBNFT !== NaN) {
                                          nft.lastUpdatedOn = lastUpdateMetaDBNFT;
                                        }
                                        nft.image = "";
                                        if (nftRecord?.S3Images?.S3Animation === "" || nftRecord?.S3Images?.S3Animation === null) {
                                          nft.image = nftRecord?.S3Images?.S3Image ? nftRecord.S3Images.S3Image : "";
                                        } else {
                                          nft.image = nftRecord?.S3Images?.S3Animation ? nftRecord.S3Images.S3Animation : "";
                                        }
                                        if (nft.image === "") {
                                          nft.image = nftRecord?.image ? nftRecord.image : "";
                                        }
                                        if (nftRecord?.owner?.owner !== undefined) {
                                          nft.ownedBy.push({
                                            address: nftRecord?.owner?.owner,
                                            quantity: 1,
                                          });
                                        }
                                        await nft.save(async function (saveerr, nftSaveResult) {
                                          if (saveerr) {
                                            console.log("Created NFT error", saveerr);
                                          }
                                          if (nftSaveResult) {
                                            console.log("Created NFT ", nftSaveResult?._id);
                                            Collection.findOneAndUpdate({ _id: mongoose.Types.ObjectId(collectionID) }, { $inc: { nftCount: 1 } }, { new: true }, function (err, response) {
                                              if (err) {
                                              } else {
                                                console.log("NFT count is ", response?.nftCount)
                                              }
                                            });
                                          }
                                        })
                                      } else {
                                        var d2 = new Date(nftData[0].lastUpdatedOn);
                                        if (d1.getTime() === d2.getTime()) {
                                          console.log("NFT already Updated");
                                        } else {
                                          let OwnedBy = [];
                                          OwnedBy.push({
                                            address: nftRecord?.owner?.owner,
                                            quantity: 1,
                                          });
                                          let updateNFTData = {
                                            name: nftRecord.name,
                                            description: nftRecord.description,
                                            previewImg: nftRecord?.S3Images?.S3Image300 ? nftRecord.S3Images.S3Image300 : "",
                                            lastUpdatedOn: lastUpdateMetaDBNFT,
                                            ownedBy: OwnedBy
                                          }
                                          if (nftRecord?.S3Images?.S3Animation === "" || nftRecord?.S3Images?.S3Animation === null) {
                                            updateNFTData.image = nftRecord?.S3Images?.S3Image ? nftRecord.S3Images.S3Image : "";
                                          } else {
                                            updateNFTData.image = nftRecord?.S3Images?.S3Animation ? nftRecord.S3Images.S3Animation : "";
                                          }
                                          await NFT.findOneAndUpdate(
                                            { _id: mongoose.Types.ObjectId(nftData[0]._id) },
                                            { $set: updateNFTData }, { new: true }, function (err, updateNFT) {
                                              if (err) {
                                                console.log("Error in Updating NFT" + nftData[0]._id);
                                              } else {
                                                console.log("NFT MetaData Updated: ", nftData[0]._id);
                                              }
                                            }
                                          );
                                        }
                                      }
                                    }
                                  })
                                });
                              } catch (error) {
                                console.log("Error ", error);
                              };
                            });
                          }).on("error", (error) => {
                            console.log("Error ", error);
                          });
                          let updateCollectionData = {
                            progressStatus: 2,
                            checkStatus: 0,
                            totalSupply: totalSupply,
                            lastUpdatedOn: lastUpdateMetaDB
                          }
                          await Collection.findOneAndUpdate(
                            { _id: mongoose.Types.ObjectId(collectionID) },
                            { $set: updateCollectionData }, { new: true }, function (err, updateCollection) {
                              if (err) {
                                console.log("Error in Updating Collection" + err);
                              } else {
                                console.log("Collection status Updated: ");
                              }
                            }
                          );

                        } catch (error) {
                          console.log("Error ", error);
                        }
                      } else {
                        console.log("Not Updated in Collection");
                      }
                    } catch (error) {
                      console.log("Error ", error);
                    };
                  });
                }).on("error", (error) => {
                  console.log("Error ", error);
                });
              } catch (error) {
                console.log("Error ", error);
              }
            }
          }
        }
      })
  } catch (error) {
    console.log(error);
  }
}


async function checkCollectionTotalSupply() {
  try {
    console.log("Check Collection Total Supply FAST API....");
    Collection.find({ isImported: 1, progressStatus: 2, $or: [{ cronjobStatus: "Updated" }, { cronjobStatus: "" }] },
      async function (err, resData) {
        if (err) {
        } else {
          if (resData.length > 0) {
            for (const collectionRecord of resData) {
              let collectionID = await collectionRecord._id;
              Collection.find({ _id: mongoose.Types.ObjectId(collectionID) }, async function (err, collectionData) {
                let tokenURI = nftMetaBaseURL + "collections?ChainId=" + chainID + "&ContractAddress=" + collectionData[0].contractAddress;
                console.log("tokenURI - checkCollectionTotalSupply API ", tokenURI);
                try {
                  await https.get(tokenURI, (resData) => {
                    let body = "";
                    resData.on("data", (chunk) => {
                      body += chunk;
                    });
                    resData.on("end", async () => {
                      try {
                        let newJSON = JSON.parse(body);
                        let lastUpdated = newJSON[0]?.last_updated;
                        let totalSupply = newJSON[0]?.total_supply;
                        var d = new Date(0);
                        let lastUpdateMetaDB = d.setUTCSeconds(lastUpdated);
                        let totalSupplyDB = collectionData[0].totalSupply;
                        var d1 = new Date(lastUpdateMetaDB);
                        var d2 = new Date(collectionData[0].lastUpdatedOn);
                        if (d1.getTime() !== d2.getTime() || totalSupply > totalSupplyDB) {
                          let startFrom = totalSupplyDB;
                          console.log("changes found in Collection - checkCollectionTotalSupply API");
                          let apiStatus = newJSON[0].status;
                          console.log("API response status - checkCollectionTotalSupply API", apiStatus);
                          if (apiStatus === "available" && collectionData[0].progressStatus === 2) {

                            let updateCollectionStatus = {
                              cronjobStatus: "Updating"
                            }
                            await Collection.findOneAndUpdate(
                              { _id: mongoose.Types.ObjectId(collectionID) },
                              { $set: updateCollectionStatus }, { new: true }, function (err, updateCollection) {
                                if (err) {
                                  console.log("Error in Updating cronjobStatus Collection - checkCollectionTotalSupply API" + err);
                                } else {
                                  console.log("cronjobStatus Collection status Updated:  - checkCollectionTotalSupply API");
                                }
                              }
                            );



                            let NFTDataList = nftMetaBaseURL + "tokenDetailsExtended?ChainId=" + chainID + "&ContractAddress=" + collectionData[0].contractAddress + "&TokenId=" + startFrom + "-" + totalSupply;
                            console.log("NFTDataList  - checkCollectionTotalSupply API ", NFTDataList);
                            try {
                              await https.get(NFTDataList, (resData) => {
                                let body = "";
                                resData.on("data", (chunk) => {
                                  body += chunk;
                                });
                                resData.on("end", async () => {
                                  try {
                                    let jsonNFTData = JSON.parse(body);
                                    for await (const nftRecord of jsonNFTData) {
                                      // console.log(nftRecord);
                                      let lastUpdated = nftRecord?.metadata_last_updated;
                                      var d = new Date(0);
                                      let lastUpdateMetaDBNFT = d.setUTCSeconds(lastUpdated);
                                      var d1 = new Date(lastUpdateMetaDBNFT);
                                      NFT.find({ collectionID: mongoose.Types.ObjectId(collectionData[0]._id), tokenID: nftRecord.token_id }, async function (err, nftData) {
                                        if (err) {
                                          console.log("Error in nft Query - checkCollectionTotalSupply API", err)
                                          updateCollection = 0;
                                        } else {
                                          if (nftData.length == 0) {
                                            let nft = new NFT({
                                              name: nftRecord.name,
                                              description: nftRecord.description,
                                              tokenID: nftRecord.token_id,
                                              collectionID: collectionData[0]._id,
                                              collectionAddress: collectionData[0].contractAddress,
                                              totalQuantity: 1,
                                              isImported: 1,
                                              type: 1,
                                              isMinted: 1,
                                              previewImg: nftRecord?.S3Images?.S3Image300 ? nftRecord.S3Images.S3Image300 : "",
                                              hashStatus: 1,
                                              brandID: collectionData[0].brandID,
                                              categoryID: collectionData[0].categoryID,
                                              ownedBy: [],
                                            });
                                            console.log("lastUpdateMetaDBNFT - checkCollectionTotalSupply API", lastUpdateMetaDBNFT)
                                            console.log("Date is - checkCollectionTotalSupply API", lastUpdateMetaDBNFT)
                                            if (lastUpdateMetaDBNFT !== NaN) {
                                              nft.lastUpdatedOn = lastUpdateMetaDBNFT;
                                            }
                                            nft.image = "";
                                            if (nftRecord?.S3Images?.S3Animation === "" || nftRecord?.S3Images?.S3Animation === null) {
                                              nft.image = nftRecord?.S3Images?.S3Image ? nftRecord.S3Images.S3Image : "";
                                            } else {
                                              nft.image = nftRecord?.S3Images?.S3Animation ? nftRecord.S3Images.S3Animation : "";
                                            }
                                            if (nft.image === "") {
                                              nft.image = nftRecord?.image ? nftRecord.image : "";
                                            }
                                            if (nftRecord?.owner?.owner !== undefined) {
                                              nft.ownedBy.push({
                                                address: nftRecord.owner.owner,
                                                quantity: 1,
                                              });
                                            }
                                            nft.save(async function (saveerr, nftSaveResult) {
                                              if (saveerr) {
                                                console.log("Created NFT error - checkCollectionTotalSupply API", saveerr);
                                              }
                                              if (nftSaveResult) {
                                                helperFunctions.increaseNFTCount(collectionData[0]._id);
                                              }
                                            })
                                          } else {
                                            var d2 = new Date(nftData[0].lastUpdatedOn);
                                            if (d1.getTime() === d2.getTime()) {
                                              console.log("NFT already Updated - checkCollectionTotalSupply API");
                                            } else {
                                              let updateNFTData = {
                                                name: nftRecord.name,
                                                description: nftRecord.description,
                                                previewImg: nftRecord?.S3Images?.S3Image300 ? nftRecord.S3Images.S3Image300 : "",
                                                lastUpdatedOn: lastUpdateMetaDBNFT
                                              }
                                              if (nftRecord?.S3Images?.S3Animation === "" || nftRecord?.S3Images?.S3Animation === null) {
                                                updateNFTData.image = nftRecord?.S3Images?.S3Image ? nftRecord.S3Images.S3Image : "";
                                              } else {
                                                updateNFTData.image = nftRecord?.S3Images?.S3Animation ? nftRecord.S3Images.S3Animation : "";
                                              }
                                              await NFT.findOneAndUpdate(
                                                { _id: mongoose.Types.ObjectId(nftData[0]._id) },
                                                { $set: updateNFTData }, { new: true }, function (err, updateNFT) {
                                                  if (err) {
                                                    console.log("Error in Updating NFT - checkCollectionTotalSupply API" + nftData[0]._id);
                                                  } else {
                                                    console.log("NFT MetaData Updated:  - checkCollectionTotalSupply API", nftData[0]._id);
                                                  }
                                                }
                                              );
                                            }
                                          }
                                        }
                                      })

                                    }
                                  } catch (error) {
                                    console.log("Error  - checkCollectionTotalSupply API", error);
                                  };
                                });
                              }).on("error", (error) => {
                                console.log("Error  - checkCollectionTotalSupply API", error);
                              });
                              let updateCollectionData = {
                                progressStatus: 2,
                                checkStatus: 0,
                                totalSupply: totalSupply,
                                lastUpdatedOn: lastUpdateMetaDB,
                                cronjobStatus: "Updated"
                              }
                              await Collection.findOneAndUpdate(
                                { _id: mongoose.Types.ObjectId(collectionID) },
                                { $set: updateCollectionData }, { new: true }, function (err, updateCollection) {
                                  if (err) {
                                    console.log("Error in Updating Collection - checkCollectionTotalSupply API" + err);
                                  } else {
                                    console.log("Collection status Updated:  - checkCollectionTotalSupply API");
                                  }
                                }
                              );

                            } catch (error) {
                              console.log("Error  - checkCollectionTotalSupply API", error);
                            }
                          } else {
                            console.log("Not Updated in Collection - checkCollectionTotalSupply API");
                          }
                        }
                      } catch (error) {
                        console.log("Error  - checkCollectionTotalSupply API", error);
                      };
                    });
                  }).on("error", (error) => {
                    console.log("Error  - checkCollectionTotalSupply API", error);
                  });
                } catch (error) {
                  console.log("Error  - checkCollectionTotalSupply API", error);
                }

              });
            }
          }
        }
      })
  } catch (error) {
    console.log(error);
  }
}

async function autoAddCollectionNFT() {
  try {
    console.log("Checking nftCount and totalSupply Difference");
    Collection.find({ isImported: 1, status: 1, $expr: { $gt: ["$totalSupply", "$nftCount"] } }, async function (err, collectionData) {
      if (err) {
      } else {
        if (collectionData.length > 0) {
          for await (const collectionRecord of collectionData) {
            let c_Address = await collectionRecord.contractAddress;
            let c_ID = await collectionRecord._id;
            console.log("Collection C", c_ID, c_Address);
            let NFTDataList = nftMetaBaseURL + "tokenDetailsExtended?ChainId=" + chainID + "&ContractAddress=" + c_Address;
            console.log("NFTDataList", NFTDataList);
            try {
              https.get(NFTDataList, (resData) => {
                let body = "";
                resData.on("data", (chunk) => {
                  body += chunk;
                });
                resData.on("end", async () => {
                  try {
                    let jsonNFTData = JSON.parse(body);
                    for await (const nftRecord of jsonNFTData) {
                      let lastUpdated = nftRecord?.metadata_last_updated;
                      var d = new Date(0);
                      let lastUpdateMetaDBNFT = d.setUTCSeconds(lastUpdated);
                      console.log("Collection TOken", c_ID, c_Address, nftRecord.token_id);
                      NFT.find({ collectionID: mongoose.Types.ObjectId(c_ID), tokenID: nftRecord.token_id }, async function (err, nftData) {
                        if (err) {
                          console.log("Error in nft Query - autoAddCollectionNFT API", err)
                        } else {
                          if (nftData.length == 0) {
                            let nft = new NFT({
                              name: nftRecord.name,
                              description: nftRecord.description,
                              tokenID: nftRecord.token_id,
                              collectionID: c_ID,
                              collectionAddress: c_Address,
                              totalQuantity: 1,
                              isImported: 1,
                              type: 1,
                              isMinted: 1,
                              previewImg: nftRecord?.S3Images?.S3Image300 ? nftRecord.S3Images.S3Image300 : "",
                              hashStatus: 1,
                              brandID: collectionData[0].brandID,
                              categoryID: collectionData[0].categoryID,
                              ownedBy: [],
                            });
                            console.log("lastUpdateMetaDBNFT", lastUpdateMetaDBNFT)
                            console.log("Date is", lastUpdateMetaDBNFT)
                            if (lastUpdateMetaDBNFT !== NaN) {
                              nft.lastUpdatedOn = lastUpdateMetaDBNFT;
                            }

                            nft.image = "";
                            if (nftRecord?.S3Images?.S3Animation === "" || nftRecord?.S3Images?.S3Animation === null) {
                              nft.image = nftRecord?.S3Images?.S3Image ? nftRecord.S3Images.S3Image : "";
                            } else {
                              nft.image = nftRecord?.S3Images?.S3Animation ? nftRecord.S3Images.S3Animation : "";
                            }
                            if (nft.image === "") {
                              nft.image = nftRecord?.image ? nftRecord.image : "";
                            }
                            if (nftRecord?.owner?.owner !== undefined) {
                              nft.ownedBy.push({
                                address: nftRecord.owner.owner,
                                quantity: 1,
                              });
                            }
                            console.log("NFT Insert Data", nft)
                            nft.save(async function (saveerr, nftSaveResult) {
                              if (saveerr) {
                                console.log("Created NFT error", saveerr?.reason, saveerr?.message);
                              }
                              if (nftSaveResult) {
                                helperFunctions.increaseNFTCount(c_ID);
                              }
                            })
                          } else {
                            // console.log("NFT Found ",c_ID, c_Address,  nftRecord.token_id  )
                          }
                        }
                      })
                    }
                  } catch (error) {
                    console.log("Error ", error);
                  };
                });
              }).on("error", (error) => {
                console.log("Error ", error);
              });
            } catch (error) {
              console.log("Error ", error);
            }



          }
        }
      }
    });
  } catch (error) {
    console.log(error);
  }
}
setInterval(() => {
  checkCollection();
  checkNFTs();
  checkOrders();
  checkOffers();
}, 10000);

setInterval(() => {
  checkCollectionStatus();
}, 15000);

setInterval(() => {
  checkCollectionTotalSupply();
}, 25000);

setInterval(() => {
  autoAddCollectionNFT();
}, 1800000);

setInterval(() => {
  refreshCollectionMeta();
}, 43200000);

