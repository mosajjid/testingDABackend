const { User, Bid, NFT, Order, Transaction } = require("../../models");
const validators = require("../helpers/validators");
const mongoose = require("mongoose");
const moment = require('moment');
const nodemailer = require("../../utils/lib/nodemailer");


class BidController {
  constructor() { }

  async createBidNft(req, res) {
    console.log("req", req.body);
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      console.log("Checking Old Bids");
      let isblocked = await validators.isBlockedNFT(req.body.nftID);
      if (isblocked === -1) {
        return res.reply(messages.server_error("Query "));
      } else if (isblocked === 0) {
        return res.reply(messages.blocked("NFT"));
      } else if (isblocked === -2) {
        return res.reply(messages.not_found("NFT/Collection"));
      } else if (isblocked === 1) {
        let CheckBid = await Bid.findOne({
          bidderID: mongoose.Types.ObjectId(req.userId),
          owner: mongoose.Types.ObjectId(req.body.owner),
          nftID: mongoose.Types.ObjectId(req.body.nftID),
          orderID: mongoose.Types.ObjectId(req.body.orderID),
          bidStatus: "Bid",
        });
        if (CheckBid) {
          console.log("Bid Found");
          await Bid.deleteMany(
            {
              bidderID: mongoose.Types.ObjectId(req.userId),
              owner: mongoose.Types.ObjectId(req.body.owner),
              nftID: mongoose.Types.ObjectId(req.body.nftID),
              orderID: mongoose.Types.ObjectId(req.body.orderID),
              bidStatus: "Bid",
            },
            function (err, bidDel) {
              if (err) {
                console.log("Error in deleting Old Bid" + err);
              } else {
                console.log("Old Bid record Deleted" + bidDel);
              }
            }
          );
        }

        await NFT.findOne({ _id: mongoose.Types.ObjectId(req.body.nftID) },
          async (nftErr, nftData) => {
            if (nftErr) {
              console.log("Error in fetching NFT", nftErr)
              return res.reply(messages.error());
            }
            if (!nftData) {
              console.log("NFT not Found")
              return res.not_found("NFT");
            } else {
              console.log("NFT Data", nftData?._id)
              let ownerAddress = nftData?.ownedBy[0]?.address;
              await User.findOne({ walletAddress: _.toChecksumAddress(ownerAddress) },
                async (err, user) => {
                  if (err) {
                    console.log("Error in fetching User", err)
                    return res.reply(messages.error());
                  }
                  if (!user) {
                    console.log("User created in Database");
                    const user = new User({
                      walletAddress: _.toChecksumAddress(ownerAddress?.toLowerCase()),
                    });
                    user.save().then(async (resultUser) => {
                      console.log("Bid Not Found");
                      const bidData = new Bid({
                        bidderID: req.userId,
                        owner: resultUser._id,
                        bidStatus: "Bid",
                        bidPrice: req.body.bidPrice,
                        nftID: req.body.nftID,
                        orderID: req.body.orderID,
                        bidQuantity: req.body.bidQuantity,
                        buyerSignature: req.body.buyerSignature,
                        bidDeadline: req.body.bidDeadline,
                        isOffer: req.body.isOffer,
                        lastUpdatedOn: Date.now(),
                      });
                      bidData
                        .save()
                        .then(async (result) => {
                          return res.reply(messages.created("Bid Placed"), result);
                        })
                        .catch((error) => {
                          console.log("Created Bid error", error);
                          return res.reply(messages.error());
                        });
                    }).catch((error) => {
                      console.log("Error in creating User", error)
                      return res.reply(messages.error());
                    });

                  } else {
                    console.log("Bid Not Found");
                    const bidData = new Bid({
                      bidderID: req.userId,
                      owner: user._id,
                      bidStatus: "Bid",
                      bidPrice: req.body.bidPrice,
                      nftID: req.body.nftID,
                      orderID: req.body.orderID,
                      bidQuantity: req.body.bidQuantity,
                      buyerSignature: req.body.buyerSignature,
                      bidDeadline: req.body.bidDeadline,
                      isOffer: req.body.isOffer,
                      lastUpdatedOn: Date.now(),
                    });
                    bidData
                      .save()
                      .then(async (result) => {
                        return res.reply(messages.created("Bid Placed"), result);
                      })
                      .catch((error) => {
                        console.log("Created Bid error", error);
                        return res.reply(messages.error());
                      });
                  }
                });
            }
          });
      }
    } catch (e) {
      console.log("errr", e);
      return res.reply(messages.error());
    }
  }

  //Create Offer API

  async createOffer(req, res) {
    console.log("req in create offer", req.body);
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      console.log("Checking Old Offer");

      console.log("ownerr addres isss------>", req.body.owner.address);
      let ownerAddress = req.body.owner.address;
      await NFT.findOne({ _id: mongoose.Types.ObjectId(req.body.nftID) },
        async (nftErr, nftData) => {
          if (nftErr) {
            console.log("Error in fetching NFT", nftErr)
            return res.reply(messages.error());
          }
          if (!nftData) {
            console.log("NFT not Found")
            return res.not_found("NFT");
          } else {
            console.log("NFT Data", nftData?._id)
            if (req.body.owner.address !== nftData?.ownedBy[0]?.address) {
              ownerAddress = nftData?.ownedBy[0]?.address;
            } else {
              ownerAddress = req.body.owner.address;
            }
            await User.findOne({ walletAddress: _.toChecksumAddress(ownerAddress) },
              async (err, user) => {
                if (err) {
                  console.log("Error in fetching User", err)
                  return res.reply(messages.error());
                }
                if (!user) {
                  console.log("User created in Database");
                  const user = new User({
                    walletAddress: _.toChecksumAddress(ownerAddress?.toLowerCase()),
                  });

                  user.save().then(async (resultUser) => {
                    let CheckBid = await Bid.findOne({
                      bidderID: mongoose.Types.ObjectId(req.userId),
                      owner: mongoose.Types.ObjectId(resultUser._id),
                      nftID: mongoose.Types.ObjectId(req.body.nftID),
                      bidStatus: "MakeOffer",
                    });
                    if (CheckBid) {
                      await Bid.deleteMany(
                        {
                          bidderID: mongoose.Types.ObjectId(req.userId),
                          owner: mongoose.Types.ObjectId(resultUser._id),
                          nftID: mongoose.Types.ObjectId(req.body.nftID),
                          bidStatus: "MakeOffer",
                        },
                        function (err, bidDel) {
                          if (err) {
                            console.log("Error in deleting Old Bid" + err);
                            return res.reply(messages.error("Failed"));
                          } else {
                            console.log("Old Bid record Deleted" + bidDel);
                          }
                        }
                      );
                    }
                    const bidData = new Bid({
                      bidderID: req.userId,
                      owner: resultUser._id,
                      bidStatus: "MakeOffer",
                      bidPrice: req.body.bidPrice,
                      nftID: req.body.nftID,
                      bidQuantity: req.body.bidQuantity,
                      paymentToken: req.body.paymentToken,
                      buyerSignature: req.body.buyerSignature,
                      bidDeadline: req.body.bidDeadline,
                      isOffer: true,
                      salt: req.body.salt,
                      tokenAddress: req.body.tokenAddress,
                      lastUpdatedOn: Date.now(),
                    });
                    console.log("bidData is--->", bidData);
                    bidData.save().then(async (result) => {
                      return res.reply(messages.created("Offer Placed"), result);
                    }).catch((error) => {
                      console.log("Created Offer error", error);
                      return res.reply(messages.error("Failed"));
                    });
                  }).catch((error) => {
                    console.log("Error in creating User", error)
                    return res.reply(messages.error());
                  });

                } else {

                  console.log("User Found in Database");
                  let CheckBid = await Bid.findOne({
                    bidderID: mongoose.Types.ObjectId(req.userId),
                    owner: mongoose.Types.ObjectId(user._id),
                    nftID: mongoose.Types.ObjectId(req.body.nftID),
                    bidStatus: "MakeOffer",
                  });
                  if (CheckBid) {
                    await Bid.deleteMany(
                      {
                        bidderID: mongoose.Types.ObjectId(req.userId),
                        owner: mongoose.Types.ObjectId(user._id),
                        nftID: mongoose.Types.ObjectId(req.body.nftID),
                        bidStatus: "MakeOffer",
                      },
                      function (err, bidDel) {
                        if (err) {
                          console.log("Error in deleting Old Bid" + err);
                          return res.reply(messages.error("Failed"));
                        } else {
                          console.log("Old Bid record Deleted" + bidDel);
                        }
                      }
                    );
                  }
                  const bidData = new Bid({
                    bidderID: req.userId,
                    owner: user._id,
                    bidStatus: "MakeOffer",
                    bidPrice: req.body.bidPrice,
                    nftID: req.body.nftID,
                    bidQuantity: req.body.bidQuantity,
                    paymentToken: req.body.paymentToken,
                    buyerSignature: req.body.buyerSignature,
                    bidDeadline: req.body.bidDeadline,
                    isOffer: true,
                    salt: req.body.salt,
                    tokenAddress: req.body.tokenAddress,
                    lastUpdatedOn: Date.now(),
                  });
                  console.log("bidData is--->", bidData);
                  bidData.save().then(async (result) => {
                    return res.reply(messages.created("Offer Placed"), result);
                  }).catch((error) => {
                    console.log("Created Offer error", error);
                    return res.reply(messages.error("Failed"));
                  });
                }
              });
          }
        });
    } catch (e) {
      console.log("errr", e);
      return res.reply(messages.error("Offer Failed"));
    }
  }

  async updateBidNft(req, res) {
    console.log("req", req.body);
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      console.log("Checking Old Bids");
      let bidID = req.body.bidID;
      let CheckBid = await Bid.findById(bidID);
      if (CheckBid) {
        if (req.body.action == "Delete" || req.body.action == "Cancelled") {
          await Bid.findOneAndDelete(
            { _id: mongoose.Types.ObjectId(bidID) },
            function (err, delBid) {
              if (err) {
                console.log("Error in Deleting Bid" + err);
                return res.reply(messages.error());
              } else {
                console.log("Bid Deleted : ", delBid);
                return res.reply(messages.created("Bid Cancelled"), delBid);
              }
            }
          );
        } else {
          await Bid.findOneAndUpdate(
            { _id: mongoose.Types.ObjectId(bidID) },
            { bidStatus: req.body.action },
            function (err, rejBid) {
              if (err) {
                console.log("Error in Rejecting Bid" + err);
                return res.reply(messages.error());
              } else {
                console.log("Bid Rejected : ", rejBid);
                return res.reply(messages.created("Bid Rejected"), rejBid);
              }
            }
          );
        }
      } else {
        console.log("Bid Not found");
        return res.reply("Bid Not found");
      }
    } catch (e) {
      console.log("errr", e);
      return res.reply(messages.error());
    }
  }

  async fetchBidNft(req, res) {
    console.log("req", req.body);
    const currentDate = moment.utc().unix();
    console.log("currentDate", currentDate);
    try {
      let nftID = req.body.nftID;
      let orderID = req.body.orderID;
      let buyerID = req.body.buyerID;
      let bidStatus = req.body.bidStatus;
      let oTypeQuery = {};
      let nftIDQuery = {};
      let orderIDQuery = {};
      let buyerIDQuery = {};

      let filters = [];

      if (nftID != "All") {
        nftIDQuery = { nftID: mongoose.Types.ObjectId(nftID) };
      }
      if (orderID != "All") {
        orderIDQuery = { orderID: mongoose.Types.ObjectId(orderID) };
      }
      if (buyerID != "All") {
        buyerIDQuery = { bidderID: mongoose.Types.ObjectId(buyerID) };
      }
      console.log(filters);
      let data = await Bid.aggregate([
        {
          $match: {
            $and: [
              { bidQuantity: { $gte: 1 } },
              { bidStatus: "Bid" },
              nftIDQuery,
              orderIDQuery,
              buyerIDQuery,
            ],
          },
        },
        // {
        //   $addFields: {
        //     offerSort: {
        //       $cond: {
        //         if: {
        //           $eq: [
        //             "$bidStatus",
        //             "Bid"
        //           ]
        //         },
        //         then: 1,
        //         else: 2
        //       }
        //     },
        //     offerDateSort: {
        //       $cond: {
        //         if: {
        //           $gte: [
        //             "$bidDeadline",
        //             currentDate
        //           ]
        //         },
        //         then: 1,
        //         else: 2
        //       }
        //     }
        //   }
        // },
        {
          $project: {
            _id: 1,
            bidderID: 1,
            owner: 1,
            // offerSort: 1,
            // offerDateSort: 1,
            bidStatus: 1,
            bidPrice: 1,
            nftID: 1,
            orderID: 1,
            bidQuantity: 1,
            buyerSignature: 1,
            bidDeadline: 1,
            createdOn: 1,
            lastUpdatedOn: 1,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "bidderID",
            foreignField: "_id",
            as: "bidderID",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
          },
        },
        {
          $lookup: {
            from: "orders",
            localField: "orderID",
            foreignField: "_id",
            as: "orderID",
          },
        },
        {
          $lookup: {
            from: "nfts",
            localField: "nftID",
            foreignField: "_id",
            as: "nftID",
          },
        },
        {
          $sort: {
            // offerSort: 1,
            // offerDateSort: 1,
            bidPrice: -1,
            createdOn: -1,
            lastUpdatedOn: -1,
          },
        },
        { $unwind: "$bidderID" },
        { $unwind: "$owner" },
        {
          $facet: {
            bids: [
              {
                $skip: +0,
              },
            ],
            totalCount: [
              {
                $count: "count",
              },
            ],
          },
        },
      ]);

      console.log("Datat" + data[0].bids.length);
      let iFiltered = data[0].bids.length;
      if (data[0].totalCount[0] == undefined) {
        return res.reply(messages.no_prefix("Bid Details"), {
          data: [],
          draw: req.body.draw,
          recordsTotal: 0,
          recordsFiltered: 0,
        });
      } else {
        return res.reply(messages.no_prefix("Bid Details"), {
          data: data[0].bids,
          draw: req.body.draw,
          recordsTotal: data[0].totalCount[0].count,
          recordsFiltered: iFiltered,
        });
      }
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }


  async fetchOfferNft(req, res) {
    console.log("req in fetchOffer nft", req.body);
    const currentDate = moment.utc().unix();
    try {
      let nftID = req.body.nftID;

      let buyerID = req.body.buyerID;
      let bidStatus = req.body.bidStatus;
      let oTypeQuery = {};
      let nftIDQuery = {};

      let buyerIDQuery = {};

      let filters = [];

      if (bidStatus != "All") {
        oTypeQuery = { bidStatus: bidStatus };
      }
      if (nftID != "All") {
        nftIDQuery = { nftID: mongoose.Types.ObjectId(nftID) };
      }
      if (buyerID != "All") {
        buyerIDQuery = { bidderID: mongoose.Types.ObjectId(buyerID) };
      }
      console.log("filters", oTypeQuery, nftIDQuery);
      let data = await Bid.aggregate([
        {
          $match: {
            $and: [
              { bidQuantity: { $gte: 1 } },
              { isOffer: true },
              oTypeQuery,
              nftIDQuery,
              buyerIDQuery,
            ],
          },
        },
        // {
        //   $addFields: {
        //     offerSort: {
        //       $cond: {
        //         if: {
        //           $eq: [
        //             "$bidStatus",
        //             "MakeOffer"
        //           ]
        //         },
        //         then: 1,
        //         else: 2
        //       }
        //     },
        //     offerDateSort: {
        //       $cond: {
        //         if: {
        //           $gte: [
        //             "$bidDeadline",
        //             currentDate
        //           ]
        //         },
        //         then: 1,
        //         else: 2
        //       }
        //     }
        //   }
        // },
        {
          $project: {
            _id: 1,
            bidderID: 1,
            owner: 1,
            bidStatus: 1,
            bidPrice: 1,
            nftID: 1,
            // offerSort: 1,
            // offerDateSort: 1,
            bidQuantity: 1,
            buyerSignature: 1,
            bidDeadline: 1,
            isOffer: 1,
            tokenAddress: 1,
            paymentToken: 1,
            salt: 1,
            createdOn: 1,
            lastUpdatedOn: 1,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "bidderID",
            foreignField: "_id",
            as: "bidderID",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
          },
        },
        {
          $lookup: {
            from: "nfts",
            localField: "nftID",
            foreignField: "_id",
            as: "nftID",
          },
        },

        {
          $sort: {
            // offerSort: 1,
            // offerDateSort: 1,
            bidPrice: -1,
            createdOn: -1,
            lastUpdatedOn: -1,
          },
        },
        { $unwind: "$bidderID" },
        { $unwind: "$owner" },
        {
          $facet: {
            bids: [
              {
                $skip: +0,
              },
            ],
            totalCount: [
              {
                $count: "count",
              },
            ],
          },
        },
      ]);

      console.log("Data" + data[0].bids.length);
      let iFiltered = data[0].bids.length;
      if (data[0].totalCount[0] == undefined) {
        return res.reply(messages.no_prefix("Offer Details"), {
          data: [],
          draw: req.body.draw,
          recordsTotal: 0,
          recordsFiltered: 0,
        });
      } else {
        return res.reply(messages.no_prefix("Offer Details"), {
          data: data[0].bids,
          draw: req.body.draw,
          recordsTotal: data[0].totalCount[0].count,
          recordsFiltered: iFiltered,
        });
      }
    } catch (error) {
      console.log("error is", error);
      return res.reply(messages.server_error());
    }
  }

  async acceptBidNft(req, res) {
    console.log("req", req.body);
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      if (!req.body.bidID)
        return res.reply(messages.bad_request(), "Bid is required.");

      console.log("Checking Old Bids");
      let ERC721 = req.body.erc721;
      let bidID = req.body.bidID;
      let status = req.body.status;
      let qty_sold = req.body.qty_sold;
      let BidData = await Bid.findById(bidID);
      if (BidData) {
        let isblocked = await validators.isBlockedNFT(req.body.nftID);
        if (isblocked === -1) {
          return res.reply(messages.server_error("Query "));
        } else if (isblocked === 0) {
          return res.reply(messages.blocked("NFT"));
        } else if (isblocked === -2) {
          return res.reply(messages.not_found("NFT/Collection"));
        } else if (isblocked === 1) {
          if (BidData.bidStatus === "Bids") {
            let nftID = BidData.nftID;
            let orderId = BidData.orderID;
            let boughtQty = parseInt(BidData.bidQuantity);
            let bidderID = BidData.bidderID;
            let BuyerData = await User.findById(bidderID);
            let buyer = BuyerData.walletAddress;
            let owner = BidData.owner;
            console.log("owner", owner);
            let OwnerData = await User.findById(owner);
            let seller = OwnerData.walletAddress;

            console.log("seller", seller, nftID);
            await Order.updateOne(
              { _id: orderId },
              {
                $set: {
                  status: status,
                  quantity_sold: qty_sold,
                },
              },
              {
                upsert: true,
              },
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
                    address: buyer.toLowerCase(),
                    quantity: 1,
                  });
                  updateNFTData = { ownedBy: OwnedBy }
                  await NFT.findOneAndUpdate({ _id: mongoose.Types.ObjectId(nftID) },
                    { $set: updateNFTData }, { new: true }, async function (err, updateNFT) { });
                } else {
                  //deduct previous owner

                  let _NFT = await NFT.find({
                    _id: mongoose.Types.ObjectId(nftID),
                    "ownedBy.address": seller,
                  }).select("ownedBy -_id");
                  console.log("_NFT-------->", _NFT);
                  let currentQty;
                  if (_NFT.length > 0)
                    currentQty = _NFT[0].ownedBy.find(
                      (o) => o.address === seller.toLowerCase()
                    ).quantity;

                  let leftQty = currentQty - boughtQty;
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
                    });
                  } else {
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

                    let ownedQty = currentQty + boughtQty;
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


            await Bid.findOneAndUpdate(
              {
                _id: mongoose.Types.ObjectId(bidID),
              },
              { bidStatus: "Accepted" },
              function (err, acceptBid) {
                if (err) {
                  console.log("Error in Accepting Bid" + err);
                  return res.reply(messages.error());
                } else {
                  console.log("Bid Accepted : ", acceptBid);
                }
              }
            );
            if (ERC721) {
              await Bid.deleteMany({
                owner: mongoose.Types.ObjectId(owner),
                nftID: mongoose.Types.ObjectId(nftID),
                bidStatus: "Bid",
              })
                .then(function () {
                  console.log("Bids Data deleted Code");
                })
                .catch(function (error) {
                  console.log(error);
                });

              await Bid.deleteMany({
                nftID: mongoose.Types.ObjectId(nftID),
                bidderID: mongoose.Types.ObjectId(BuyerData._id),
                bidStatus: "MakeOffer",
              }).then(function () {
                console.log("MakeOffer Data deleted Code");
              }).catch(function (error) {
                console.log("Error in Bid Delete 2", error);
              });
              await Bid.updateMany({ nftID: mongoose.Types.ObjectId(nftID), bidStatus: "MakeOffer", }, { bidderID: mongoose.Types.ObjectId(BuyerData._id) }).then(function () {
                console.log("Bid Offer Data Owner Updated UpdateOrder");
              }).catch(function (error) {
                console.log("Error in Bid Offer Data Owner Updated UpdateOrder", error);
              });

            } else {
              let _order = await Order.findOne({
                _id: mongoose.Types.ObjectId(orderId),
              });
              let leftQty = _order.quantity - qty_sold;
              if (leftQty <= 0) {
                await Order.deleteOne({ _id: mongoose.Types.ObjectId(orderId) });
              }
              console.log("left qty 1155", leftQty);
              await Bid.deleteMany({
                owner: mongoose.Types.ObjectId(owner),
                nftID: mongoose.Types.ObjectId(nftID),
                bidStatus: "Bid",
                bidQuantity: { $gt: leftQty },
              }).then(function () {
                console.log("Data deleted from 1155");
              }).catch(function (error) {
                console.log(error);
              });

              await Bid.deleteMany({
                nftID: mongoose.Types.ObjectId(nftID),
                bidderID: mongoose.Types.ObjectId(BuyerData._id),
                bidStatus: "MakeOffer",
              }).then(function () {
                console.log("MakeOffer Data deleted Code 2");
              }).catch(function (error) {
                console.log("Error in Bid Delete 2", error);
              });
              await Bid.updateMany({ nftID: mongoose.Types.ObjectId(nftID), bidStatus: "MakeOffer", }, { bidderID: mongoose.Types.ObjectId(BuyerData._id) }).then(function () {
                console.log("Bid Offer Data Owner Updated UpdateOrder");
              }).catch(function (error) {
                console.log("Error in Bid Offer Data Owner Updated UpdateOrder", error);
              });
            }
            return res.reply(messages.updated("order"));
          } else {
            console.log("Bid Not found");
            return res.reply(messages.not_found("Bid"));
          }

        }
      } else {
        console.log("Bid Not found");
        return res.reply(messages.not_found("Bid"));
      }
    } catch (e) {
      console.log("errr", e);
      return res.reply(messages.error());
    }
  }

  async acceptOfferNft(req, res) {
    console.log("req", req.body);
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      if (!req.body.bidID)
        return res.reply(messages.bad_request(), "Bid is required.");

      console.log("Checking Old Bids");
      let ERC721 = req.body.erc721;
      let bidID = req.body.bidID;
      let status = req.body.status;
      let qty_sold = req.body.qty_sold;
      let BidData = await Bid.findById(bidID);
      console.log("bid", BidData)
      if (BidData) {
        let isblocked = await validators.isBlockedNFT(req.body.nftID);
        if (isblocked === -1) {
          return res.reply(messages.server_error("Query "));
        } else if (isblocked === 0) {
          return res.reply(messages.blocked("NFT"));
        } else if (isblocked === -2) {
          return res.reply(messages.not_found("NFT/Collection"));
        } else if (isblocked === 1) {
          if (BidData.bidStatus === "MakeOffer") {
            let nftID = req.body.nftID;
            let boughtQty = parseInt(BidData.bidQuantity);
            let bidderID = BidData.bidderID;
            let BuyerData = await User.findById(bidderID);
            let buyer = BuyerData.walletAddress;
            let owner = BidData.owner;
            console.log("owner", owner);
            let OwnerData = await User.findById(owner);
            let seller = OwnerData.walletAddress;

            console.log("seller", seller, nftID);


            await NFT.findOne({ _id: mongoose.Types.ObjectId(nftID) },
              async (err, checkNFT) => {
                if (err) {
                  return res.reply(messages.error());
                }
                if (!checkNFT) {
                  return res.reply(messages.error());
                }
                if (checkNFT?.type === 1) {
                  console.log("saved from this", req.body.amount)
                  let transaction = new Transaction({
                    nftID: nftID,
                    collectionAddress: BidData.tokenAddress,
                    sellerID: BidData.owner,
                    quantity_sold: boughtQty,
                    price: req.body.amount,
                    tokenID: checkNFT?.tokenID,
                    paymentToken: BidData.paymentToken,
                    hash: BidData.hash,
                  });
                  transaction.save(async function (saveerr, transactionSaveResult) {
                    if (saveerr) {
                      console.log("Created NFT error", saveerr);
                    }
                    if (transactionSaveResult) {
                      console.log("Created NFT Success", transactionSaveResult);
                    }
                  });

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

                  let _NFT = await NFT.find({
                    _id: mongoose.Types.ObjectId(nftID),
                    "ownedBy.address": seller,
                  }).select("ownedBy -_id");
                  console.log("_NFT-------->", _NFT);
                  let currentQty;
                  if (_NFT.length > 0)
                    currentQty = _NFT[0].ownedBy.find(
                      (o) => o.address === seller.toLowerCase()
                    ).quantity;

                  let leftQty = parseInt(currentQty) - parseInt(boughtQty);
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
                    });
                  } else {
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
              })



            await Bid.findOneAndUpdate(
              {
                _id: mongoose.Types.ObjectId(bidID),
              },
              { bidStatus: "Accepted" },
              function (err, acceptBid) {
                if (err) {
                  console.log("Error in Accepting Offer" + err);
                  return res.reply(messages.error());
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
              console.log("Bid Data deleted");
            }).catch(function (error) {
              console.log("Bid Data deleted Error", error);
            });

            await Bid.deleteMany({
              nftID: mongoose.Types.ObjectId(nftID),
              bidderID: mongoose.Types.ObjectId(BuyerData._id),
              bidStatus: "MakeOffer",
            }).then(function () {
              console.log("Offer Delete 55",);
            }).catch(function (error) {
              console.log("Error in Bid Delete 3", error);
            });

            await Bid.updateMany({ nftID: mongoose.Types.ObjectId(nftID), bidStatus: "MakeOffer", }, { bidderID: mongoose.Types.ObjectId(BuyerData._id) }).then(function () {
              console.log("Bid Offer Data Owner Updated UpdateOrder");
            }).catch(function (error) {
              console.log("Error in Bid Offer Data Owner Updated UpdateOrder", error);
            });

            await Order.deleteMany({
              nftID: mongoose.Types.ObjectId(nftID),
            }).then(function () {
              console.log("Order Data deleted");
            }).catch(function (error) {
              console.log("Order Data deleted Error", error);
            });

            return res.reply(messages.updated("order"));
          } else {
            console.log("Offer Not found");
            return res.reply(messages.not_found("Offer"));
          }
        }
      } else {
        console.log("Offer Not found");
        return res.reply(messages.not_found("Offer"));
      }
    } catch (e) {
      console.log("errr", e);
      return res.reply(messages.error());
    }
  }

  async fetchUserNftData(req, res) {
    console.log("req", req.body);
    try {
      let nftID = req.body.nftID;
      let orderID = req.body.orderID;
      let buyerID = req.body.buyerID;
      let bidStatus = req.body.bidStatus;
      let oTypeQuery = {};
      let nftIDQuery = {};
      let orderIDQuery = {};
      let buyerIDQuery = {};

      let filters = [];

      if (nftID != "All") {
        nftIDQuery = { nftID: mongoose.Types.ObjectId(nftID) };
      }
      if (orderID != "All") {
        orderIDQuery = { orderID: mongoose.Types.ObjectId(orderID) };
      }
      if (buyerID != "All") {
        buyerIDQuery = { bidderID: mongoose.Types.ObjectId(buyerID) };
      }
      console.log(filters);
      let data = await Bid.aggregate([
        {
          $match: {
            $and: [
              { bidQuantity: { $gte: 1 } },
              { bidStatus: "Bid" },
              nftIDQuery,
              orderIDQuery,
              buyerIDQuery,
            ],
          },
        },
        {
          $project: {
            _id: 1,
            bidderID: 1,
            owner: 1,
            bidStatus: 1,
            bidPrice: 1,
            nftID: 1,
            orderID: 1,
            bidQuantity: 1,
            buyerSignature: 1,
            bidDeadline: 1,
            createdOn: 1,
            lastUpdatedOn: 1,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "bidderID",
            foreignField: "_id",
            as: "bidderID",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
          },
        },
        {
          $lookup: {
            from: "orders",
            localField: "orderID",
            foreignField: "_id",
            as: "orderID",
          },
        },
        {
          $sort: {
            bidPrice: -1,
            createdOn: -1,
            lastUpdatedOn: -1,
          },
        },
        { $unwind: "$bidderID" },
        { $unwind: "$owner" },
        {
          $facet: {
            bids: [
              {
                $skip: +0,
              },
            ],
            totalCount: [
              {
                $count: "count",
              },
            ],
          },
        },
      ]);

      console.log("Datat" + data[0].bids.length);
      let iFiltered = data[0].bids.length;
      if (data[0].totalCount[0] == undefined) {
        return res.reply(messages.no_prefix("Bid Details"), {
          data: [],
          draw: req.body.draw,
          recordsTotal: 0,
          recordsFiltered: 0,
        });
      } else {
        return res.reply(messages.no_prefix("Bid Details"), {
          data: data[0].bids,
          draw: req.body.draw,
          recordsTotal: data[0].totalCount[0].count,
          recordsFiltered: iFiltered,
        });
      }
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  async deleteBids(req, res) {
    console.log("req", req.body);
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      if (!req.body.orderID)
        return res.reply(messages.bad_request(), "Order ID is required.");

      let orderID = req.body.orderID;
      await Bid.deleteMany({ orderID: mongoose.Types.ObjectId(orderID), bidStatus: "Bid", })
        .then(function () {
          console.log("Bids Data deleted Code");
          return res.reply(messages.updated("order"));
        })
        .catch(function (error) {
          console.log("Bids Data deleted Error", error);
          return res.reply(messages.error());
        });
    } catch (e) {
      console.log("errr", e);
      return res.reply(messages.error());
    }
  }

  async deleteOffers(req, res) {
    console.log("req", req.body);
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      if (!req.body.nftID)
        return res.reply(messages.bad_request(), "NFT ID is required.");

      let nftID = req.body.nftID;
      await Bid.deleteMany({ nftID: mongoose.Types.ObjectId(nftID), bidStatus: "MakeOffer", })
        .then(function () {
          console.log("Offer Data deleted Code");
          return res.reply(messages.updated("order"));
        })
        .catch(function (error) {
          console.log("Offer Data deleted Error", error);
          return res.reply(messages.error());
        });
    } catch (e) {
      console.log("errr", e);
      return res.reply(messages.error());
    }
  }

  async deleteBidsByBidId(req, res) {
    console.log("req", req.body);
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      if (!req.body.bidID)
        return res.reply(messages.bad_request(), "Order ID is required.");

      let bidID = req.body.bidID;
      await Bid.deleteMany({ _id: mongoose.Types.ObjectId(bidID) })
        .then(function () {
          console.log("Bids Data deleted Code");
          return res.reply(messages.updated("order"));
        })
        .catch(function (error) {
          console.log("Bids Data deleted Error", error);
          return res.reply(messages.error());
        });
    } catch (e) {
      console.log("errr", e);
      return res.reply(messages.error());
    }
  }

  async checkBidOffer(req, res) {
    console.log("req", req.body);
    try {
      if (!req.body.recordID)
        return res.reply(messages.bad_request(), "Record ID is required.");
      console.log("Checking Offer");
      let recordID = req.body.recordID;
      Bid.find({ _id: mongoose.Types.ObjectId(recordID), $or: [{ bidStatus: "MakeOffer" }, { bidStatus: "Bid" }] }, async function (err, recData) {
        if (err) {
          return res.reply(messages.server_error("Data"));
        } else {
          console.log("recData", recData)
          if (recData.length == 0) {
            return res.reply(messages.not_found("Data"));
          } else {
            return res.reply(messages.successfully("Data Found"), recData);
          }
        }
      });
    } catch (e) {
      console.log("errr", e);
      return res.reply(messages.error());
    }
  }

  async updateBidsOfferStatus(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());

      console.log("inside update Bid Hash Status", req.body)
      if (!req.userId) return res.reply(messages.unauthorized());
      let bidID = req.body.bidID;
      let hash = req.body.hash;
      let hashStatus = req.body.hashStatus;
      let processType = req.body.processType;
      let CheckBid = await Bid.findById(bidID);
      if (CheckBid) {
        await Bid.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(bidID) },
          { hash: hash, hashStatus: hashStatus, processType: processType },
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
}
module.exports = BidController;
