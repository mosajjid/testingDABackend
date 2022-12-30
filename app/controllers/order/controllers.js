const fs = require("fs");
const ipfsAPI = require("ipfs-api");
const ipfs = ipfsAPI("ipfs.infura.io", "5001", {
  protocol: "https",
  auth: "21w11zfV67PHKlkAEYAZWoj2tsg:f2b73c626c9f1df9f698828420fa8439",
});
const { Order, NFT, Bid, Transaction, User } = require("../../models");
const pinataSDK = require("@pinata/sdk");
const multer = require("multer");
const pinata = pinataSDK(
  process.env.PINATAAPIKEY,
  process.env.PINATASECRETAPIKEY
);
const mongoose = require("mongoose");
const validators = require("../helpers/validators");
var jwt = require("jsonwebtoken");

class OrderController {
  constructor() { }

  async createOrder(req, res) {
    try {
      console.log(req);
      if (!req.userId) return res.reply(messages.unauthorized());
      let orderDate = new Date().setFullYear(new Date().getFullYear() + 10);
      let validity = Math.floor(orderDate / 1000);
      console.log("nft req", req.body);
      let isblocked = await validators.isBlockedNFT(req.body.nftID);
      if (isblocked === -1) {
        return res.reply(messages.server_error("Query "));
      } else if (isblocked === 0) {
        return res.reply(messages.blocked("NFT"));
      } else if (isblocked === -2) {
        return res.reply(messages.not_found("NFT/Collection"));
      } else if (isblocked === 1) {
        const order = new Order({
          nftID: req.body.nftID,
          tokenID: req.body.tokenID,
          collectionAddress: req.body.collectionAddress,
          total_quantity: req.body.quantity,
          deadline: req.body.deadline,
          deadlineDate: req.body.deadlineDate,
          salesType: req.body.saleType,
          paymentToken: req.body.tokenAddress,
          price: req.body.price,
          salt: req.body.salt,
          signature: req.body.signature,
          bundleTokens: [],
          bundleTokensQuantities: [],
          sellerID: req.userId,
          hash: req.body.hash,
          hashStatus: req.body.hashStatus,
        });
        order
          .save()
          .then((result) => {
            return res.reply(messages.created("Order"), result);
          })
          .catch((error) => {
            return res.reply(messages.already_exists("Failed:" + error));
          });
      }
    } catch (error) {
      console.log("Error " + JSON.stringify(error));
      return res.reply(messages.server_error());
    }
  }

  async deleteOrder(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      let orderID = req.body.orderID;
      await Order.deleteMany({ _id: mongoose.Types.ObjectId(orderID) }).then(function () {
        console.log("Order Data Deleted");
      }).catch(function (error) {
        console.log("Error in Order Data Deleted", error);
      });
      await Bid.deleteMany({ orderID: mongoose.Types.ObjectId(orderID), bidStatus: "Bid", }).then(function () {
        console.log("Order Bid Deleted Cronjon");
      }).catch(function (error) {
        console.log("Error in Bid Data Deleted Cronjon", error);
      });
      return res.reply(messages.deleted("order"));
    } catch (err) {
      return res.reply(messages.error(), err.message);
    }
  }

  async updateOrder(req, res) {
    try {
      console.log("inside update order", req.body)
      if (!req.userId) return res.reply(messages.unauthorized());
      console.log("111");
      let lazyMintingStatus = Number(req.body.LazyMintingStatus);
      if (!req.body.nftID) {
        return res.reply(messages.bad_request(), "NFTID is required.");
      } else {
        let isblocked = await validators.isBlockedNFT(req.body.nftID);
        console.log("isblocked", isblocked);
        if (isblocked === -1) {
          return res.reply(messages.server_error("Query "));
        } else if (isblocked === 0) {
          return res.reply(messages.blocked("NFT"));
        } else if (isblocked === -2) {
          return res.reply(messages.not_found("NFT/Collection"));
        } else if (isblocked === 1) {
          Order.findById(req.body.orderID, async (err, orderData) => {
            if (err) {
              console.log("Order Query error", error);
              return res.reply(messages.error());
            }
            if (!orderData) {
              return res.reply(messages.not_found("Order"));
            } else {
              let nftID = req.body.nftID;
              let transaction = new Transaction({
                nftID: orderData.nftID,
                collectionAddress: orderData.collectionAddress,
                sellerID: orderData.sellerID,
                quantity_sold: req.body.qty_sold,
                price: req.body.amount,
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

              await Order.updateOne(
                { _id: req.body.orderID },
                { $set: { quantity_sold: req.body.qty_sold }, hash: req.body.hash, hashStatus: req.body.hashStatus },
                (err) => {
                  if (err) throw error;
                }
              );

              await NFT.findOne({ _id: mongoose.Types.ObjectId(nftID) },
                async (err, checkNFT) => {
                  if (err) {
                    return res.reply(messages.error());
                  }
                  if (!checkNFT) {
                    return res.reply(messages.error());
                  }
                  if (checkNFT?.type === 1) {
                    let OwnedBy = [];
                    OwnedBy.push({
                      address: req.body.buyer.toLowerCase(),
                      quantity: 1,
                    });
                    let updateNFTData = { ownedBy: OwnedBy }
                    await NFT.findOneAndUpdate({ _id: mongoose.Types.ObjectId(nftID) },
                      { $set: updateNFTData }, { new: true }, async function (err, updateNFT) { });
                  } else {
                    console.log("Quantity Sold Updated");
                    let NFTData = await NFT.find({
                      _id: mongoose.Types.ObjectId(req.body.nftID),
                      "ownedBy.address": req.body.seller.toLowerCase(),
                    }).select("ownedBy -_id");
                    console.log("NFTData-------->", NFTData);
                    let currentQty;
                    if (NFTData.length > 0) {
                      currentQty = NFTData[0].ownedBy.find(
                        (o) => o.address === req.body.seller.toLowerCase()
                      ).quantity;
                    }
                    let boughtQty = parseInt(req.body.qtyBought);
                    let leftQty = currentQty - boughtQty;
                    console.log("leftQty", leftQty);
                    if (leftQty < 1) {
                      await NFT.findOneAndUpdate(
                        { _id: mongoose.Types.ObjectId(req.body.nftID) },
                        {
                          $pull: {
                            ownedBy: { address: req.body.seller },
                          },
                        }
                      ).catch((e) => {
                        console.log("Error1", e.message);
                      });
                    } else {
                      await NFT.findOneAndUpdate(
                        {
                          _id: mongoose.Types.ObjectId(req.body.nftID),
                          "ownedBy.address": req.body.seller,
                        },
                        {
                          $set: {
                            "ownedBy.$.quantity": parseInt(leftQty),
                          },
                        }
                      ).catch((e) => {
                        console.log("Error2", e.message);
                      });
                    }
                    console.log("Crediting Buyer");
                    let subDocId = await NFT.exists({
                      _id: mongoose.Types.ObjectId(req.body.nftID),
                      "ownedBy.address": req.body.buyer,
                    });
                    if (subDocId) {
                      console.log("Subdocument Id", subDocId);

                      let NFTData_Buyer = await NFT.findOne({
                        _id: mongoose.Types.ObjectId(req.body.nftID),
                        "ownedBy.address": req.body.buyer,
                      }).select("ownedBy -_id");
                      console.log("NFTData_Buyer-------->", NFTData_Buyer);
                      console.log(
                        "Quantity found for buyers",
                        NFTData_Buyer.ownedBy.find(
                          (o) => o.address === req.body.buyer.toLowerCase()
                        ).quantity
                      );
                      currentQty = NFTData_Buyer.ownedBy.find(
                        (o) => o.address === req.body.buyer.toLowerCase()
                      ).quantity
                        ? parseInt(
                          NFTData_Buyer.ownedBy.find(
                            (o) => o.address === req.body.buyer.toLowerCase()
                          ).quantity
                        )
                        : 0;
                      boughtQty = req.body.qtyBought;
                      let ownedQty = currentQty + boughtQty;
                      console.log("777");
                      console.log("ownedQty", ownedQty);
                      console.log("buyer", req.body.buyer);
                      await NFT.findOneAndUpdate(
                        {
                          _id: mongoose.Types.ObjectId(req.body.nftID),
                          "ownedBy.address": req.body.buyer,
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
                        address: req.body.buyer,
                        quantity: parseInt(req.body.qtyBought),
                      };
                      await NFT.findOneAndUpdate(
                        { _id: mongoose.Types.ObjectId(req.body.nftID) },
                        { $addToSet: { ownedBy: dataToadd } },

                        { upsert: true }
                      );
                      console.log("wasn't there but added");
                    }

                  }
                });


              await NFT.findOneAndUpdate(
                { _id: mongoose.Types.ObjectId(req.body.nftID) },
                {
                  $set: {
                    lazyMintingStatus: Number(lazyMintingStatus),
                    quantity_minted: Number(req.body.quantity_minted),
                  },
                }
              ).catch((e) => {
                console.log("Error1", e.message);
              });
              await Bid.deleteMany({ orderID: mongoose.Types.ObjectId(req.body.orderID), bidStatus: "Bid", }).then(function () {
                console.log("Order Bid Deleted UpdateOrder");
              }).catch(function (error) {
                console.log("Error in Bid Data Deleted UpdateOrder", error);
              });

              await User.findOne({ walletAddress: _.toChecksumAddress(req.body.buyer)?.toLowerCase() },
                async (err, checkUser) => {
                  if (err) {
                    console.log("Error in Finding Bidder ID in User Table", err);
                  }
                  if (!checkUser) {
                    console.log("Error in Bid Offer Data Deleted UpdateOrder", error);
                  } else {
                    await Bid.deleteMany({ nftID: mongoose.Types.ObjectId(req.body.nftID), bidderID: mongoose.Types.ObjectId(checkUser._id), bidStatus: "MakeOffer" }).then(function () {
                      console.log("Bid Offer Data Deleted UpdateOrder", req.body.buyer, checkUser._id);
                    }).catch(function (error) {
                      console.log("Error in Bid Offer Data Deleted UpdateOrder", req.body.buyer, checkUser._id, error);
                    });
                    await Bid.updateMany({ nftID: mongoose.Types.ObjectId(req.body.nftID), bidStatus: "MakeOffer" }, { owner: mongoose.Types.ObjectId(checkUser._id) }).then(function () {
                      console.log("Bid Offer Data Owner Updated UpdateOrder");
                    }).catch(function (error) {
                      console.log("Error in Bid Offer Data Owner Updated UpdateOrder", error);
                    });
                  }
                }
              );

              return res.reply(messages.updated("order"));
            }
          });
        }
      }
    } catch (error) {
      return res.reply(messages.error(), error.message);
    }
  }

  async getOrder(req, res) {
    try {
      Order.findOne({ _id: req.body.orderID, }, (err, order) => {
        if (err) return res.reply(messages.server_error());
        if (!order) return res.reply(messages.not_found("Order"));
        return res.reply(messages.no_prefix("Order Details"), order);
      })
        .populate("sellerID")
        .populate("nftID");
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  async getOrdersByNftId(req, res) {
    try {
      const sortKey = req.body.sortKey ? req.body.sortKey : "price";
      const sortType = req.body.sortType ? req.body.sortType : -1;
      var sortObject = {};
      var stype = sortKey;
      var sdir = sortType;
      sortObject[stype] = sdir;
      const page = parseInt(req.body.page);
      const limit = parseInt(req.body.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const results = {};
      let searchArray = [];
      // searchArray["hashStatus"] = 1;
      if (req.body.nftID != undefined && req.body.nftID != "") {
        searchArray["nftID"] = req.body.nftID;
      }
      if (req.body.tokenID != undefined && req.body.tokenID != "") {
        searchArray["tokenID"] = req.body.tokenID;
        searchArray["collectionAddress"] = req.body.collectionAddress;
      }
      let searchObj = Object.assign({}, searchArray);
      if (endIndex < (await Order.count(searchObj).exec())) {
        results.next = {
          page: page + 1,
          limit: limit,
        };
      }

      if (startIndex > 0) {
        results.previous = {
          page: page - 1,
          limit: limit,
        };
      }

      let AllOrders = await Order.find(searchObj)
        .populate("sellerID")
        .populate("orderID")
        .sort(sortObject)
        .limit(limit)
        .skip(startIndex)
        .exec();

      results.results = AllOrders;
      return res.reply(messages.success("NFT Orders List"), results);
    } catch (error) {
      return res.reply(messages.server_error(), error.message);
    }
  }


  async updateOrderStatus(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());

      console.log("inside update Order Hash Status", req.body)
      if (!req.userId) return res.reply(messages.unauthorized());
      let orderID = req.body.orderID;
      let hash = req.body.hash;
      let hashStatus = req.body.hashStatus;
      let checkOrder = await Order.findById(orderID);
      if (checkOrder) {
        await Order.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(orderID) },
          { hash: hash, hashStatus: hashStatus },
          function (err, updated) {
            if (err) {
              console.log("Error in updating record" + err);
              return res.reply(messages.error());
            } else {
              console.log("Record updated: ", updated);
              return res.reply(messages.updated("Status"), updated);
            }
          }
        );

      } else {
        console.log("Record Not found");
        return res.reply("Record Not found");
      }
    } catch (error) {
      return res.reply(messages.error(), error.message);
    }
  }

  // async insertHash(req, res) {
  //   try {
  //     console.log("inside insertHash Order API", req.body)
  //     if (!req.userId) return res.reply(messages.unauthorized());
  //     let nftID = req.body.nftID;
  //     let processType = req.body.processType;
  //     let hash = req.body.hash;
  //     const insertData = new Tracker({
  //       nftID: nftID,
  //       hash: hash,
  //       hashStatus: 0,
  //       processType: processType
  //     });
  //     if(req?.body?.orderID !== undefined){
  //       insertData.orderID = orderID;
  //     }
  //     if(req?.body?.bidID !== undefined){
  //       insertData.bidID = bidID;
  //     }
  //     insertData.save().then(async (result) => {
  //       return res.reply(messages.created("Record Inserted"), result);
  //     }).catch((error) => {
  //       console.log("Error in creating Record", error);
  //       return res.reply(messages.error());
  //     });
  //   } catch (error) {
  //     return res.reply(messages.error(), error.message);
  //   }
  // }

  // async deleteHash(req, res) {
  //   try {
  //     if (!req.userId) return res.reply(messages.unauthorized());

  //     console.log("inside deletetHash Order API", req.body)
  //     if (!req.userId) return res.reply(messages.unauthorized());
  //     let recordID = req.body.recordID;
  //     await Tracker.deleteMany({ _id: mongoose.Types.ObjectId(recordID) }).then(function () {
  //       console.log("Record Data Deleted");
  //     }).catch(function (error) {
  //       console.log("Error in Record Data Deleted", error);
  //     });
  //   } catch (error) {
  //     return res.reply(messages.error(), error.message);
  //   }
  // }
}



module.exports = OrderController;
