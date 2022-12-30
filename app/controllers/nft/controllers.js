const fs = require("fs");
const https = require("https");
const http = require("http");
const axios = require('axios');
const { NFT, Collection, User, Bid, Order, Brand, Category, MintCollection, } = require("../../models");
const pinataSDK = require("@pinata/sdk");
const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");

const PriceFeedAbi = require("./../../../abis/priceFeed.json")
const pinata = pinataSDK(
  process.env.PINATAAPIKEY,
  process.env.PINATASECRETAPIKEY
);
const mongoose = require("mongoose");
const validators = require("../helpers/validators");
var jwt = require("jsonwebtoken");
const e = require("express");
const { env } = require("process");

const Web3 = require("web3");
var web3 = new Web3(process.env.NETWORK_RPC_URL);
const erc721Abi = require("./../../../abis/extendedERC721.json");
const erc1155Abi = require("./../../../abis/extendedERC1155.json");
const nftMetaBaseURL = process.env.NFT_META_BASE_URL;
const chainID = process.env.CHAIN_ID;
const postAPIURL = process.env.NFT_META_POST_URL;
const timeInterval = process.env.TIMEINTERVAL;

const helperFunctions = require("../helpers/functions");
const { BroadcastChannel } = require("worker_threads");

// Set S3 endpoint to DigitalOcean Spaces
const spacesEndpoint = new aws.Endpoint(process.env.BUCKET_ENDPOINT);
const s3 = new aws.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.BUCKET_ACCESS_KEY_ID,
  secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY,
});

const storage = multerS3({
  s3: s3,
  bucket: process.env.BUCKET_NAME,
  acl: "public-read",
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (request, file, cb) {
    console.log("Request", request.body);
    let destination = "";
    if (request?.body?.collectionAddress !== undefined) {
      destination += request?.body?.collectionAddress + '/';
    }
    if (request?.body?.fileType !== undefined) {
      destination += 'image/';
    }
    var fileExtension = file.originalname.split('.').pop();
    if (request?.body?.tokenID !== undefined) {
      destination += request?.body?.tokenID + '.' + fileExtension;
    }
    var fullPath = "";
    if (destination === "") {
      destination = "collectionImages/";
      var newFileName = Date.now() + "-" + file.originalname;
      fullPath = destination + newFileName;
    } else {
      fullPath = destination;
    }
    cb(null, fullPath);
  },
});

var allowedMimes;
var errAllowed;

let fileFilter = function (req, file, cb) {
  console.log("Type ", file.mimetype);
  if (allowedMimes.includes(file.mimetype)) {
    console.log("Allowed ");
    cb(null, true);
  } else {
    console.log("Not Allowed ");
    cb(
      {
        success: false,
        message: `Invalid file type! Only ${errAllowed}  files are allowed.`,
      },
      false
    ); nftData[0].previewImg = newJSON[0]?.S3Images?.S3Image300;
    nftData[0].image = newJSON[0]?.S3Images?.S3Image700;
    nftData[0].originalImage = newJSON[0]?.S3Images?.S3Image;
    nftData[0].animation_url = newJSON[0]?.S3Images?.S3Animation;
  }
};

let oMulterObj = {
  storage: storage,
  limits: {
    fileSize: 2000 * 1024 * 1024,
  },
  fileFilter: fileFilter,
};

const uploadBanner = multer(oMulterObj);

class NFTController {
  constructor() { }

  async createNFT(req, res, next) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      allowedMimes = [
        "image/jpeg",
        "video/mp4",
        "image/jpg",
        "image/webp",
        "image/png",
        "image/gif",
        "model/glTF+json",
        "model/gltf+json",
        "model/gltf-binary",
        "application/octet-stream",
        "audio/mp3",
        "audio/mpeg",
      ];
      errAllowed = "JPG, JPEG, PNG, GIF, GLTF, GLB MP3, WEBP & MPEG";

      uploadBanner.fields([{ name: "nftFile", maxCount: 1 }, { name: "previewImg", maxCount: 1 }])(req, res, async function (error) {
        console.log("Here 22222");
        if (error) {
          log.red(error);
          return res.reply(messages.bad_request(error.message));
        } else {
          console.log("Here");
          log.green(req.body);
          if (req.files.nftFile != "" && req.files.nftFile != undefined) {
            log.green(req.files.nftFile[0].location);
          }
          if (req.files.previewImg != "" && req.files.previewImg != undefined) {
            log.green(req.files.previewImg[0].location);
          }
          if (!req.body.creatorAddress) {
            return res.reply(messages.not_found("Creator Wallet Address"));
          }
          if (!req.body.name) {
            return res.reply(messages.not_found("Title"));
          }
          if (!validators.isValidString(req.body.name)) {
            return res.reply(messages.invalid("Title"));
          }
          if (!req.body.quantity) {
            return res.reply(messages.not_found("Quantity"));
          }
          if (isNaN(req.body.quantity) || !req.body.quantity > 0) {
            return res.reply(messages.invalid("Quantity"));
          }
          if (req.body.description.trim().length > 1000) {
            return res.reply(messages.invalid("Description"));
          }
          let nftElement = req.body;
          let s3JsonURL = "";
          let previewImgURL = req.files.previewImg ? req.files.previewImg[0].location : "";
          let nftFileURL = req.files.nftFile ? req.files.nftFile[0].location : "";

          if (
            nftFileURL.indexOf("http://") == 0 ||
            nftFileURL.indexOf("https://") == 0
          ) {
          } else {
            nftFileURL = "https://" + nftFileURL;
          }
          console.log("fileURL", nftFileURL);

          let s3UploadingData = {};
          s3UploadingData = {
            id: "#" + nftElement.tokenID,
            name: nftElement.name,
            token_id: nftElement.tokenID,
            description: nftElement.description,
            attributes: JSON.parse(nftElement.attributes),
            collectionAddress: nftElement.collectionAddress,
            previewImg: nftElement.collectionAddress,
          };
          if (nftElement.fileType === "Image") {
            s3UploadingData.previewImg = nftFileURL;
            s3UploadingData.image = nftFileURL;
          } else {
            s3UploadingData.previewImg = previewImgURL;
            s3UploadingData.animation_url = nftFileURL;
          }

          let s3destination = "";
          if (nftElement?.collectionAddress !== undefined) {
            s3destination += nftElement?.collectionAddress + '/';
          }
          if (nftElement?.tokenID !== undefined) {
            s3destination += 'json/' + nftElement?.tokenID + ".json";
          }

          try {
            const params = {
              Bucket: process.env.BUCKET_NAME,
              Key: s3destination,
              Body: JSON.stringify(s3UploadingData),
              ContentType: 'application/json',
            };
            const result = await s3.putObject(params).promise();
            s3JsonURL = 'https://' + process.env.BUCKET_NAME + '.s3.amazonaws.com/' + s3destination;
          } catch (error) {
            console.log('error', error);
          }

          Collection.find(
            { _id: mongoose.Types.ObjectId(nftElement.collectionID) },
            async function (err, collectionData) {
              if (err) {
                return res.reply(messages.server_error("Collection"));
              } else {
                if (collectionData.length > 0) {

                  let newFileURl = nftFileURL;

                  let nft = new NFT({
                    name: nftElement.name,
                    description: nftElement.description,
                    image: newFileURl,
                    metaDatahash: "",
                    fileType: nftElement.fileType,
                    tokenID: nftElement.tokenID,
                    collectionID: nftElement.collectionID,
                    collectionAddress: nftElement.collectionAddress,
                    totalQuantity: nftElement.quantity,
                    isImported: nftElement.isImported,
                    type: nftElement.type,
                    s3JsonURL: s3JsonURL,
                    isMinted: nftElement.isMinted,
                    hash: req.body.hash,
                    previewImg: previewImgURL,
                    hashStatus: req.body.hashStatus,
                    ownedBy: [],
                  });
                  if (
                    collectionData[0].brandID !== undefined &&
                    collectionData[0].brandID !== ""
                  ) {
                    nft.brandID = collectionData[0].brandID;
                  }
                  if (
                    collectionData[0].categoryID !== undefined &&
                    collectionData[0].categoryID !== ""
                  ) {
                    nft.categoryID = collectionData[0].categoryID;
                  }
                  console.log("Attr1", req.body.attributes);
                  console.log("Attr", nftElement.attributes);
                  let NFTAttr = JSON.parse(nftElement.attributes);
                  console.log("NFTARRAY ", NFTAttr.length);
                  if (NFTAttr.length > 0) {
                    NFTAttr.forEach((obj) => {
                      console.log("OBJ", obj);
                      nft.attributes.push(obj);
                    });
                  }
                  nft.ownedBy.push({
                    address: nftElement.creatorAddress,
                    quantity: nftElement.quantity,
                  });
                  nft.save(async function (saveerr, nftSaveResult) {
                    if (saveerr) {
                      console.log("Created NFT error", saveerr);
                      return res.reply(messages.error());
                    }
                    if (nftSaveResult) {
                      helperFunctions.increaseNFTCount(collectionData[0]._id);
                    }
                    return res.reply(messages.created("NFT"), nftSaveResult);
                  });

                  // NFT.find(
                  //   {
                  //     name: nftElement.name,
                  //     collectionID: mongoose.Types.ObjectId(
                  //       nftElement.collectionID
                  //     ),
                  //     collectionAddress: nftElement.collectionAddress,
                  //   },
                  //   async function (err, nftData) {
                  //     if (err) {
                  //       return res.reply(messages.server_error("NFT"));
                  //     } else {
                  //       if (nftData.length > 0) {
                  //         return res.reply(messages.already_exists("NFT Name"));
                  //       } else {

                  //       }
                  //     }
                  //   }
                  // );
                } else {
                  return res.reply(messages.not_found("Collection"));
                }
              }
            }
          );
        }
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  async createCollection(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      errAllowed = "JPG, JPEG, PNG, GIF, WEBP";

      uploadBanner.fields([
        { name: "logoImage", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
      ])(req, res, async function (error) {
        if (error) {
          log.red(error);
          console.log("Error ");
          return res.reply(messages.bad_request(error.message));
        } else {
          console.log("Here");
          log.green(req.body);
          if (
            req.files.logoImage != "" &&
            req.files.logoImage != undefined &&
            req.files.coverImage != "" &&
            req.files.coverImage != undefined
          ) {
            log.green(req.files.logoImage[0].location);
            log.green(req.files.coverImage[0].location);
          }

          if (!req.body.name) {
            return res.reply(messages.not_found("Collection Name"));
          }
          if (!validators.isValidString(req.body.name)) {
            return res.reply(messages.invalid("Collection Name"));
          }
          if (req.body.description != "" && req.body.description != undefined)
            if (req.body.description.trim().length > 1000) {
              return res.reply(messages.invalid("Description"));
            }
          const collection = new Collection({
            name: req.body.name,
            symbol: req.body.symbol,
            description: req.body.description,
            type: req.body.type,
            royaltyPercentage: req.body.royalty,
            contractAddress: req.body.contractAddress,
            logoImage: req.files.logoImage
              ? req.files.logoImage[0].location
              : "",
            coverImage: req.files.coverImage
              ? req.files.coverImage[0].location
              : "",
            categoryID: req.body.categoryID,
            brandID: req.body.brandID,
            preSaleStartTime: req.body.preSaleStartTime,
            preSaleEndTime: req.body.preSaleEndTime,
            preSaleTokenAddress: req.body.preSaleTokenAddress,
            totalSupply: req.body.totalSupply,
            nextId: 0,
            price: req.body.price,
            createdBy: req.userId,
            isOnMarketplace: req.body.isOnMarketplace,
            isImported: req.body.isImported,
            isMinted: req.body.isMinted,
            link: req.body.link,
            hash: req.body.hash,
            hashStatus: req.body.hashStatus,
          });

          await Collection.findOne({ name: req.body.name },
            async (err, record) => {
              if (err) {
                console.log("Error in fetching Collection Records ", err)
              }
              if (!record) {
                collection.save().then((result) => {
                  console.log("collection created", result)
                  return res.reply(messages.created("Collection"), result);
                }).catch((error) => {
                  console.log(error);
                  return res.reply(error);
                });
              } else {
                return res.reply(messages.already_exists("Collection Name"), record);
              }
            }
          )
        }
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  async getCollections(req, res) {
    try {
      let data = [];
      const page = parseInt(req.body.page);
      const limit = parseInt(req.body.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      let collectionID = "";
      if (req.body.collectionID && req.body.collectionID !== undefined) {
        collectionID = req.body.collectionID;
      }
      let userID = "";
      if (req.body.userID && req.body.userID !== undefined) {
        userID = req.body.userID;
      }
      let categoryID = "";
      if (req.body.categoryID && req.body.categoryID !== undefined) {
        categoryID = req.body.categoryID;
      }
      let brandID = "";
      if (req.body.brandID && req.body.brandID !== undefined) {
        brandID = req.body.brandID;
      }
      let ERCType = "";
      if (req.body.ERCType && req.body.ERCType !== undefined) {
        ERCType = req.body.ERCType;
      }
      let searchText = "";
      if (req.body.searchText && req.body.searchText !== undefined) {
        searchText = req.body.searchText;
      }
      let filterString = "";
      if (req.body.filterString && req.body.filterString !== undefined) {
        filterString = req.body.filterString;
      }
      let isMinted = "";
      if (req.body.isMinted && req.body.isMinted !== undefined) {
        isMinted = req.body.isMinted;
      }
      let isHotCollection = "";
      if (req.body.isHotCollection && req.body.isHotCollection !== undefined) {
        isHotCollection = req.body.isHotCollection;
      }
      let isExclusive = "";
      if (req.body.isExclusive && req.body.isExclusive !== undefined) {
        isExclusive = req.body.isExclusive;
      }
      let isOnMarketplace = "";
      if (req.body.isOnMarketplace && req.body.isOnMarketplace !== undefined) {
        isOnMarketplace = req.body.isOnMarketplace;
      }

      let contractAddress = "";
      if (req.body.contractAddress && req.body.contractAddress !== undefined) {
        contractAddress = req.body.contractAddress;
      }

      let searchArray = [];
      searchArray["status"] = 1;
      searchArray["hashStatus"] = 1;
      if (collectionID !== "") {
        searchArray["_id"] = mongoose.Types.ObjectId(collectionID);
      }
      if (contractAddress !== "" && contractAddress != undefined) {
        searchArray["contractAddress"] = contractAddress;
      }
      if (userID !== "") {
        searchArray["createdBy"] = mongoose.Types.ObjectId(userID);
      }
      if (categoryID !== "") {
        searchArray["categoryID"] = mongoose.Types.ObjectId(categoryID);
      }
      if (brandID !== "") {
        searchArray["brandID"] = mongoose.Types.ObjectId(brandID);
      }
      if (isMinted !== "") {
        searchArray["isMinted"] = isMinted;
      }
      if (isHotCollection !== "") {
        searchArray["isHotCollection"] = isHotCollection;
      }
      if (isExclusive !== "") {
        searchArray["isExclusive"] = isExclusive;
      }
      if (ERCType !== "") {
        searchArray["type"] = ERCType;
      }
      if (filterString !== "") {
        searchArray["salesCount"] = { $gte: 0 };
      }
      if (isOnMarketplace !== "") {
        searchArray["isOnMarketplace"] = isOnMarketplace;
      }
      if (searchText !== "") {
        let searchKey = new RegExp(searchText, "i");
        searchArray["$or"] = [
          { name: searchKey },
          // { contractAddress: searchKey },
        ];
        // searchArray["or"] =  [{ contractAddress:searchKey }];
      }
      let searchObj = Object.assign({}, searchArray);

      console.log("Obj", searchObj);
      const results = {};
      if (endIndex < (await Collection.countDocuments(searchObj).exec())) {
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

      await Collection.find(searchObj)
        .populate("categoryID")
        .populate("brandID")
        .sort({ createdOn: -1 })
        .limit(limit)
        .skip(startIndex)
        .lean()
        .exec()
        .then((res) => {
          data.push(res);
        })
        .catch((e) => {
          console.log("Error", e);
        });
      results.count = await Collection.countDocuments(searchObj).exec();
      results.results = data;
      res.header("Access-Control-Max-Age", 600);
      return res.reply(messages.success("Collection List"), results);
    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }

  async myCollections(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      let data = [];
      const page = parseInt(req.body.page);
      const limit = parseInt(req.body.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      let searchText = "";
      if (req.body.searchText && req.body.searchText !== undefined) {
        searchText = req.body.searchText;
      }
      let collectionID = "";
      if (req.body.collectionID && req.body.collectionID !== undefined) {
        collectionID = req.body.collectionID;
      }
      let searchArray = [];
      searchArray["createdBy"] = mongoose.Types.ObjectId(req.userId);
      if (collectionID !== "") {
        searchArray["_id"] = mongoose.Types.ObjectId(collectionID);
      }
      if (searchText !== "") {
        searchText = searchText.replace(/[-[\]{}()*+?.,\\^\s]/g, '\\$&');
        searchArray["$or"] = [
          { name: { $regex: new RegExp(searchText), $options: "i" } },
          { contractAddress: { $regex: new RegExp(searchText), $options: "i" } },
        ];
      }
      let searchObj = Object.assign({}, searchArray);

      const results = {};
      if (endIndex < (await Collection.countDocuments(searchObj).exec())) {
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

      await Collection.find(searchObj)
        .populate("categoryID")
        .populate("brandID")
        .sort({ createdOn: -1 })
        .limit(limit)
        .skip(startIndex)
        .lean()
        .exec()
        .then((res) => {
          data.push(res);
        })
        .catch((e) => {
          console.log("Error", e);
        });
      results.count = await Collection.countDocuments(searchObj).exec();
      results.results = data;
      res.header("Access-Control-Max-Age", 600);
      return res.reply(messages.success("Collection List"), results);
    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }

  async allCollections(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      let data = [];
      const page = parseInt(req.body.page);
      const limit = parseInt(req.body.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      let searchText = "";
      if (req.body.searchText && req.body.searchText !== undefined) {
        searchText = req.body.searchText;
      }

      let searchArray = [];
      searchText = searchText.replace(/[-[\]{}()*+?.,\\^\s]/g, '\\$&');
      if (searchText !== "") {
        searchArray["$or"] = [
          { name: { $regex: new RegExp(searchText), $options: "i" } },
          { contractAddress: { $regex: new RegExp(searchText), $options: "i" } },
        ];
      }
      let searchObj = Object.assign({}, searchArray);

      const results = {};
      if (endIndex < (await Collection.countDocuments(searchObj).exec())) {
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

      await Collection.find(searchObj)
        .populate("categoryID")
        .populate("brandID")
        .sort({ createdOn: -1 })
        .limit(limit)
        .skip(startIndex)
        .lean()
        .exec()
        .then((res) => {
          data.push(res);
        })
        .catch((e) => {
          console.log("Error", e);
        });
      results.count = await Collection.countDocuments(searchObj).exec();
      results.results = data;
      res.header("Access-Control-Max-Age", 600);
      return res.reply(messages.success("Collection List"), results);
    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }

  async importNFT(req, res, next) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      let creatorID = req.userId;
      console.log("creatorID", creatorID);
      if (!req.body.nftData) {
        return res.reply(messages.not_found("NFT Data"));
      }
      let nftElement = req.body.nftData;
      if (!nftElement.owner) {
        return res.reply(messages.required_field("Wallet Address"));
      }
      await User.findOne(
        {
          walletAddress: _.toChecksumAddress(nftElement.owner),
        },
        (err, user) => {
          if (err) return res.reply(messages.error());
          if (!user) {
            const user = new User({
              walletAddress: _.toChecksumAddress(
                nftElement.owner?.toLowerCase()
              ),
            });
            user
              .save()
              .then((result) => {
                console.log("User Created", result);
              })
              .catch((error) => {
                console.log("Error in creating User", error);
              });
          }
        }
      );
      console.log("collection ID", nftElement.collectionID);
      Collection.find({ _id: mongoose.Types.ObjectId(nftElement.collectionID) },
        async function (err, collectionData) {
          if (err) {
            return res.reply(messages.server_error("Collection"));
          } else {
            console.log("Collection Data", collectionData.length)
            if (collectionData.length > 0) {
              NFT.find(
                {
                  name: nftElement.name,
                  collectionID: mongoose.Types.ObjectId(
                    nftElement.collectionID
                  ),
                  collectionAddress: nftElement.collectionAddress,
                },
                async function (err, nftData) {
                  console.log("collectionData", collectionData);
                  if (err) {
                    return res.reply(messages.server_error("NFT"));
                  } else {
                    if (nftData?.length > 10) {
                      return res.reply(messages.already_exists("NFT Name"));
                    } else {
                      console.log("collectionData", collectionData);
                      let nft = new NFT({
                        name: nftElement.name,
                        description: nftElement.description,
                        image: nftElement.image,
                        fileType: nftElement.fileType,
                        tokenID: nftElement.tokenID,
                        collectionID: nftElement.collectionID,
                        collectionAddress: nftElement.collectionAddress,
                        isOnMarketplace: nftElement.isOnMarketplace,
                        totalQuantity: nftElement.totalQuantity,
                        totalQuantity: nftElement.quantity,
                        isImported: nftElement.isImported,
                        type: nftElement.type,
                        isMinted: nftElement.isMinted,
                        createdBy: creatorID,
                        hash: "0x0",
                        hashStatus: 1,
                        ownedBy: [],
                      });
                      if (
                        collectionData[0].brandID !== undefined &&
                        collectionData[0].brandID !== ""
                      ) {
                        nft.brandID = collectionData[0].brandID;
                      }
                      if (
                        collectionData[0].categoryID !== undefined &&
                        collectionData[0].categoryID !== ""
                      ) {
                        nft.categoryID = collectionData[0].categoryID;
                      }
                      nft.attributes = nftElement.attributes;
                      nft.ownedBy.push({
                        address: nftElement.owner,
                        quantity: 1,
                      });
                      console.log("nftInsertData", nft);
                      nft.save(async function (saveerr, nftSaveResult) {
                        if (saveerr) {
                          console.log("Created NFT error", saveerr);
                          return res.reply(messages.error());
                        }
                        if (nftSaveResult) {
                          helperFunctions.increaseNFTCount(collectionData[0]._id);
                        }
                        return res.reply(messages.created("NFT"), nftSaveResult);
                      });
                    }
                  }
                }
              );
            } else {
              return res.reply(messages.not_found("Collection"));
            }
          }
        }
      );
    } catch (error) {
      console.log(error);
      return res.reply(messages.server_error());
    }
  }

  async viewNFTs(req, res) {
    try {
      let data = [];
      const page = parseInt(req.body.page);
      const limit = parseInt(req.body.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      let nftID = "";
      if (req.body.nftID && req.body.nftID !== undefined) {
        nftID = req.body.nftID;
      }
      let userID = "";
      if (req.body.userID && req.body.userID !== undefined) {
        userID = req.body.userID;
      }
      let collectionID = "";
      if (req.body.collectionID && req.body.collectionID !== undefined) {
        collectionID = req.body.collectionID;
      }
      let categoryID = "";
      if (req.body.categoryID && req.body.categoryID !== undefined) {
        categoryID = req.body.categoryID;
      }
      let brandID = "";
      if (req.body.brandID && req.body.brandID !== undefined) {
        brandID = req.body.brandID;
      }
      let ERCType = "";
      if (req.body.ERCType && req.body.ERCType !== undefined) {
        ERCType = req.body.ERCType;
      }
      let searchBy = "";
      if (req.body.searchBy && req.body.searchBy !== undefined) {
        searchBy = req.body.searchBy;
      }
      let searchText = "";
      if (req.body.searchText && req.body.searchText !== undefined) {
        searchText = req.body.searchText;
      }
      let isMinted = "";
      if (req.body.isMinted && req.body.isMinted !== undefined) {
        isMinted = req.body.isMinted;
      }
      let isLazyMinted = "";
      if (req.body.isLazyMinted !== undefined) {
        isLazyMinted = req.body.isLazyMinted;
      }
      let isOnMarketplace = "";
      if (req.body.isOnMarketplace !== undefined) {
        isOnMarketplace = req.body.isOnMarketplace;
      }
      let salesType = "";
      if (req.body.salesType !== undefined) {
        if (salesType !== 2) {
          salesType = req.body.salesType;
        }
      }

      let pageName = "";
      if (req.body.pageName && req.body.pageName !== undefined) {
        pageName = req.body.pageName;
      }


      let priceSort = 1;
      if (req.body.priceSort !== undefined) {
        if (req.body.priceSort === "ASC") {
          priceSort = 1;
        } else {
          priceSort = -1;
        }
      }
      let sortArray = [];
      sortArray["OrderData.price"] = priceSort;
      let sortObj = Object.assign({}, sortArray);

      console.log("sortObj", sortObj);

      let searchArray = [];
      searchArray["status"] = 1;
      searchArray["hashStatus"] = 1;

      if (nftID !== "") {
        searchArray["_id"] = mongoose.Types.ObjectId(nftID);
      }
      if (collectionID !== "") {
        searchArray["collectionID"] = mongoose.Types.ObjectId(collectionID);
      }
      if (userID !== "") {
        searchArray["createdBy"] = mongoose.Types.ObjectId(userID);
      }
      if (categoryID !== "") {
        searchArray["categoryID"] = mongoose.Types.ObjectId(categoryID);
      }
      if (brandID !== "") {
        searchArray["brandID"] = mongoose.Types.ObjectId(brandID);
      }
      if (ERCType !== "") {
        searchArray["type"] = ERCType;
      }
      if (isMinted !== "") {
        searchArray["isMinted"] = isMinted;
      }
      if (searchBy === "tokenID") {
        if (searchText !== "") {
          let searchedTokenID = searchText.includes(".") ? parseInt(-1) : parseInt(searchText);
          searchArray["tokenID"] = searchedTokenID;
        }
      } else {
        console.log("searchText dfgsdfg ", searchText)
        if (searchText !== "") {
          searchText = searchText.replace(/[-[\]{}()*+?.,\\^\s]/g, '\\$&');
          console.log("searchText", searchText)
          searchArray["name"] = { $regex: new RegExp(searchText), $options: "i" };
        }
      }

      if (isLazyMinted !== "") {
        if (isLazyMinted == true) searchArray["lazyMintingStatus"] = 1;
        else searchArray["lazyMintingStatus"] = 0;
      }
      if (salesType === 2) {
        searchArray["OrderData.0"] = { $exists: false }
      }

      let searchObj = Object.assign({}, searchArray);

      let searchArrayCount = [];
      searchArrayCount["status"] = 1;
      searchArrayCount["hashStatus"] = 1;
      if (pageName === "Brand") {
        if (brandID !== "") {
          searchArrayCount["brandID"] = mongoose.Types.ObjectId(brandID);
        }
      }
      if (pageName === "Collection") {
        if (collectionID !== "") {
          searchArrayCount["collectionID"] = mongoose.Types.ObjectId(collectionID);
        }
      }
      let searchObjCount = Object.assign({}, searchArrayCount);

      let isOnMarketplaceSearchArray = [];
      isOnMarketplaceSearchArray["$match"] = {};
      if (isOnMarketplace === 1 || isOnMarketplace === 0) {
        isOnMarketplaceSearchArray["$match"] = {
          "CollectionData.isOnMarketplace": isOnMarketplace,
          "CollectionData.status": 1,
          "CollectionData.hashStatus": 1,
        };
      } else {
        isOnMarketplaceSearchArray["$match"] = {
          "CollectionData.status": 1,
          "CollectionData.hashStatus": 1,
        };
      }
      let isOnMarketplaceSearchObj = Object.assign(
        {},
        isOnMarketplaceSearchArray
      );

      console.log("isOnMarketplaceSearchObj", isOnMarketplaceSearchObj);

      let salesTypeSearchArray = [];
      salesTypeSearchArray["$match"] = {};
      if (salesType === 1 || salesType === 0) {
        salesTypeSearchArray["$match"] = { "OrderData.salesType": salesType };
      }
      let salesTypeSearchObj = Object.assign({}, salesTypeSearchArray);

      console.log("salesTypeSearchObj", salesTypeSearchObj);

      let sortQueryArray = [];
      if (searchText !== "") {
        sortQueryArray["$sort"] = { hasOrder: -1, "OrderData.price": priceSort, tokenID: 1, name: 1, createdOn: -1 };
      } else {
        sortQueryArray["$sort"] = { hasOrder: -1, "OrderData.price": priceSort, createdOn: -1, tokenID: -1 };
      }

      let sortQueryObj = Object.assign({}, sortQueryArray);

      console.log("salesTypeSearchObj", salesTypeSearchObj);

      await NFT.aggregate([
        {
          $lookup: {
            from: "collections",
            localField: "collectionID",
            foreignField: "_id",
            as: "CollectionData",
          },
        },
        isOnMarketplaceSearchObj,
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "nftID",
            as: "OrderData",
          },
        },
        salesTypeSearchObj,
        {
          $lookup: {
            from: "categories",
            localField: "categoryID",
            foreignField: "_id",
            as: "CategoryData",
          },
        },
        {
          $lookup: {
            from: "brands",
            localField: "brandID",
            foreignField: "_id",
            as: "BrandData",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "UserData",
          },
        },
        { $match: searchObj },
        {
          $project: {
            _id: 1,
            hasOrder: {
              $cond: { if: { $isArray: "$OrderData" }, then: { $size: "$OrderData" }, else: "NA" }
            },
            name: 1,
            type: 1,
            image: 1,
            previewImg: 1,
            description: 1,
            collectionAddress: 1,
            ownedBy: 1,
            user_likes: 1,
            isImported: 1,
            metaDatahash: 1,
            totalQuantity: 1,
            collectionID: 1,
            categoryID: 1,
            tokenID: 1,
            fileType: 1,
            createdBy: 1,
            createdOn: 1,
            attributes: 1,
            totalQuantity: 1,
            "CollectionData._id": 1,
            "CollectionData.name": 1,
            "CollectionData.contractAddress": 1,
            "CollectionData.isOnMarketplace": 1,
            "CollectionData.status": 1,
            "CollectionData.logoImage": 1,
            "OrderData._id": 1,
            "OrderData.price": 1,
            "OrderData.salesType": 1,
            "OrderData.paymentToken": 1,
            "BrandData._id": 1,
            "BrandData.name": 1,
            "BrandData.logoImage": 1,
            "BrandData.coverImage": 1,
          },
        },
        sortQueryObj,
        { $skip: startIndex },
        { $limit: limit },

      ]).exec(async function (e, nftData) {
        console.log("Error ", e);
        let results = {};
        let count = await NFT.aggregate([
          {
            $lookup: {
              from: "collections",
              localField: "collectionID",
              foreignField: "_id",
              as: "CollectionData",
            },
          },
          isOnMarketplaceSearchObj,
          {
            $lookup: {
              from: "orders",
              localField: "_id",
              foreignField: "nftID",
              as: "OrderData",
            },
          },
          {
            $lookup: {
              from: "categories",
              localField: "categoryID",
              foreignField: "_id",
              as: "CategoryData",
            },
          },
          {
            $lookup: {
              from: "brands",
              localField: "brandID",
              foreignField: "_id",
              as: "BrandData",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              as: "UserData",
            },
          },
          { $match: searchObjCount },
          {
            $count: "allNFTs"
          }
        ]);
        let filterCount = await NFT.aggregate([
          {
            $lookup: {
              from: "collections",
              localField: "collectionID",
              foreignField: "_id",
              as: "CollectionData",
            },
          },
          isOnMarketplaceSearchObj,
          {
            $lookup: {
              from: "orders",
              localField: "_id",
              foreignField: "nftID",
              as: "OrderData",
            },
          },
          salesTypeSearchObj,
          {
            $lookup: {
              from: "categories",
              localField: "categoryID",
              foreignField: "_id",
              as: "CategoryData",
            },
          },
          {
            $lookup: {
              from: "brands",
              localField: "brandID",
              foreignField: "_id",
              as: "BrandData",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              as: "UserData",
            },
          },
          { $match: searchObj },
          {
            $count: "FilteredNFTs"
          }
        ]);
        results.count = count[0]?.allNFTs;
        results.filterCount = filterCount[0]?.FilteredNFTs;
        results.results = nftData;
        console.log("Data Returned");
        return res.reply(messages.success("NFT List"), results);
      });
    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }

  async viewNFTDetails(req, res) {
    try {
      let nftID = "";
      if (req.body.nftID && req.body.nftID !== undefined) {
        nftID = req.body.nftID;
      }
      let searchArray = [];
      searchArray["status"] = 1;
      searchArray["hashStatus"] = 1;
      if (nftID !== "") {
        searchArray["_id"] = mongoose.Types.ObjectId(nftID);
      }
      let searchObj = Object.assign({}, searchArray);

      let isOnMarketplaceSearchArray = [];
      isOnMarketplaceSearchArray["$match"] = { "CollectionData.status": 1, "CollectionData.hashStatus": 1 };
      let isOnMarketplaceSearchObj = Object.assign({}, isOnMarketplaceSearchArray);
      console.log("isOnMarketplaceSearchObj", isOnMarketplaceSearchObj);

      let nfts = await NFT.aggregate([
        { $match: searchObj },
        {
          $lookup: {
            from: "collections",
            localField: "collectionID",
            foreignField: "_id",
            as: "CollectionData",
          },
        },
        isOnMarketplaceSearchObj,
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "nftID",
            as: "OrderData",
          },
        },
        {
          $lookup:
          {
            from: 'bids',
            pipeline: [
              {
                $match:
                {
                  bidQuantity: { $gte: 1 },
                  bidStatus: "Bid",
                  nftID: mongoose.Types.ObjectId(nftID)
                }
              },
              { $sort: { createdOn: -1 } },
            ],
            as: 'BidsData'
          },
        },
        {
          $lookup:
          {
            from: 'bids',
            pipeline: [
              {
                $match:
                {
                  bidQuantity: { $gte: 1 },
                  isOffer: true,
                  nftID: mongoose.Types.ObjectId(nftID)
                }
              },
              { $sort: { createdOn: -1 } },
            ],
            as: 'OffersData'
          },
        },
        {
          $lookup:
          {
            from: 'histories',
            pipeline: [
              {
                $match:
                {
                  nftID: mongoose.Types.ObjectId(nftID)
                }
              },
              { $sort: { createdOn: -1 } },
            ],
            as: 'HistoryData'
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "categoryID",
            foreignField: "_id",
            as: "CategoryData",
          },
        },
        {
          $lookup: {
            from: "brands",
            localField: "brandID",
            foreignField: "_id",
            as: "BrandData",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "UserData",
          },
        },
      ]).exec(async function (e, nftData) {
        console.log("Error ", e);

        let ContractType = "ERC1155";
        let ContractABI = erc1155Abi ? erc1155Abi.abi : "";
        if (nftData[0]?.type === 1) {
          ContractType = "ERC721";
          ContractABI = erc721Abi ? erc721Abi.abi : "";
        }
        console.log("Contract is", ContractType)
        let contract = new web3.eth.Contract(ContractABI, nftData[0]?.collectionAddress);
        let tokenID = parseInt(nftData[0]?.tokenID);
        if (nftData[0]?.isImported === 0) {
          console.log("Created on Plateform");
          let tokenURI = await contract.methods.tokenURI(tokenID).call();
          console.log("tokenURI", tokenURI)
          try {
            https.get(tokenURI, (resp) => {
              let body = "";
              resp.on("data", (chunk) => {
                body += chunk;
              });
              resp.on("end", async () => {
                try {
                  let newJSON = JSON.parse(body);
                  nftData[0].name = newJSON.name;
                  nftData[0].description = newJSON.description;
                  console.log("Image", newJSON.image, newJSON.animation_url)
                  if (newJSON.image === "" || newJSON.image === undefined) {
                    nftData[0].previewImg = newJSON?.previewImg ? newJSON?.previewImg : nftData[0].previewImg;
                    nftData[0].image = "";
                    nftData[0].originalImage = newJSON?.animation_url;
                    nftData[0].animation_url = newJSON?.animation_url;
                  } else {
                    nftData[0].previewImg = newJSON?.previewImg ? newJSON?.previewImg : nftData[0].previewImg;
                    nftData[0].image = newJSON?.image;
                    nftData[0].originalImage = newJSON?.image;
                    nftData[0].animation_url = "";
                  }
                  let attributesData = newJSON[0]?.attributes;
                  let propertyData = [];
                  let propertyattributesObject = [];
                  let rarityattributesObject = [];

                  if (attributesData?.length > 0) {
                    for (const attrData of attributesData) {
                      if (attrData?.display_type !== undefined && attrData?.display_type === "properties") {
                        propertyData.push(attrData?.trait_type);
                      }
                    }

                    for (const attrData of attributesFilterData) {
                      if (attrData.trait_type !== "image_filename" && attrData.trait_type !== "anim_filename") {
                        if (propertyData.includes(attrData.trait_type)) {
                          propertyattributesObject.push(attrData);
                        } else {
                          rarityattributesObject.push(attrData);
                        }
                      }
                    }
                  }

                  nftData[0].allAttributes = attributesFilterData;
                  nftData[0].property = propertyattributesObject;
                  nftData[0].attributes = rarityattributesObject;

                  nftData[0].allAttributesCount = attributesFilterData.length;
                  nftData[0].propertyCount = propertyattributesObject.length;
                  nftData[0].attributesCount = rarityattributesObject.length;

                  return res.reply(messages.success("NFT List"), nftData);
                } catch (error) {
                  console.log("Error ", error);
                  return res.reply(messages.success("NFT List"), nftData);
                };
              });
            }).on("error", (error) => {
              console.log("Error ", error);
              return res.reply(messages.success("NFT List"), nftData);
            });
          } catch (error) {
            console.log("Error ", error);
            return res.reply(messages.success("NFT List"), nftData);
          }
        } else {
          console.log("Created on Mikes API");
          let tokenURI = nftMetaBaseURL + "tokenDetailsExtended?ChainId=" + chainID + "&ContractAddress=" + nftData[0]?.collectionAddress + "&TokenId=" + tokenID;
          console.log("tokenURI", tokenURI)
          try {
            https.get(tokenURI, (resp) => {
              let body = "";
              resp.on("data", (chunk) => {
                body += chunk;
              });
              resp.on("end", async () => {
                try {
                  let newJSON = JSON.parse(body);
                  nftData[0].name = newJSON[0]?.name ? newJSON[0].name : nftData[0]?.name;
                  nftData[0].description = newJSON[0]?.description ? newJSON[0].description : nftData[0]?.description;
                  console.log("JSON ", newJSON[0])
                  console.log("Images ", newJSON[0]?.S3Images)


                  nftData[0].previewImg = newJSON[0]?.S3Images?.S3Image300;
                  nftData[0].image = newJSON[0]?.S3Images?.S3Image700;
                  nftData[0].originalImage = newJSON[0]?.S3Images?.S3Image;
                  nftData[0].animation_url = newJSON[0]?.S3Images?.S3Animation;
                  console.log("Images are", nftData[0].previewImg, nftData[0].image, nftData[0].originalImage, nftData[0].animation_url)
                  if (newJSON[0]?.S3Images?.S3Animation !== null) {
                    let animation = newJSON[0].S3Images.S3Animation;
                    let videoExt = ["mp4", "mov", "wmv", "avi", "avchd", "flv", "f4v", "swf", "mkv", "webm"];
                    let threeDExt = ["glb", "gltf", "gltb"];
                    let ext = animation.substr(animation.lastIndexOf('.') + 1);
                    if (videoExt.includes(ext)) {
                      nftData[0].fileType = "Video";
                    }
                    if (threeDExt.includes(ext)) {
                      nftData[0].fileType = "3D";
                    }
                  }
                  let attributesData = newJSON[0].attributes;
                  let attributesFilterData = [];
                  if (newJSON[0]?.rarity?.rarity_attributes === "" || newJSON[0]?.rarity?.rarity_attributes === undefined) {
                    attributesFilterData = newJSON[0].attributes;
                  } else {
                    attributesFilterData = newJSON[0].rarity.rarity_attributes;
                  }
                  let propertyData = [];
                  for (const attrData of attributesData) {
                    if (attrData?.display_type !== undefined && attrData?.display_type === "properties") {
                      propertyData.push(attrData?.trait_type);
                    }
                  }
                  let propertyattributesObject = [];
                  let rarityattributesObject = [];
                  for (const attrData of attributesFilterData) {
                    if (attrData.trait_type !== "image_filename" && attrData.trait_type !== "anim_filename") {
                      if (propertyData.includes(attrData.trait_type)) {
                        propertyattributesObject.push(attrData);
                      } else {
                        rarityattributesObject.push(attrData);
                      }
                    }
                  }

                  nftData[0].allAttributes = attributesFilterData;
                  nftData[0].property = propertyattributesObject;
                  nftData[0].attributes = rarityattributesObject;

                  nftData[0].allAttributesCount = attributesFilterData.length;
                  nftData[0].propertyCount = propertyattributesObject.length;
                  nftData[0].attributesCount = rarityattributesObject.length;

                  return res.reply(messages.success("NFT List"), nftData);
                } catch (error) {
                  console.log("Error ", error);
                  return res.reply(messages.success("NFT List"), nftData);
                };
              });
            }).on("error", (error) => {
              console.log("Error ", error);
              return res.reply(messages.success("NFT List"), nftData);
            });
          } catch (error) {
            console.log("Error ", error);
            return res.reply(messages.success("NFT List"), nftData);
          }
        }

      });
    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }

  async myNFTs(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      let data = [];
      const page = parseInt(req.body.page);
      const limit = parseInt(req.body.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      let searchText = "";
      if (req.body.searchText && req.body.searchText !== undefined) {
        searchText = req.body.searchText;
      }
      console.log("req.userId", req.userId);
      User.findOne(
        { _id: mongoose.Types.ObjectId(req.userId) },
        async function (err, userData) {
          console.log("err", err);
          console.log("userData", userData);
          if (err) {
            return res.reply(messages.unauthorized());
          } else {
            let searchArray = [];
            searchArray["status"] = 1;
            searchArray["hashStatus"] = 1;
            searchArray["ownedBy"] = {
              $elemMatch: {
                address: userData.walletAddress?.toLowerCase(),
                quantity: { $gt: 0 },
              },
            };
            if (searchText !== "") {
              searchText = searchText.replace(/[-[\]{}()*+?.,\\^\s]/g, '\\$&');
              searchArray["$or"] = [
                { name: { $regex: new RegExp(searchText), $options: "i" } },
                { contractAddress: { $regex: new RegExp(searchText), $options: "i" } },
              ];
            }
            let searchObj = Object.assign({}, searchArray);


            let searchArrayCount = [];
            searchArrayCount["status"] = 1;
            searchArrayCount["hashStatus"] = 1;
            searchArrayCount["ownedBy"] = {
              $elemMatch: {
                address: userData.walletAddress?.toLowerCase(),
                quantity: { $gt: 0 },
              },
            };
            let searchObjCount = Object.assign({}, searchArrayCount);

            let isOnMarketplaceSearchArray = [];
            isOnMarketplaceSearchArray["$match"] = {
              "CollectionData.status": 1,
            };
            let isOnMarketplaceSearchObj = Object.assign({}, isOnMarketplaceSearchArray);
            console.log("isOnMarketplaceSearchObj", isOnMarketplaceSearchObj);

            const results = {};
            if (endIndex < (await NFT.countDocuments(searchObj).exec())) {
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
            await NFT.aggregate([
              {
                $lookup: {
                  from: "collections",
                  localField: "collectionID",
                  foreignField: "_id",
                  as: "CollectionData",
                },
              },
              isOnMarketplaceSearchObj,
              { $match: searchObj },
              { $sort: { createdOn: -1 } },
              { $skip: startIndex },
              { $limit: limit },

            ]).exec(async function (e, nftData) {
              console.log("Error ", e);
              let results = {};
              let count = await NFT.aggregate([
                {
                  $lookup: {
                    from: "collections",
                    localField: "collectionID",
                    foreignField: "_id",
                    as: "CollectionData",
                  },
                },
                isOnMarketplaceSearchObj,
                { $match: searchObjCount },
                {
                  $count: "allNFTs"
                }
              ])
              results.count = count[0]?.allNFTs;
              results.results = nftData;
              return res.reply(messages.success("NFT List"), results);
            });
          }
        }
      );
    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }

  // async updateNftOrder(req, res) {
  //   try {
  //     if (!req.userId) return res.reply(messages.unauthorized());
  //     console.log("request is--->", JSON.stringify(req.body));
  //     console.log("id is--->", req.body._id);

  //     let sId = await NFT.findById(req.body._id);
  //     let nftownerID = req.body.nftownerID;

  //     if (!sId) return res.reply(messages.not_found("NFT"));

  //     await NFTowners.findByIdAndUpdate(nftownerID, {
  //       sOrder: req.body.sOrder,
  //       sSignature: req.body.sSignature,
  //       sTransactionStatus: 1,
  //       nBasePrice: req.body.nBasePrice,
  //     }).then((err, nftowner) => {
  //       console.log("Error Update is " + JSON.stringify(err));
  //     });

  //     NFTowners.findByIdAndUpdate(
  //       nftownerID,
  //       { $inc: { nQuantityLeft: -req.body.putOnSaleQty } },
  //       { new: true },
  //       function (err, response) { }
  //     );
  //     if (req.body.erc721) {
  //       await NFT.findByIdAndUpdate(sId, {
  //         sOrder: req.body.sOrder,
  //         sSignature: req.body.sSignature,
  //         sTransactionStatus: 1,
  //         nBasePrice: req.body.nBasePrice,
  //       }).then((err, nft) => {
  //         console.log("Updating By ID" + nftownerID);
  //         return res.reply(messages.success("Order Created"));
  //       });
  //     } else {
  //       return res.reply(messages.success("Order Created"));
  //     }
  //   } catch (e) {
  //     console.log("Error is " + e);
  //     return res.reply(messages.server_error());
  //   }
  // }

  async getOnSaleItems(req, res) {
    console.log("req", req.body);
    try {
      let data = [];
      const page = parseInt(req.body.page);
      const limit = parseInt(req.body.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;


      let ERCType = "";
      if (req.body.ERCType && req.body.ERCType !== undefined) {
        ERCType = req.body.ERCType;
      }

      let searchBy = "";
      if (req.body.searchBy && req.body.searchBy !== undefined) {
        searchBy = req.body.searchBy;
      }
      let searchText = "";
      if (req.body.searchText && req.body.searchText !== undefined) {
        searchText = req.body.searchText;
      }
      let priceSort = 1;
      if (req.body.priceSort !== undefined) {
        if (req.body.priceSort === "ASC") {
          priceSort = 1;
        } else {
          priceSort = -1;
        }
      }
      let sortArray = [];
      sortArray["OrderData.price"] = priceSort;
      // sortArray["createdOn"] = -1;
      let sortObj = Object.assign({}, sortArray);

      console.log("sortObj", sortObj);

      let searchArray = [];
      searchArray["status"] = 1;
      searchArray["hashStatus"] = 1;
      if (ERCType !== "") {
        searchArray["type"] = ERCType;
      }
      if (searchBy === "tokenID") {
        if (searchText !== "") {
          let searchedTokenID = searchText.includes(".") ? parseInt(-1) : parseInt(searchText);
          searchArray["tokenID"] = searchedTokenID;
        }
      } else {
        if (searchText !== "") {
          searchText = searchText.replace(/[-[\]{}()*+?.,\\^\s]/g, '\\$&');
          searchArray["name"] = { $regex: new RegExp(searchText), $options: "i" };
        }
      }
      searchArray["ownedBy"] = {
        $elemMatch: {
          address: req.body.userWalletAddress?.toLowerCase(),
          quantity: { $gt: 0 },
        },
      };
      searchArray["OrderData.0"] = { $exists: true }
      let searchObj = Object.assign({}, searchArray);

      let searchArrayCount = [];
      searchArrayCount["status"] = 1;
      searchArrayCount["hashStatus"] = 1;
      searchArrayCount["OrderData.0"] = { $exists: true }
      searchArrayCount["ownedBy"] = {
        $elemMatch: {
          address: req.body.userWalletAddress?.toLowerCase(),
          quantity: { $gt: 0 },
        },
      };
      let searchObjCount = Object.assign({}, searchArrayCount);

      let isOnMarketplaceSearchArray = [];
      isOnMarketplaceSearchArray["$match"] = { "CollectionData.status": 1, "CollectionData.hashStatus": 1 };
      let isOnMarketplaceSearchObj = Object.assign(
        {},
        isOnMarketplaceSearchArray
      );
      console.log("isOnMarketplaceSearchObj", isOnMarketplaceSearchObj);
      await NFT.aggregate([
        {
          $lookup: {
            from: "collections",
            localField: "collectionID",
            foreignField: "_id",
            as: "CollectionData",
          },
        },
        isOnMarketplaceSearchObj,
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "nftID",
            as: "OrderData",
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "categoryID",
            foreignField: "_id",
            as: "CategoryData",
          },
        },
        {
          $lookup: {
            from: "brands",
            localField: "brandID",
            foreignField: "_id",
            as: "BrandData",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "UserData",
          },
        },
        { $match: searchObj },
        {
          $project: {
            _id: 1,
            hasOrder: {
              $cond: { if: { $isArray: "$OrderData" }, then: { $size: "$OrderData" }, else: "NA" }
            },
            name: 1,
            type: 1,
            image: 1,
            previewImg: 1,
            description: 1,
            collectionAddress: 1,
            ownedBy: 1,
            user_likes: 1,
            totalQuantity: 1,
            collectionID: 1,
            categoryID: 1,
            tokenID: 1,
            fileType: 1,
            createdBy: 1,
            createdOn: 1,
            attributes: 1,
            totalQuantity: 1,
            "CollectionData._id": 1,
            "CollectionData.name": 1,
            "CollectionData.contractAddress": 1,
            "CollectionData.isOnMarketplace": 1,
            "CollectionData.status": 1,
            "CollectionData.logoImage": 1,
            "OrderData._id": 1,
            "OrderData.price": 1,
            "OrderData.salesType": 1,
            "OrderData.paymentToken": 1,
            "BrandData._id": 1,
            "BrandData.name": 1,
            "BrandData.logoImage": 1,
            "BrandData.coverImage": 1,
          },
        },
        { $sort: { hasOrder: -1, "OrderData.price": priceSort, createdOn: -1 } },
        { $skip: startIndex },
        { $limit: limit },
      ]).exec(async function (e, nftData) {
        console.log("Error ", e);
        let results = {};
        let count = await NFT.aggregate([
          {
            $lookup: {
              from: "collections",
              localField: "collectionID",
              foreignField: "_id",
              as: "CollectionData",
            },
          },
          isOnMarketplaceSearchObj,
          {
            $lookup: {
              from: "orders",
              localField: "_id",
              foreignField: "nftID",
              as: "OrderData",
            },
          },
          {
            $lookup: {
              from: "categories",
              localField: "categoryID",
              foreignField: "_id",
              as: "CategoryData",
            },
          },
          {
            $lookup: {
              from: "brands",
              localField: "brandID",
              foreignField: "_id",
              as: "BrandData",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              as: "UserData",
            },
          },
          { $match: searchObjCount },
          {
            $count: "allNFTs"
          }
        ]);
        let filterCount = await NFT.aggregate([
          {
            $lookup: {
              from: "collections",
              localField: "collectionID",
              foreignField: "_id",
              as: "CollectionData",
            },
          },
          isOnMarketplaceSearchObj,
          {
            $lookup: {
              from: "orders",
              localField: "_id",
              foreignField: "nftID",
              as: "OrderData",
            },
          },
          {
            $lookup: {
              from: "categories",
              localField: "categoryID",
              foreignField: "_id",
              as: "CategoryData",
            },
          },
          {
            $lookup: {
              from: "brands",
              localField: "brandID",
              foreignField: "_id",
              as: "BrandData",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              as: "UserData",
            },
          },
          { $match: searchObj },
          {
            $count: "FilteredNFTs"
          }
        ]);
        results.count = count[0]?.allNFTs;
        results.filterCount = filterCount[0]?.FilteredNFTs;
        results.results = nftData;
        return res.reply(messages.success("NFT List"), results);
      });
    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }

  async getOwnedNFTlist(req, res) {
    console.log("req", req.body);
    try {
      let data = [];
      const page = parseInt(req.body.page);
      const limit = parseInt(req.body.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;


      let ERCType = "";
      if (req.body.ERCType && req.body.ERCType !== undefined) {
        ERCType = req.body.ERCType;
      }
      let searchBy = "";
      if (req.body.searchBy && req.body.searchBy !== undefined) {
        searchBy = req.body.searchBy;
      }
      let searchText = "";
      if (req.body.searchText && req.body.searchText !== undefined) {
        searchText = req.body.searchText;
      }


      let priceSort = 1;
      if (req.body.priceSort !== undefined) {
        if (req.body.priceSort === "ASC") {
          priceSort = 1;
        } else {
          priceSort = -1;
        }
      }
      let sortArray = [];
      sortArray["OrderData.price"] = priceSort;
      // sortArray["createdOn"] = -1;
      let sortObj = Object.assign({}, sortArray);

      console.log("sortObj", sortObj);

      let searchArray = [];
      searchArray["status"] = 1;
      searchArray["hashStatus"] = 1;

      if (ERCType !== "") {
        searchArray["type"] = ERCType;
      }

      if (searchBy === "tokenID") {
        if (searchText !== "") {
          let searchedTokenID = searchText.includes(".") ? parseInt(-1) : parseInt(searchText);
          searchArray["tokenID"] = searchedTokenID;
        }
      } else {
        if (searchText !== "") {
          searchText = searchText.replace(/[-[\]{}()*+?.,\\^\s]/g, '\\$&');
          searchArray["name"] = { $regex: new RegExp(searchText), $options: "i" };
        }
      }

      if (req.body.searchType === "owned") {
        searchArray["ownedBy"] = {
          $elemMatch: {
            address: req.body.userWalletAddress?.toLowerCase(),
            quantity: { $gt: 0 },
          },
        };
      } else {
        searchArray["createdBy"] = {
          $in: [mongoose.Types.ObjectId(req.body.userId)],
        };
      }
      // searchArray["OrderData.0"] = { $exists:true }

      let searchObj = Object.assign({}, searchArray);

      let searchArrayCount = [];
      searchArrayCount["status"] = 1;
      searchArrayCount["hashStatus"] = 1;
      if (req.body.searchType === "owned") {
        searchArrayCount["ownedBy"] = {
          $elemMatch: {
            address: req.body.userWalletAddress?.toLowerCase(),
            quantity: { $gt: 0 },
          },
        };
      } else {
        searchArrayCount["createdBy"] = {
          $in: [mongoose.Types.ObjectId(req.body.userId)],
        };
      }
      let searchObjCount = Object.assign({}, searchArrayCount);

      let isOnMarketplaceSearchArray = [];
      isOnMarketplaceSearchArray["$match"] = { "CollectionData.status": 1, "CollectionData.hashStatus": 1 };
      let isOnMarketplaceSearchObj = Object.assign(
        {},
        isOnMarketplaceSearchArray
      );

      console.log("isOnMarketplaceSearchObj", isOnMarketplaceSearchObj);

      await NFT.aggregate([

        {
          $lookup: {
            from: "collections",
            localField: "collectionID",
            foreignField: "_id",
            as: "CollectionData",
          },
        },
        isOnMarketplaceSearchObj,
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "nftID",
            as: "OrderData",
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "categoryID",
            foreignField: "_id",
            as: "CategoryData",
          },
        },
        {
          $lookup: {
            from: "brands",
            localField: "brandID",
            foreignField: "_id",
            as: "BrandData",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "UserData",
          },
        },
        { $match: searchObj },
        {
          $project: {
            _id: 1,
            hasOrder: {
              $cond: { if: { $isArray: "$OrderData" }, then: { $size: "$OrderData" }, else: "NA" }
            },
            name: 1,
            type: 1,
            image: 1,
            previewImg: 1,
            description: 1,
            collectionAddress: 1,
            ownedBy: 1,
            user_likes: 1,
            totalQuantity: 1,
            collectionID: 1,
            categoryID: 1,
            tokenID: 1,
            fileType: 1,
            createdBy: 1,
            createdOn: 1,
            attributes: 1,
            totalQuantity: 1,
            "CollectionData._id": 1,
            "CollectionData.name": 1,
            "CollectionData.contractAddress": 1,
            "CollectionData.isOnMarketplace": 1,
            "CollectionData.status": 1,
            "CollectionData.logoImage": 1,
            "OrderData._id": 1,
            "OrderData.price": 1,
            "OrderData.salesType": 1,
            "OrderData.paymentToken": 1,
            "BrandData._id": 1,
            "BrandData.name": 1,
            "BrandData.logoImage": 1,
            "BrandData.coverImage": 1,

          },
        },
        { $sort: { hasOrder: -1, "OrderData.price": priceSort, createdOn: -1 } },
        { $skip: startIndex },
        { $limit: limit },

      ]).exec(async function (e, nftData) {
        console.log("Error ", e);
        let results = {};
        let count = await NFT.aggregate([
          {
            $lookup: {
              from: "collections",
              localField: "collectionID",
              foreignField: "_id",
              as: "CollectionData",
            },
          },
          isOnMarketplaceSearchObj,
          {
            $lookup: {
              from: "orders",
              localField: "_id",
              foreignField: "nftID",
              as: "OrderData",
            },
          },
          {
            $lookup: {
              from: "categories",
              localField: "categoryID",
              foreignField: "_id",
              as: "CategoryData",
            },
          },
          {
            $lookup: {
              from: "brands",
              localField: "brandID",
              foreignField: "_id",
              as: "BrandData",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              as: "UserData",
            },
          },
          { $match: searchObjCount },
          {
            $count: "allNFTs"
          }
        ]);
        let filterCount = await NFT.aggregate([
          {
            $lookup: {
              from: "collections",
              localField: "collectionID",
              foreignField: "_id",
              as: "CollectionData",
            },
          },
          isOnMarketplaceSearchObj,
          {
            $lookup: {
              from: "orders",
              localField: "_id",
              foreignField: "nftID",
              as: "OrderData",
            },
          },
          {
            $lookup: {
              from: "categories",
              localField: "categoryID",
              foreignField: "_id",
              as: "CategoryData",
            },
          },
          {
            $lookup: {
              from: "brands",
              localField: "brandID",
              foreignField: "_id",
              as: "BrandData",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              as: "UserData",
            },
          },
          { $match: searchObj },
          {
            $count: "FilteredNFTs"
          }
        ]);
        results.count = count[0]?.allNFTs;
        results.filterCount = filterCount[0]?.FilteredNFTs;
        results.results = nftData;
        return res.reply(messages.success("NFT List"), results);
      });
    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }

  async viewNFTByOrder(req, res) {
    try {
      let data = [];
      const page = parseInt(req.body.page);
      const limit = parseInt(req.body.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const salesType = req.body.salesType;
      const sortColumn = req.body.sortColumn;
      const sortOrder = req.body.sortOrder;

      let orderData = [];
      await Order.find()
        .distinct("nftID")
        .exec()
        .then((resData) => {
          resData.forEach((element) => {
            orderData.push(mongoose.Types.ObjectId(element.nftID));
          });
        })
        .catch((e) => {
          console.log("Error", e);
        });

      console.log("orderData ", orderData);
      let searchArray = [];
      searchArray["_id"] = { $in: orderData };
      searchArray["status"] = 1;
      searchArray["hashStatus"] = 1;

      let searchObj = Object.assign({}, searchArray);
      console.log("searchArray", searchArray);

      let nfts = await NFT.aggregate([
        { $match: searchObj },
        {
          $lookup: {
            from: "collections",
            localField: "collectionID",
            foreignField: "_id",
            as: "CollectionData",
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "categoryID",
            foreignField: "_id",
            as: "CategoryData",
          },
        },
        {
          $lookup: {
            from: "brands",
            localField: "brandID",
            foreignField: "_id",
            as: "BrandData",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "UserData",
          },
        },
        { $skip: startIndex },
        { $limit: limit },
        { $sort: { createdOn: -1 } },
      ]).exec(function (e, nftData) {
        console.log("Error ", e);
        return res.reply(messages.success("NFT List"), nftData);
      });
    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }

  async getUserOnSaleNfts(req, res) {
    try {
      console.log("req", req.body);
      let data = [];

      let query = {};
      let orderQuery = {};

      orderQuery["oSeller"] = mongoose.Types.ObjectId(req.body.userId);
      orderQuery["oStatus"] = 1; // we are getting only active orders

      if (req.body.hasOwnProperty("search")) {
        for (var key in req.body.search) {
          //could also be req.query and req.params
          req.body.search[key] !== ""
            ? (query[key] = req.body.search[key])
            : null;
        }
      }

      if (req.body.hasOwnProperty("searchOrder")) {
        for (var key in req.body.searchOrder) {
          //could also be req.query and req.params
          req.body.searchOrder[key] !== ""
            ? (orderQuery[key] = req.body.searchOrder[key])
            : null;
        }
      }

      console.log("orderQuery", orderQuery);
      //select unique NFTids for status 1 and userId supplied
      let OrderIdsss = await Order.distinct("oNftId", orderQuery);
      console.log("order idss", OrderIdsss);
      //return if no active orders found
      if (OrderIdsss.length < 1) return res.reply(messages.not_found());

      //set nftQuery
      query["_id"] = { $in: OrderIdsss };

      //sortKey is the column
      const sortKey = req.body.sortKey ? req.body.sortKey : "";

      //sortType will let you choose from ASC 1 or DESC -1
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

      if (
        endIndex <
        (await NFT.countDocuments({ _id: { $in: OrderIdsss } }).exec())
      ) {
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

      await NFT.find({ _id: { $in: OrderIdsss } })
        .select({
          nTitle: 1,
          nCollection: 1,
          nHash: 1,
          nType: 1,
          nUser_likes: 1,
          nNftImage: 1,
          nLazyMintingStatus: 1,
        })
        .populate({
          path: "nOrders",
          options: {
            limit: 1,
          },
          select: {
            oPrice: 1,
            oType: 1,
            oValidUpto: 1,
            auction_end_date: 1,
            oStatus: 1,
            _id: 0,
          },
        })
        .populate({
          path: "nCreater",
          options: {
            limit: 1,
          },
          select: {
            _id: 1,
            sProfilePicUrl: 1,
            sWalletAddress: 1,
          },
        })
        .limit(limit)
        .skip(startIndex)
        .exec()
        .then((res) => {
          data.push(res);
        })
        .catch((e) => {
          console.log("Error", e);
        });

      results.count = await NFT.countDocuments({
        _id: { $in: OrderIdsss },
      }).exec();
      results.results = data;

      return res.reply(messages.success("NFTs List Liked By User"), results);
    } catch (error) {
      console.log("Error:", error);
      return res.reply(messages.error());
    }
  }

  async updateCollection(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      errAllowed = "JPG, JPEG, PNG, GIF, WEBP";
      let collectionAddress = "";

      uploadBanner.fields([
        { name: "logoImage", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
      ])(req, res, function (error) {
        let updateData = [];
        let nftupdateData = [];
        let collectionID = req.body.id;
        if (req.files && req.files.logoImage && req.files.logoImage[0] && req.files.logoImage[0].location) {
          updateData["logoImage"] = req.files.logoImage[0].location;
        }
        if (req.files && req.files.coverImage && req.files.coverImage[0] && req.files.coverImage[0].location) {
          updateData["coverImage"] = req.files.coverImage[0].location;
        }
        if (req.body) {
          if (req.body.price) {
            updateData["price"] = req.body.price;
          }

          if (req.body.name) {
            updateData["name"] = req.body.name;
          }

          if (req.body.description) {
            updateData["description"] = req.body.description;
          }

          if (req.body.symbol) {
            updateData["symbol"] = req.body.symbol;
          }

          if (req.body.isHotCollection) {
            updateData["isHotCollection"] = req.body.isHotCollection;
          }

          if (req.body.isExclusive) {
            updateData["isExclusive"] = req.body.isExclusive;
          }

          if (req.body.isMinted) {
            updateData["isMinted"] = req.body.isMinted;
          }

          if (req.body.categoryID) {
            updateData["categoryID"] = req.body.categoryID;
            nftupdateData["categoryID"] = req.body.categoryID;
          }

          if (req.body.brandID) {
            updateData["brandID"] = req.body.brandID;
            nftupdateData["brandID"] = req.body.brandID;
          }
          if (req.body.totalSupply && req.body.totalSupply !== undefined && req.body.totalSupply !== null && req.body.totalSupply !== "null") {
            updateData["totalSupply"] = req.body.totalSupply;
          }
          if (req.body.royalty) {
            updateData["royalty"] = req.body.royalty;
          }
          if (req.body.isImported) {
            updateData["isImported"] = req.body.isImported;
            if (req.body.isImported === 1) {
              updateData["status"] = 1;
              updateData["hashStatus"] = 1;
            }
          }
          if (req.body.preSaleStartTime !== undefined) {
            updateData["preSaleStartTime"] = req.body.preSaleStartTime;
          }
          if (req.body.preSaleEndTime !== undefined) {
            updateData["preSaleEndTime"] = req.body.preSaleEndTime;
          }
          if (req.body.isDeployed !== "" && req.body.isDeployed !== undefined) {
            updateData["isDeployed"] = req.body.isDeployed;
          }
          if (req.body.link !== "" && req.body.link !== undefined) {
            updateData["link"] = req.body.link;
          }
          if (req.body.contractAddress !== "" && req.body.contractAddress !== undefined) {
            updateData["contractAddress"] = req.body.contractAddress;
            collectionAddress = req.body.contractAddress;
          }
          if (req.body.isOnMarketplace !== "" && req.body.isOnMarketplace !== undefined) {
            updateData["isOnMarketplace"] = req.body.isOnMarketplace;
          }
          updateData["lastUpdatedBy"] = req.userId;
          updateData["lastUpdatedOn"] = Date.now();

          if (req.body.contractName) {
            updateData["contractName"] = req.body.contractName;
          }
          if (req.body.totalSupplyField) {
            updateData["totalSupplyField"] = req.body.totalSupplyField;
          }
        }
        let updateObj = Object.assign({}, updateData);
        console.log("updateObj", updateObj)
        let nftupdateObj = Object.assign({}, nftupdateData);
        if (collectionAddress !== "") {
          Collection.find({ contractAddress: collectionAddress })
            .exec().then((resData) => {
              if (resData.length === 0) {
                Collection.findByIdAndUpdate(
                  { _id: mongoose.Types.ObjectId(collectionID) },
                  { $set: updateObj }
                ).then((collection) => {
                  NFT.updateMany(
                    { collectionID: mongoose.Types.ObjectId(collectionID) },
                    nftupdateObj,
                    function (err, docs) {
                      if (err) {
                        console.log(err);
                      } else {
                        console.log("NFT updated");
                      }
                    }
                  );
                  return res.reply(messages.updated("Collection Updated successfully."), collection);
                });
              } else {
                return res.reply(messages.already_exists("Collection"));
              }
            })
        } else {
          Collection.findByIdAndUpdate(
            { _id: mongoose.Types.ObjectId(collectionID) },
            { $set: updateObj }
          ).then((collection) => {
            NFT.updateMany(
              { collectionID: mongoose.Types.ObjectId(collectionID) },
              nftupdateObj,
              function (err, docs) {
                if (err) {
                  console.log(err);
                } else {
                  console.log("NFT updated");
                }
              }
            );
            return res.reply(messages.updated("Collection Updated successfully."), collection);
          });
        }
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  async getCollectionDetails(req, res) {
    try {
      if (!req.params.collection) {
        return res.reply(messages.not_found("Request"));
      }
      let searchKey = req.params.collection;
      Collection.findOne(
        { $or: [{ name: searchKey }, { contractAddress: searchKey }] },
        (err, collection) => {
          if (err) return res.reply(messages.server_error());
          if (!collection) return res.reply(messages.not_found("Collection"));
          return res.reply(
            messages.successfully("Collection Details Found"),
            collection
          );
        }
      );
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  async updateCollectionToken(req, res) {
    try {
      if (!req.params.collectionAddress)
        return res.reply(messages.not_found("Contract Address Not Found"));
      const contractAddress = req.params.collectionAddress;

      const collection = await Collection.findOne({
        contractAddress: contractAddress,
      });
      let nextID = collection.getNextID();

      collection.nextID = nextID + 1;
      collection.save();
      return res.reply(messages.success("Token Updated", nextID + 1));
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  async getCombinedNfts(req, res) {
    try {
      let collectionAddress = "";
      if (
        req.body.collectionAddress &&
        req.body.collectionAddress !== undefined
      ) {
        collectionAddress = req.body.collectionAddress;
      }
      let tokenID = "";
      if (req.body.tokenID && req.body.tokenID !== undefined) {
        tokenID = req.body.tokenID;
      }

      let ownedBy = "";
      if (req.body.ownedBy && req.body.ownedBy !== undefined) {
        ownedBy = req.body.ownedBy;
      }

      let searchArray = [];
      if (collectionAddress !== "") {
        searchArray["collectionAddress"] = collectionAddress;
      }
      if (tokenID !== "") {
        searchArray["tokenID"] = tokenID;
      }
      // req.userId;
      // if (ownedBy !== "") {
      //   searchArray["ownedBy"]= {
      //     $elemMatch: {
      //       address: ownedBy,
      //       quantity: { $gt: 0 },
      //     }
      //   }
      // }
      searchArray["isImported"] = 1;
      let searchObj = Object.assign({}, searchArray);
      let result = [];
      const nfts = await NFT.find(searchObj);
      if (nfts.length) result.push(nfts);
      const impnfts = await NFT.find(searchObj);
      if (impnfts.length) result.push(impnfts);
      if (result.length)
        return res.reply(messages.success("NFTs/Imported NFTs List"), result);
      else return res.reply(messages.success("NFTs/Imported NFTs List"), []);
    } catch (e) {
      return res.reply(messages.error());
    }
  }

  async blockUnblockCollection(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      if (!req.body.collectionID) {
        return res.reply(messages.not_found("Collection ID"));
      }
      if (req.body.blockStatus === undefined) {
        return res.reply(messages.not_found("Block Status"));
      }
      let collectionDetails = {};
      collectionDetails = {
        status: req.body.blockStatus,
      };
      await Collection.findByIdAndUpdate(
        req.body.collectionID,
        collectionDetails,
        (err, collectionData) => {
          if (err) return res.reply(messages.server_error());
          if (!collectionData)
            return res.reply(messages.not_found("Collection"));
          return res.reply(
            messages.successfully("Collection Block Status Updated")
          );
        }
      ).catch((e) => {
        return res.reply(messages.error());
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }
  async blockUnblockNFT(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      if (!req.body.nftID) {
        return res.reply(messages.not_found("NFT ID"));
      }
      if (req.body.blockStatus === undefined) {
        return res.reply(messages.not_found("Block Status"));
      }
      let nftDetails = {};
      nftDetails = {
        status: req.body.blockStatus,
      };
      await NFT.findByIdAndUpdate(
        req.body.nftID,
        nftDetails,
        (err, nftData) => {
          if (err) return res.reply(messages.server_error());
          if (!nftData) return res.reply(messages.not_found("NFT"));
          return res.reply(messages.successfully("NFT Block Status Updated"));
        }
      ).catch((e) => {
        return res.reply(messages.error());
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  async insertMintAddress(req, res, next) {
    try {
      if (!req.body.address) {
        return res.reply(messages.not_found("Address"));
      }
      if (!req.body.type) {
        return res.reply(messages.not_found("Collection Type"));
      }
      let mintCollection = new MintCollection({
        address: req.body.address,
        type: req.body.type,
      });
      mintCollection
        .save()
        .then(async (result) => {
          console.log("Result", result);
          return res.reply(messages.created("Mint Collection"), result);
        })
        .catch((error) => {
          console.log("Created Mint Collection error", error);
          return res.reply(messages.error());
        });
    } catch (error) {
      console.log(error);
      return res.reply(messages.server_error());
    }
  }

  async fetchMintAddress(req, res) {
    try {
      console.log("reqq", req.body)
      await MintCollection.findOne({ address: req.body.address })
        .exec()
        .then((result) => {
          return res.reply(messages.success("Mint Collection List"), result);
        })
        .catch((e) => {
          console.log("Error", e);
        });
    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }

  async fetchAllMintAddresses(req, res) {
    try {
      await MintCollection.find()
        .exec()
        .then((result) => {
          return res.reply(messages.success("Mint Collection List"), result);
        })
        .catch((e) => {
          console.log("Error", e);
        });
    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }

  async deleteMintAddress(req, res) {
    try {
      await MintCollection.deleteOne({ address: req.body?.address })
        .exec()
        .then((result) => {
          return res.reply(messages.success("Collection Deleted"), result);
        })
        .catch((e) => {
          console.log("Error", e);
        });
    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }


  async fetchOfferMade(req, res) {
    console.log("req", req.body);
    try {
      let data = [];
      const page = parseInt(req.body.page);
      const limit = parseInt(req.body.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      let searchArray = [];
      searchArray["nftsData.status"] = 1;
      searchArray["bidStatus"] = "MakeOffer";
      searchArray["bidderID"] = mongoose.Types.ObjectId(req.body.userID);
      let searchObj = Object.assign({}, searchArray);

      let isOnMarketplaceSearchArray = [];
      isOnMarketplaceSearchArray["$match"] = { "CollectionData.status": 1, "CollectionData.hashStatus": 1 };
      let isOnMarketplaceSearchObj = Object.assign(
        {},
        isOnMarketplaceSearchArray
      );
      console.log("isOnMarketplaceSearchObj", isOnMarketplaceSearchObj);

      let bids = await Bid.aggregate([
        {
          $lookup: {
            from: "nfts",
            localField: "nftID",
            foreignField: "_id",
            as: "nftsData",
          },
        },
        {
          $lookup: {
            from: "collections",
            localField: "nftsData.collectionID",
            foreignField: "_id",
            as: "CollectionData",
          },
        },
        isOnMarketplaceSearchObj,
        {
          $lookup: {
            from: "orders",
            localField: "nftsData._id",
            foreignField: "nftID",
            as: "OrderData",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "OwnerData",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "bidderID",
            foreignField: "_id",
            as: "BidderData",
          },
        },
        { $match: searchObj },
        {
          $project: {
            _id: 1,
            bidderID: 1,
            owner: 1,
            bidStatus: 1,
            bidPrice: 1,
            bidDeadline: 1,
            bidQuantity: 1,
            isOffer: 1,
            paymentToken: 1,
            createdOn: 1,
            "nftsData._id": 1,
            "nftsData.name": 1,
            "nftsData.type": 1,
            "nftsData.image": 1,
            "CollectionData._id": 1,
            "CollectionData.name": 1,
            "CollectionData.contractAddress": 1,
            "CollectionData.isOnMarketplace": 1,
            "CollectionData.status": 1,
            "OrderData._id": 1,
            "OrderData.price": 1,
            "OrderData.salesType": 1,
            "OrderData.paymentToken": 1,
            "BrandData._id": 1,
            "BrandData.name": 1,
            "BrandData.logoImage": 1,
            "BrandData.coverImage": 1,
            "OwnerData._id": 1,
            "OwnerData.username": 1,
            "OwnerData.fullname": 1,
            "OwnerData.walletAddress": 1,
            "BidderData._id": 1,
            "BidderData.username": 1,
            "BidderData.fullname": 1,
            "BidderData.walletAddress": 1,
          },
        },
        { $sort: { createdOn: -1 } },
        { $skip: startIndex },
        { $limit: limit },

      ]).exec(function (e, offerData) {
        console.log("Error ", e);
        let results = {};
        results.count = offerData?.length ? offerData.length : 0;
        results.results = offerData;
        return res.reply(messages.success("Offer List"), results);
      });
    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }

  async fetchOfferReceived(req, res) {
    console.log("req", req.body);
    try {
      let data = [];
      const page = parseInt(req.body.page);
      const limit = parseInt(req.body.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      let searchArray = [];
      searchArray["nftsData.status"] = 1;
      searchArray["bidStatus"] = "MakeOffer";
      searchArray["nftsData.ownedBy"] = {
        $elemMatch: {
          address: req.body.userWalletAddress?.toLowerCase(),
          quantity: { $gt: 0 },
        },
      };
      let searchObj = Object.assign({}, searchArray);

      let isOnMarketplaceSearchArray = [];
      isOnMarketplaceSearchArray["$match"] = { "CollectionData.status": 1, "CollectionData.hashStatus": 1 };
      let isOnMarketplaceSearchObj = Object.assign(
        {},
        isOnMarketplaceSearchArray
      );
      console.log("isOnMarketplaceSearchObj", isOnMarketplaceSearchObj);

      let bids = await Bid.aggregate([
        {
          $lookup: {
            from: "nfts",
            localField: "nftID",
            foreignField: "_id",
            as: "nftsData",
          },
        },
        {
          $lookup: {
            from: "collections",
            localField: "nftsData.collectionID",
            foreignField: "_id",
            as: "CollectionData",
          },
        },
        isOnMarketplaceSearchObj,
        {
          $lookup: {
            from: "orders",
            localField: "nftsData._id",
            foreignField: "nftID",
            as: "OrderData",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "OwnerData",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "bidderID",
            foreignField: "_id",
            as: "BidderData",
          },
        },
        { $match: searchObj },
        {
          $project: {
            _id: 1,
            bidderID: 1,
            owner: 1,
            bidStatus: 1,
            bidPrice: 1,
            bidDeadline: 1,
            bidQuantity: 1,
            isOffer: 1,
            paymentToken: 1,
            createdOn: 1,
            "nftsData._id": 1,
            "nftsData.name": 1,
            "nftsData.type": 1,
            "nftsData.image": 1,
            "CollectionData._id": 1,
            "CollectionData.name": 1,
            "CollectionData.contractAddress": 1,
            "CollectionData.isOnMarketplace": 1,
            "CollectionData.status": 1,
            "OrderData._id": 1,
            "OrderData.price": 1,
            "OrderData.salesType": 1,
            "OrderData.paymentToken": 1,
            "BrandData._id": 1,
            "BrandData.name": 1,
            "BrandData.logoImage": 1,
            "BrandData.coverImage": 1,
            "OwnerData._id": 1,
            "OwnerData.username": 1,
            "OwnerData.fullname": 1,
            "OwnerData.walletAddress": 1,
            "BidderData._id": 1,
            "BidderData.username": 1,
            "BidderData.fullname": 1,
            "BidderData.walletAddress": 1,
          },
        },
        { $sort: { createdOn: -1 } },
        { $skip: startIndex },
        { $limit: limit },

      ]).exec(function (e, offerData) {
        console.log("Error ", e);
        let results = {};
        results.count = offerData?.length ? offerData.length : 0;
        results.results = offerData;
        return res.reply(messages.success("Offer List"), results);
      });
    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }

  async updateStatus(req, res) {
    try {

      if (!req.userId) return res.reply(messages.unauthorized());
      console.log("Here");
      console.log("req", req.body);
      if (!req.body.recordID) {
        return res.reply(messages.not_found("Record ID"));
      }
      if (!req.body.DBCollection) {
        return res.reply(messages.not_found("Collection Name"));
      }
      if (req.body.hashStatus === undefined) {
        return res.reply(messages.not_found("Hash Status"));
      }
      let hash = "";
      if (req.body.hash !== undefined) {
        hash = req.body.hash;
      }
      let details = {};

      details = {
        hashStatus: req.body.hashStatus,
      };
      if (hash !== "") {
        details.hash = hash;
      }
      let DBCollection = req.body.DBCollection;
      if (DBCollection === "NFT") {
        console.log("Inside NFT");
        await NFT.find({ _id: mongoose.Types.ObjectId(req.body.recordID) },
          async function (errf, nftFound) {
            if (errf) return res.reply(messages.server_error());
            if (!nftFound) return res.reply(messages.not_found("NFT"));
            if (nftFound.hashStatus === req.body.hashStatus && (nftFound.hash !== "" || nftFound.hash !== "0x0" || nftFound.hash !== undefined)) return res.reply(messages.already_exists("Same Data"));
          })
        await NFT.findByIdAndUpdate(
          req.body.recordID,
          details,
          (err, resData) => {
            if (err) return res.reply(messages.server_error());
            if (!resData) return res.reply(messages.not_found("NFT"));

            return res.reply(messages.successfully("NFT Hash Status Updated"));
          }
        ).catch((e) => {
          return res.reply(messages.error());
        });
      }
      if (DBCollection === "Collection") {
        console.log("Inside Collection");
        details = {
          hashStatus: req.body.hashStatus,
          contractAddress: req.body.contractAddress,
        };
        await Collection.find({ _id: mongoose.Types.ObjectId(req.body.recordID) },
          async function (errf, nftFound) {
            if (errf) return res.reply(messages.server_error());
            if (!nftFound) return res.reply(messages.not_found("NFT"));
            if (nftFound.hashStatus === req.body.hashStatus && (nftFound.hash !== "" || nftFound.hash !== "0x0" || nftFound.hash !== undefined)) return res.reply(messages.already_exists("Same Data"));
          })
        await Collection.findByIdAndUpdate(
          req.body.recordID,
          details,
          (err, resData) => {
            if (err) return res.reply(messages.server_error());
            if (!resData) return res.reply(messages.not_found("Collection"));
            return res.reply(messages.successfully("Collection Hash Status Updated"));
          }
        ).catch((e) => {
          return res.reply(messages.error());
        });
      }
      if (DBCollection === "Order") {
        console.log("Inside Order");
        await Order.find({ _id: mongoose.Types.ObjectId(req.body.recordID) },
          async function (errf, nftFound) {
            if (errf) return res.reply(messages.server_error());
            if (!nftFound) return res.reply(messages.not_found("NFT"));
            if (nftFound.hashStatus === req.body.hashStatus && (nftFound.hash !== "" || nftFound.hash !== "0x0" || nftFound.hash !== undefined)) return res.reply(messages.already_exists("Same Data"));
          })
        await Order.findByIdAndUpdate(
          req.body.recordID,
          details,
          (err, resData) => {
            if (err) return res.reply(messages.server_error());
            if (!resData) return res.reply(messages.not_found("Order"));
            console.log("status--------------------------------->", resData.hashStatus, req.body.hashStatus);
            return res.reply(messages.successfully("Order Hash Status Updated"));
          }
        ).catch((e) => {
          return res.reply(messages.error());
        });
      }
      if (DBCollection === "Bids") {
        console.log("Inside Bids");
        await Bid.find({ _id: mongoose.Types.ObjectId(req.body.recordID) },
          async function (errf, nftFound) {
            if (errf) return res.reply(messages.server_error());
            if (!nftFound) return res.reply(messages.not_found("NFT"));
            if (nftFound.hashStatus === req.body.hashStatus && (nftFound.hash !== "" || nftFound.hash !== "0x0" || nftFound.hash !== undefined)) return res.reply(messages.already_exists("Same Data"));
          })
        await Bid.findByIdAndUpdate(
          req.body.recordID,
          details,
          (err, resData) => {
            console.log("data", resData);
            if (err) return res.reply(messages.server_error());
            if (!resData) return res.reply(messages.not_found("Bids"));
            return res.reply(messages.successfully("Bids Hash Status Updated"));
          }
        ).catch((e) => {
          return res.reply(messages.error());
        });
      }
    } catch (error) {
      console.log("Error", error)
      return res.reply(messages.server_error());
    }
  }

  async nftButtons(req, res) {
    try {
      let results = [];
      let nftID = req.body.nftID;
      let userID = "";
      let isOwner = 0;
      let onMarketPLace = 0;
      let hasBid = 0;
      let hasOffer = 0;
      if (req.body.userID && req.body.userID !== undefined) {
        userID = req.body.userID;
      }
      let walletAddress = "";
      if (req.body.walletAddress && req.body.walletAddress !== undefined) {
        walletAddress = req.body.walletAddress;
        walletAddress = walletAddress?.toLowerCase()
      }
      if (walletAddress !== "" && userID !== "") {
        let searchArray = [];
        searchArray["_id"] = mongoose.Types.ObjectId(nftID);
        searchArray["ownedBy"] = {
          $elemMatch: {
            address: walletAddress?.toLowerCase(),
            quantity: { $gt: 0 },
          }
        }
        let searchObj = Object.assign({}, searchArray);
        isOwner = await NFT.countDocuments(searchObj).exec();
        console.log("Is Owner", isOwner);
        if (isOwner > 0) {
          let searchArray1 = [];
          searchArray1["_id"] = mongoose.Types.ObjectId(nftID);
          searchArray1["OrderData.0"] = { $exists: true }
          let searchObj1 = Object.assign({}, searchArray1);
          console.log("searchObj1", searchObj1)
          await NFT.aggregate([
            {
              $lookup: {
                from: "orders",
                localField: "_id",
                foreignField: "nftID",
                as: "OrderData",
              },
            },
            { $match: searchObj1 },
            {
              $project: {
                _id: 1,
                hasOrder: {
                  $cond: { if: { $isArray: "$OrderData" }, then: { $size: "$OrderData" }, else: "NA" }
                },
              },
            },
          ]).exec(function (e, nftData) {
            onMarketPLace = nftData?.length ? nftData.length : 0;
            if (onMarketPLace === 0) {
              results.push("Put On Marketplace");
            } else {
              results.push("Remove From Sale");
            }
            return res.reply(messages.successfully("Data"), results);
          });
        } else {
          let searchArray = [];
          searchArray["nftID"] = mongoose.Types.ObjectId(nftID);
          if (userID !== "") {
            searchArray["bidderID"] = mongoose.Types.ObjectId(userID);
          }
          searchArray["bidQuantity"] = { $gte: 1 };
          searchArray["bidStatus"] = "Bid";
          let searchObj = Object.assign({}, searchArray);
          hasBid = await Bid.countDocuments(searchObj).exec();

          console.log("hasBid", 0);

          let searchArray1 = [];
          searchArray1["nftID"] = mongoose.Types.ObjectId(nftID);
          if (userID !== "") {
            searchArray1["bidderID"] = mongoose.Types.ObjectId(userID);
          }
          searchArray1["bidQuantity"] = { $gte: 1 };
          searchArray1["bidStatus"] = "MakeOffer";
          searchArray1["isOffer"] = true;
          let searchObj1 = Object.assign({}, searchArray1);
          console.log("searchObj1", searchObj1)
          hasOffer = await Bid.countDocuments(searchObj1).exec();
          console.log("hasOffer", hasOffer);
          if (hasOffer === 0) {
            results.push("Make Offer");
          } else {
            results.push("Update Offer");
          }

          let searchArray2 = [];
          searchArray2["_id"] = mongoose.Types.ObjectId(nftID);
          searchArray2["OrderData.0"] = { $exists: true }
          let searchObj2 = Object.assign({}, searchArray2);
          await NFT.aggregate([
            {
              $lookup: {
                from: "orders",
                localField: "_id",
                foreignField: "nftID",
                as: "OrderData",
              },
            },
            { $match: searchObj2 },
            {
              $project: {
                _id: 1,
                "OrderData.salesType": 1,
                hasOrder: {
                  $cond: { if: { $isArray: "$OrderData" }, then: { $size: "$OrderData" }, else: "NA" }
                },
              },
            },
          ]).exec(function (e, nftData) {
            console.log("nftData", nftData)
            let onMarketPLace = nftData?.length ? nftData.length : 0;
            console.log("onMarketPLace", onMarketPLace)
            if (onMarketPLace === 0) {
              return res.reply(messages.successfully("Data"), results);
            } else {
              if (nftData[0]?.OrderData[0]?.salesType == 0) {
                results.push("Buy Now");
              } else {
                if (hasBid === 0) {
                  results.push("Place a Bid");
                } else {
                  results.push("Update Bid");
                }
              }
              return res.reply(messages.successfully("Data"), results);
            }
          });
        }
      } else {
        results.push("Make Offer");
        let searchArray2 = [];
        searchArray2["_id"] = mongoose.Types.ObjectId(nftID);
        searchArray2["OrderData.0"] = { $exists: true }
        let searchObj2 = Object.assign({}, searchArray2);
        await NFT.aggregate([
          {
            $lookup: {
              from: "orders",
              localField: "_id",
              foreignField: "nftID",
              as: "OrderData",
            },
          },
          { $match: searchObj2 },
          {
            $project: {
              _id: 1,
              "OrderData.salesType": 1,
              hasOrder: {
                $cond: { if: { $isArray: "$OrderData" }, then: { $size: "$OrderData" }, else: "NA" }
              },
            },
          },
        ]).exec(function (e, nftData) {
          let onMarketPLace = nftData?.length ? nftData.length : 0;
          console.log("onMarketPLace", onMarketPLace)
          if (onMarketPLace === 0) {
            return res.reply(messages.successfully("Datafgdh"), results);
          } else {
            if (nftData[0]?.OrderData[0]?.salesType == 0) {
              results.push("Buy Now");
            } else {
              if (hasBid === 0) {
                results.push("Place a Bid");
              } else {
                results.push("Update Bid");
              }
            }
            return res.reply(messages.successfully("Data"), results);
          }
        });
      }

    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }

  async refreshMetaData(req, res) {
    try {
      let nftID = req.body.nftID;
      NFT.find({ _id: mongoose.Types.ObjectId(nftID) }, async function (err, nftData) {
        if (err) {
          return res.reply(messages.server_error("NFT"));
        } else {

          if (nftData.length == 0) {
            return res.reply(messages.not_found("NFT"));
          } else {
            let ContractType = "ERC1155";
            let ContractABI = erc1155Abi ? erc1155Abi.abi : "";
            if (nftData[0]?.type === 1) {
              ContractType = "ERC721";
              ContractABI = erc721Abi ? erc721Abi.abi : "";
            }
            console.log("Contract is", ContractType)
            let contract = new web3.eth.Contract(ContractABI, nftData[0].collectionAddress);
            let tokenID = parseInt(nftData[0].tokenID);
            if (nftData[0].isImported === 0) {
              console.log("Created on Plateform");
              let tokenURI = await contract.methods.tokenURI(tokenID).call();
              try {
                https.get(tokenURI, (resData) => {
                  let body = "";
                  resData.on("data", (chunk) => {
                    body += chunk;
                  });
                  resData.on("end", async () => {
                    try {
                      let newJSON = JSON.parse(body);
                      let updateNFTData = {
                        name: newJSON.name,
                        description: newJSON.description,
                        image: newJSON.image,
                        updatedOn: Date.now()
                      }
                      await NFT.findOneAndUpdate(
                        { _id: mongoose.Types.ObjectId(nftID) },
                        { $set: updateNFTData }, { new: true }, function (err, updateNFT) {
                          if (err) {
                            console.log("Error in Updating NFT" + err);
                            return res.reply(messages.error());
                          } else {
                            console.log("NFT MetaData Updated: ", updateNFT);
                            return res.reply(messages.created("NFT Updated"), updateNFT);
                          }
                        }
                      );
                    } catch (error) {
                      console.log("Error ", error);
                      return res.reply(messages.server_error());
                    };
                  });
                }).on("error", (error) => {
                  console.log("Error ", error);
                  return res.reply(messages.server_error());
                });
              } catch (error) {
                console.log("Error ", error);
                return res.reply(messages.server_error());
              }
            } else {
              console.log("Imported on Plateform");
              let $request = [];
              $request["address"] = nftData[0].collectionAddress;
              $request["chain_id"] = chainID;
              $request["token_id"] = nftData[0].tokenID;
              let payload = Object.assign({}, $request);
              try {
                var myDate = new Date();
                var myDate2 = new Date(myDate.getTime() + timeInterval * 60000);
                var dateCurrent = new Date(myDate2);
                var dateDatabase = new Date(nftData[0].lastUpdatedOn);
                if (dateCurrent.getTime() > dateDatabase.getTime()) {
                  console.log("payload", payload)
                  let response = await axios.post(postAPIURL + 'tokenRefresh/', payload);

                  let data = response.data;
                  console.log("data", data)
                  console.log("data", data?.updateMetadata, data?.updateOwner, nftData[0].previewImg)
                  if (data?.updateMetadata !== undefined && (data?.updateMetadata === "success" || data?.updateMetadata === "unchanged")) {
                    let tokenURI = nftMetaBaseURL + "tokenDetailsExtended?ChainId=" + chainID + "&ContractAddress=" + nftData[0].collectionAddress + "&TokenId=" + tokenID;
                    console.log("tokenURI Check", tokenURI)
                    try {
                      https.get(tokenURI, (resData) => {
                        let body = "";
                        resData.on("data", (chunk) => {
                          body += chunk;
                        });
                        resData.on("end", async () => {
                          try {
                            let newJSON = JSON.parse(body);

                            let lastUpdated = newJSON[0]?.metadata_last_updated;
                            var d = new Date(0);
                            let lastUpdateMetaDB = d.setUTCSeconds(lastUpdated);
                            console.log("lastUpdateMetaDB", lastUpdateMetaDB, newJSON[0]?.metadata_last_updated)
                            var d1 = new Date(lastUpdateMetaDB);
                            var d2 = new Date(nftData[0].lastUpdatedOn);
                            if (d1.getTime() === d2.getTime() && nftData[0].previewImg !== "") {
                              console.log("No change");
                              return res.reply(messages.already_updated("NFT"));
                            } else {
                              console.log("changed");
                              console.log("PrevImg", newJSON[0].S3Images.S3Image300)
                              let updateNFTData = {
                                name: newJSON[0].name,
                                description: newJSON[0].description,
                                previewImg: newJSON[0]?.S3Images?.S3Image300 ? newJSON[0].S3Images.S3Image300 : "",
                                lastUpdatedOn: lastUpdateMetaDB
                              }

                              updateNFTData.image = "";
                              if (newJSON[0]?.S3Images?.S3Animation === "" || newJSON[0]?.S3Images?.S3Animation === null) {
                                updateNFTData.image = newJSON[0]?.S3Images?.S3Image ? newJSON[0].S3Images.S3Image : "";
                              } else {
                                updateNFTData.image = newJSON[0]?.S3Images?.S3Animation ? newJSON[0].S3Images.S3Animation : "";
                              }
                              if (updateNFTData.image === "") {
                                updateNFTData.image = newJSON[0]?.image ? newJSON[0].image : "";
                              }

                              await NFT.findOneAndUpdate(
                                { _id: mongoose.Types.ObjectId(nftID) },
                                { $set: updateNFTData }, { new: true }, function (err, updateNFT) {
                                  if (err) {
                                    console.log("Error in Updating NFT" + err);
                                    // return res.reply(messages.error());
                                  } else {
                                    console.log("NFT MetaData Updated: ", updateNFT);
                                    // return res.reply(messages.created("NFT Updated"), updateNFT);
                                  }
                                }
                              );
                            }

                          } catch (error) {
                            console.log("Error ", error);
                            return res.reply(messages.server_error());
                          };
                        });
                      }).on("error", (error) => {
                        console.log("Error ", error);
                        return res.reply(messages.server_error());
                      });
                    } catch (error) {
                      console.log("Error ", error);
                      return res.reply(messages.server_error());
                    }
                  }
                  if (data?.updateOwner !== undefined && (data?.updateOwner === "success" || data?.updateOwner === "unchanged")) {
                    let tokenURI = nftMetaBaseURL + "tokenOwner?ChainId=" + chainID + "&ContractAddress=" + nftData[0].collectionAddress + "&TokenId=" + tokenID;
                    console.log("tokenURI", tokenURI)
                    try {
                      https.get(tokenURI, (resData) => {
                        let body = "";
                        resData.on("data", (chunk) => {
                          body += chunk;
                        });
                        resData.on("end", async () => {
                          try {
                            let newJSON = JSON.parse(body);
                            console.log("newJSON", newJSON)

                            let ownerAddress = newJSON?.owner;
                            let OwnedBy = [];
                            let updateNFTData = { ownedBy: OwnedBy }
                            await NFT.findOneAndUpdate(
                              { _id: mongoose.Types.ObjectId(nftID) },
                              { $set: updateNFTData }, { new: true }, async function (err, updateNFT) {
                                if (err) {
                                  console.log("Error in Updating NFT" + err);
                                } else {
                                  OwnedBy.push({
                                    address: ownerAddress,
                                    quantity: 1,
                                  });
                                  updateNFTData = { ownedBy: OwnedBy }
                                  await NFT.findOneAndUpdate(
                                    { _id: mongoose.Types.ObjectId(nftID) },
                                    { $set: updateNFTData }, { new: true }, async function (err, updateNFT) {
                                      if (err) {
                                        console.log("Error in Updating NFT" + err);
                                        return res.reply(messages.error());
                                      } else {
                                        let $request = [];
                                        $request["RequestType"] = "";
                                        $request["ContractAddress"] = nftData[0].collectionAddress;
                                        $request["InternalName"] = "";
                                        $request["TokenIds"] = [tokenID]
                                        let payload = Object.assign({}, $request);
                                        try {
                                          let response = await axios.post(postAPIURL + 'refreshOwner/', payload);
                                        } catch (error) {
                                          console.log("Error ", error);
                                        }
                                        await User.findOne({ walletAddress: _.toChecksumAddress(ownerAddress) },
                                          async (err, user) => {
                                            if (err) return res.reply(messages.error());
                                            if (!user) {
                                              const user = new User({
                                                walletAddress: _.toChecksumAddress(ownerAddress?.toLowerCase()),
                                              });
                                              user.save().then(async (result) => {
                                                await Order.deleteMany({ nftID: mongoose.Types.ObjectId(nftID) }).then(function () {
                                                  console.log("Order Data Deleted");
                                                }).catch(function (error) {
                                                  console.log("Error in Order Data Deleted", error);
                                                });
                                                await Bid.deleteMany({ nftID: mongoose.Types.ObjectId(nftID), bidStatus: "Bid", }).then(function () {
                                                  console.log("Order Bid Deleted UpdateOrder");
                                                }).catch(function (error) {
                                                  console.log("Error in Bid Data Deleted UpdateOrder", error);
                                                });
                                              }).catch((error) => {
                                              });
                                            } else {
                                              console.log("User ID is ", user, user?._id);
                                              // await Order.deleteMany({ nftID: mongoose.Types.ObjectId(nftID) }).then(function () {
                                              //   console.log("Order Data Deleted");
                                              // }).catch(function (error) {
                                              //   console.log("Error in Order Data Deleted", error);
                                              // });
                                              await Bid.deleteMany({ nftID: mongoose.Types.ObjectId(nftID), bidderID: mongoose.Types.ObjectId(user?._id), bidStatus: "Bid", }).then(function () {
                                                console.log("Order Bid Deleted UpdateOrder");
                                              }).catch(function (error) {
                                                console.log("Error in Bid Data Deleted UpdateOrder", error);
                                              });
                                              await Bid.deleteMany({ nftID: mongoose.Types.ObjectId(nftID), bidderID: mongoose.Types.ObjectId(user?._id), bidStatus: "MakeOffer", }).then(function () {
                                                console.log("Order Bid Deleted UpdateOrder");
                                              }).catch(function (error) {
                                                console.log("Error in Bid Data Deleted UpdateOrder", error);
                                              });
                                            }
                                          });
                                        console.log("NFT MetaData Updated: ", updateNFT);
                                      }
                                    }
                                  );
                                }
                              }
                            );
                          } catch (error) {
                            console.log("Error ", error);
                            return res.reply(messages.server_error());
                          };
                        });
                      }).on("error", (error) => {
                        console.log("Error ", error);
                        return res.reply(messages.server_error());
                      });
                    } catch (error) {
                      console.log("Error ", error);
                      return res.reply(messages.server_error());
                    }
                  }
                  return res.reply(messages.already_updated("NFT"));
                } else {
                  return res.reply(messages.already_updated("NFT"));
                }
              } catch (error) {
                console.log("Error ", error);
                return res.reply(messages.server_error());
              }
            }
          }
        }
      });
    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }

  async updateOwner(req, res) {
    try {
      let collectionAddress = req.body.collectionAddress;
      let tokenID = req.body.tokenID;
      NFT.find({ collectionAddress: collectionAddress, tokenID: tokenID }, async function (err, nftData) {
        if (err) {
          return res.reply(messages.server_error("NFT"));
        } else {
          if (nftData.length == 0) {
            return res.reply(messages.not_found("NFT"));
          } else {
            let ContractType = "ERC1155";
            let ContractABI = erc1155Abi ? erc1155Abi.abi : "";
            if (nftData[0]?.type === 1) {
              ContractType = "ERC721";
              ContractABI = erc721Abi ? erc721Abi.abi : "";
            }
            let nftID = nftData[0]._id;
            let contract = new web3.eth.Contract(ContractABI, nftData[0].collectionAddress);
            let tokenID = parseInt(nftData[0].tokenID);
            try {
              // if (nftData[0]?.type === 1) {
              let ownerAddress = await contract.methods.ownerOf(tokenID).call();
              console.log("Owner is ", ownerAddress);
              let OwnedBy = [];
              let updateNFTData = { ownedBy: OwnedBy }
              await NFT.findOneAndUpdate(
                { _id: mongoose.Types.ObjectId(nftID) },
                { $set: updateNFTData }, { new: true }, async function (err, updateNFT) {
                  if (err) {
                    console.log("Error in Updating NFT" + err);
                    return res.reply(messages.error());
                  } else {
                    OwnedBy.push({
                      address: ownerAddress,
                      quantity: 1,
                    });
                    updateNFTData = { ownedBy: OwnedBy }
                    await NFT.findOneAndUpdate(
                      { _id: mongoose.Types.ObjectId(nftID) },
                      { $set: updateNFTData }, { new: true }, async function (err, updateNFT) {
                        if (err) {
                          console.log("Error in Updating NFT" + err);
                          return res.reply(messages.error());
                        } else {
                          let $request = [];
                          $request["RequestType"] = "";
                          $request["ContractAddress"] = nftData[0].collectionAddress;
                          $request["InternalName"] = "";
                          $request["TokenIds"] = [tokenID]
                          let payload = Object.assign({}, $request);
                          try {
                            let response = await axios.post(postAPIURL + 'refreshOwner/', payload);
                          } catch (error) {
                            console.log("Error ", error);
                          }
                          await User.findOne({ walletAddress: _.toChecksumAddress(ownerAddress) },
                            async (err, user) => {
                              if (err) return res.reply(messages.error());
                              if (!user) {
                                const user = new User({
                                  walletAddress: _.toChecksumAddress(ownerAddress?.toLowerCase()),
                                });
                                user.save().then(async (result) => {
                                  await Order.deleteMany({ nftID: mongoose.Types.ObjectId(nftID) }).then(function () {
                                    console.log("Order Data Deleted");
                                  }).catch(function (error) {
                                    console.log("Error in Order Data Deleted", error);
                                  });
                                  await Bid.deleteMany({ nftID: mongoose.Types.ObjectId(nftID), bidStatus: "Bid", }).then(function () {
                                    console.log("Order Bid Deleted UpdateOrder");
                                  }).catch(function (error) {
                                    console.log("Error in Bid Data Deleted UpdateOrder", error);
                                  });
                                }).catch((error) => {
                                });
                              } else {
                                console.log("User ID is ", user, user?._id);
                                await Order.deleteMany({ nftID: mongoose.Types.ObjectId(nftID) }).then(function () {
                                  console.log("Order Data Deleted");
                                }).catch(function (error) {
                                  console.log("Error in Order Data Deleted", error);
                                });
                                await Bid.deleteMany({ nftID: mongoose.Types.ObjectId(nftID), bidderID: mongoose.Types.ObjectId(user?._id), bidStatus: "Bid", }).then(function () {
                                  console.log("Order Bid Deleted UpdateOrder");
                                }).catch(function (error) {
                                  console.log("Error in Bid Data Deleted UpdateOrder", error);
                                });
                                await Bid.deleteMany({ nftID: mongoose.Types.ObjectId(nftID), bidderID: mongoose.Types.ObjectId(user?._id), bidStatus: "MakeOffer", }).then(function () {
                                  console.log("Order Bid Deleted UpdateOrder");
                                }).catch(function (error) {
                                  console.log("Error in Bid Data Deleted UpdateOrder", error);
                                });
                              }
                            });
                          console.log("NFT MetaData Updated: ", updateNFT);
                          return res.reply(messages.created("NFT Owner Updated"), updateNFT);
                        }
                      }
                    );
                  }
                }
              );
              // }
            } catch (error) {
              console.log("Error is ", error)
            }
          }
        }
      });

    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  async viewCollectionStats(req, res) {
    console.log("req.body.collectionID", req.body.collectionID)
    let collectionID = req.body.collectionID;
    try {
      let stats = {}
      let searchArray = [];
      searchArray["collectionID"] = mongoose.Types.ObjectId(collectionID);
      let searchObj = Object.assign({}, searchArray);
      console.log("searchObj", searchObj)
      let owners = []
      let prices = []
      await NFT.aggregate([
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "nftID",
            as: "OrderData",
          },
        },
        { $match: searchObj },
        {
          $project: {
            _id: 1,
            hasOrder: {
              $cond: { if: { $isArray: "$OrderData" }, then: { $size: "$OrderData" }, else: "NA" }
            },
            ownedBy: 1,
            "OrderData._id": 1,
            "OrderData.price": 1,
            "OrderData.salesType": 1,
            "OrderData.paymentToken": 1,
          },
        },
      ]).exec(function (e, nftData) {
        // console.log("Error ", e, nftData)
        nftData.map((n, i) => {
          n?.ownedBy?.length > 0 ? n?.ownedBy.map((o, key) => {
            // console.log("nft", o?.address)
            if (!owners.includes(o?.address))
              owners.push(o?.address)
          })
            : ""
        })
        let minPrice = 0
        console.log("hereee", nftData)
        nftData.map(async (n, i) => {
          if (n?.OrderData?.length > 0) {
            minPrice = parseInt(n?.OrderData[0]?.price);
          }
        })


        console.log("111", minPrice)
        nftData.map(async (n, i) => {
          if (n?.OrderData?.length > 0) {
            console.log("Order Data", n?.OrderData);
            n?.OrderData?.length && n?.OrderData?.map(async (o, key) => {
              console.log("222", minPrice)
              console.log("o", o.paymentToken)
              let price
              if (o.paymentToken === "0x0000000000000000000000000000000000000000") {
                let contract = new web3.eth.Contract(PriceFeedAbi, "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526");
                // console.log("contract", contract)
                price = await contract.methods.latestAnswer().call()
                console.log("priceee", price.toString())
              }
              else
                price = 1
              console.log("min price 11", parseInt(minPrice), parseInt(o?.price), parseInt(minPrice) > parseInt(o?.price))
              console.log("price", parseInt(o?.price))
              if (parseInt(minPrice) > parseInt(o?.price)) {
                console.log("min price 22", parseInt(minPrice), parseInt(o?.price))
                minPrice = parseInt(o?.price)
              }
            })
          }
        })


        stats.owners = owners.length;
        stats.floorPrice = minPrice;
        // console.log("nft", owners, minPrice)
        return res.reply(messages.success("collection stats"), stats);
      });
    }
    catch (e) {
      console.log("error", e)
      return res.reply(messages.server_error());
    }
  }

  async viewBrandsStats(req, res) {
    let brandID = req.body.brandID;
    console.log("req.body.collectionID", brandID)

    try {
      let stats = {}
      let searchArray = [];
      searchArray["brandID"] = mongoose.Types.ObjectId(brandID);
      let searchObj = Object.assign({}, searchArray);
      console.log("searchObj", searchObj)
      let owners = []
      let prices = []


      await NFT.aggregate([
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "nftID",
            as: "OrderData",
          },
        },
        { $match: searchObj },
        {
          $project: {
            _id: 1,
            hasOrder: {
              $cond: { if: { $isArray: "$OrderData" }, then: { $size: "$OrderData" }, else: "NA" }
            },
            ownedBy: 1,
            "OrderData._id": 1,
            "OrderData.price": 1,
            "OrderData.salesType": 1,
            "OrderData.paymentToken": 1,
          },
        },
      ]).exec(function (e, nftData) {
        // console.log("Error ", e, nftData)
        nftData.map((n, i) => {
          n?.ownedBy?.length > 0 ? n?.ownedBy.map((o, key) => {
            // console.log("nft", o?.address)
            if (!owners.includes(o?.address))
              owners.push(o?.address)
          })
            : ""
        })
        let minPrice = 0
        console.log("hereee", nftData)
        nftData.map(async (n, i) => {
          if (n?.OrderData?.length > 0) {
            minPrice = parseInt(n?.OrderData[0]?.price);
          }
        })


        console.log("111", minPrice)
        nftData.map(async (n, i) => {
          if (n?.OrderData?.length > 0) {
            console.log("Order Data", n?.OrderData);
            n?.OrderData?.length && n?.OrderData?.map(async (o, key) => {
              console.log("222", minPrice)
              console.log("o", o.paymentToken)
              let price
              if (o.paymentToken === "0x0000000000000000000000000000000000000000") {
                let contract = new web3.eth.Contract(PriceFeedAbi, "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526");
                // console.log("contract", contract)
                price = await contract.methods.latestAnswer().call()
                console.log("priceee", price.toString())
              }
              else
                price = 1
              console.log("min price 11", parseInt(minPrice), parseInt(o?.price), parseInt(minPrice) > parseInt(o?.price))
              console.log("price", parseInt(o?.price))
              if (parseInt(minPrice) > parseInt(o?.price)) {
                console.log("min price 22", parseInt(minPrice), parseInt(o?.price))
                minPrice = parseInt(o?.price)
              }
            })
          }
        })


        stats.owners = owners.length;
        stats.floorPrice = minPrice;
        // console.log("nft", owners, minPrice)
        return res.reply(messages.success("collection stats"), stats);
      });
    }
    catch (e) {
      console.log("error", e)
      return res.reply(messages.server_error());
    }
  }

  async viewCollectionVolume(req, res) {
    console.log("req.body.collectionID", req.body.collectionID)
    let collectionID = req.body.collectionID;
    try {
      let result = {};
      let searchArray = [];
      searchArray["_id"] = mongoose.Types.ObjectId(collectionID);
      let searchObj = Object.assign({}, searchArray);
      console.log("searchObj", searchObj);
      await Collection.aggregate([
        {
          $lookup: {
            from: "transactions",
            localField: "contractAddress",
            foreignField: "collectionAddress",
            as: "TransactionData",
          },
        },
        { $match: searchObj },
      ]).exec(function (e, colData) {
        console.log("coll data", colData)
        let volumnTraded = 0;
        let averageCount = 0;

        colData.forEach((collectionData) => {
          let hashArray = [];
          let transactionCount = 0;
          collectionData?.TransactionData.forEach((transaction) => {
            if (!hashArray.includes(transaction?.hash)) {
              hashArray.push(transaction?.hash)
              transactionCount = transactionCount + 1
              console.log("collection data", transaction, "price", parseInt(transaction?.price))
              volumnTraded += parseInt(transaction?.price) * parseInt(transaction?.quantity_sold);
            }

          });
          // averageCount += collectionData?.TransactionData?.length;
          averageCount += transactionCount;
        });
        result.volumnTraded = volumnTraded;
        console.log("vol traded", result.volumnTraded)
        result.volumnAverage = volumnTraded / averageCount;
        console.log("avg vol traded", result.volumnAverage)
        return res.reply(messages.success("Collection Volume"), result);
      });
    }
    catch (e) {
      console.log("error", e)
      return res.reply(messages.server_error());
    }
  }

  async viewBrandVolume(req, res) {
    console.log("req.body.brandID", req.body.brandID)
    let brandID = req.body.brandID;
    try {
      let result = {};
      let searchArray = [];
      searchArray["brandID"] = mongoose.Types.ObjectId(brandID);
      let searchObj = Object.assign({}, searchArray);
      console.log("searchObj", searchObj);
      await Collection.aggregate([
        {
          $lookup: {
            from: "transactions",
            localField: "contractAddress",
            foreignField: "collectionAddress",
            as: "TransactionData",
          },
        },
        { $match: searchObj }
      ]).exec(function (e, colData) {
        let volumnTraded = 0;
        let averageCount = 0;
        colData.forEach((collectionData) => {
          let hashArray = [];
          let transactionCount = 0;
          collectionData?.TransactionData.forEach((transaction) => {
            if (!hashArray.includes(transaction?.hash)) {
              hashArray.push(transaction?.hash)
              transactionCount = transactionCount + 1
              volumnTraded += parseInt(transaction?.price) * parseInt(transaction?.quantity_sold);
            }
          });
          // averageCount += collectionData?.TransactionData?.length;
          averageCount += transactionCount;
        });
        result.volumnTraded = volumnTraded;
        result.volumnAverage = volumnTraded / averageCount;
        return res.reply(messages.success("Brand Volume"), result);

      });
    }
    catch (e) {
      console.log("error", e)
      return res.reply(messages.server_error());
    }
  }

  async checkCollectionName(req, res) {
    console.log("req.body.name", req.body.name)
    let name = req.body.name;
    try {
      await Collection.findOne({ name: name },
        async (err, record) => {
          if (err) {
            console.log("Error in fetching Collection Records ", err)
          }
          if (!record) {
            return res.reply(messages.not_found("Collection Name"));
          } else {
            return res.reply(messages.already_exists("Collection Name"), record);
          }
        }
      )
    }
    catch (e) {
      console.log("error", e)
      return res.reply(messages.server_error());
    }
  }
}

module.exports = NFTController;