const fs=require('fs');
const cloudinary=require('cloudinary').v2;
const multer=require('multer');
const {
    User,
    NFT,
    Bid,
    NewsLetterEmail,
    Category,
    Aboutus,
    Terms,
    FAQs,
   
}=require('../../models');
const {
    nodemailer
}=require('../../utils/index');
const validators=require("../helpers/validators");

const storage=multer.diskStorage({
    destination: (req,file,callback) => {
        callback(null,process.cwd()+'/public');
    },
    filename: (req,file,callback) => {
        callback(null,file.originalname);
    }
});
let oMulterObj={
    storage: storage,
    limits: {
        fileSize: 150*1024*1024 // 15mb
    },
};

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

const upload=multer(oMulterObj).single('logoImage');
const logoUpload=multer(oMulterObj).single('logoImage');

class AdminController {

    constructor() {

    }

    async updateProfile(req,res) {

        try {
            //if(!req.userId) return res.reply(messages.unauthorized());
            
            console.log("updateeeeeeee")

            let oProfileDetails={};

            await upload(req,res,async (erro) => {
                
                console.log("update profile is called");

                if(!req.body.sUserName) return res.reply(messages.not_found("User Name"));
                if(!req.body.sFirstname) return res.reply(messages.not_found("First Name"));
                if(!req.body.sLastname) return res.reply(messages.not_found("Last Name"));

                if(_.isUserName(req.body.sUserName)) return res.reply(messages.invalid("User Name"));
                if(_.isUserName(req.body.sFirstname)) return res.reply(messages.invalid("First Name"));
                if(_.isUserName(req.body.sLastname)) return res.reply(messages.invalid("Last Name"));

                oProfileDetails={
                    sUserName: req.body.sUserName,
                    oName: {
                        sFirstname: req.body.sFirstname,
                        sLastname: req.body.sLastname
                    },
                };
                 if (req.file != undefined) {

                     await cloudinary.uploader.upload(req.file.path, {
                         folder: "DecryptMarketplace/User_Profile"
                     })
                         .then(image => {
                             oProfileDetails["sProfilePicUrl"] = image.url;
                             fs.unlinkSync(req.file.path);
                         })
                         .catch(err => {
                             if (err) return res.reply(messages.error("Image Upload Failed"));
                         });
                 }
                User.findByIdAndUpdate(req.userId,oProfileDetails,
                    (err,user) => {
                        if(err) return res.reply(messages.server_error());
                        if(!user) return res.reply(messages.not_found('User'));
                        req.session["admin_firstname"]=req.body.sFirstname;
                        return res.reply(messages.updated('Admin Profile'));
                    });
                
                return res.reply(messages.updated('Admin Profile'));
            });
        } catch(error) {
            return res.reply(messages.server_error());
        }
    }

    async getDashboardData(req,res) {
        try {
            if(!req.userId) return res.reply(messages.unauthorized());

            let nTotalRegisterUsers=0;

            nTotalRegisterUsers=await User.collection.countDocuments({
                sRole: 'user'
            });
            let data=await User.aggregate([{
                $match: {
                    sRole: 'user'
                }
            },
            {
                $group: {
                    _id: {
                        day: {
                            $dayOfMonth: "$sCreated"
                        },
                        month: {
                            $month: "$sCreated"
                        },
                        year: {
                            $year: "$sCreated"
                        }
                    },
                    count: {
                        $sum: 1
                    },
                    date: {
                        $first: "$sCreated"
                    },
                },
            },
            {
                $sort: {
                    date: -1
                }
            }
            ]);

            let aFixedSaleNFTsCount=await NFT.aggregate([{
                $match: {
                    eAuctionType: 'Fixed Sale'
                }
            },{
                $group: {
                    _id: 'Fixed Sale',
                    count: {
                        $sum: 1
                    }
                }
            }]);

            let aAuctionNFTsCount=await NFT.aggregate([{
                $match: {
                    eAuctionType: 'Auction'
                }
            },{
                $group: {
                    _id: 'Auction',
                    count: {
                        $sum: 1
                    }
                }
            }]);

            let aSoldNFTsCount=await Bid.aggregate([{
                '$match': {
                    '$or': [{
                        'eBidStatus': 'Sold'
                    },{
                        'eBidStatus': 'Accepted'
                    }]
                }
            },{
                '$group': {
                    '_id': 'Sold',
                    'count': {
                        '$sum': 1
                    }
                }
            }]);

            return res.reply(messages.success(),{
                nTotalRegisterUsers,
                data,
                nFixedSaleNFTsCount: (!aFixedSaleNFTsCount[0])? 0:aFixedSaleNFTsCount[0].count,
                nAuctionNFTsCount: (!aAuctionNFTsCount[0])? 0:aAuctionNFTsCount[0].count,
                nSoldNFTsCount: (!aSoldNFTsCount[0])? 0:aSoldNFTsCount[0].count
            });
        } catch(error) {
            return res.reply(messages.server_error());
        }
    };

    async users(req,res,next) {
        try {
            // Per page limit
            var nLimit=parseInt(req.body.length);
            // From where to start
            var nOffset=parseInt(req.body.start);

            // Get total number of records
            let nTotalUsers=await User.countDocuments({
                "sRole": {
                    $ne: "admin"
                }
            });

            var oSearchData={
                $or: []
            };

            if(req.body.search.value!='') {

                var re=new RegExp(`.*${req.body.search.value}.*`,'i');

                oSearchData['$or'].push({
                    'sUserName': re
                });
            }

            if(!oSearchData['$or'].length) {
                delete oSearchData['$or'];
            }

            let oSortingOrder={};
            oSortingOrder[req.body.columns[parseInt(req.body.order[0].column)].data]=(req.body.order[0].dir=="asc")? 1:-1;

            let aUsers=await User.aggregate([{
                "$sort": oSortingOrder
            },
            {
                "$match": {
                    "$and": [{
                        "sRole": {
                            $eq: "user"
                        }
                    },oSearchData]
                }
            },
            {
                "$project": {
                    sUserName: 1,
                    sWalletAddress: 1,
                    sStatus: 1
                }
            },
            {
                "$limit": nOffset+nLimit
            },
            {
                "$skip": nOffset
            }
            ]);

            let nNumberOfRecordsInSearch=await User.aggregate([{
                "$match": {
                    "$and": [{
                        "sRole": {
                            $eq: "user"
                        }
                    },oSearchData]
                }
            }]);

            return res.reply(messages.success(),{
                data: aUsers,
                draw: req.body.draw,
                "recordsTotal": nTotalUsers,
                "recordsFiltered": nNumberOfRecordsInSearch.length
            });

        } catch(err) {
            log.error(err)
            return res.reply(messages.server_error());
        }
    }

    async nfts(req,res,next) {
        try {
            // Per page limit
            var nLimit=parseInt(req.body.length);
            // From where to start
            var nOffset=parseInt(req.body.start);


            // Get total number of records
            let nTotalNFTs=await NFT.countDocuments();

            var oSearchData={
                $or: []
            };

            if(req.body.search.value!='') {
                var re=new RegExp(`.*${req.body.search.value}.*`,'i');
                oSearchData['$or'].push({
                    'sName': re
                });
            }

            if(!oSearchData['$or'].length) {
                delete oSearchData['$or'];
            }

            let oSortingOrder={};
            oSortingOrder[req.body.columns[parseInt(req.body.order[0].column)].data]=(req.body.order[0].dir=="asc")? 1:-1;

            let aNFTs=await NFT.aggregate([{
                "$sort": oSortingOrder
            },
            {
                "$match": {
                    "$and": [oSearchData]
                }
            },
            {
                "$limit": nOffset+nLimit
            },
            {
                "$skip": nOffset
            },
            {
                '$lookup': {
                    'from': 'users',
                    'localField': 'oPostedBy',
                    'foreignField': '_id',
                    'as': 'oCreator'
                }
            },{
                '$lookup': {
                    'from': 'users',
                    'localField': 'oCurrentOwner',
                    'foreignField': '_id',
                    'as': 'oOwner'
                }
            }
            ]);

            let nNumberOfRecordsInSearch=await NFT.aggregate([{
                "$match": {
                    "$and": [oSearchData]
                }
            }]);

            // If no record found
            if(!aNFTs.length) {
                return res.reply(messages.success(),{
                    data: [],
                    draw: req.body.draw,
                    "recordsTotal": nTotalNFTs,
                    "recordsFiltered": 0
                });
            }



            return res.reply(messages.success(),{
                data: aNFTs,
                draw: req.body.draw,
                "recordsTotal": nTotalNFTs,
                "recordsFiltered": nNumberOfRecordsInSearch.length
            });

        } catch(err) {
            log.error(err)
            return res.reply(messages.server_error());
        }
    }

    async toggleUserStatus(req,res,next) {
        try {
            if(!req.body.sObjectId) return res.reply(messages.not_found("User ID"));
            if(!req.body.sStatus) return res.reply(messages.not_found("Status"));

            if(!validators.isValidUserStatus(req.body.sStatus)) return res.reply(messages.invalid("Status"));
            if(!validators.isValidObjectID(req.body.sObjectId)) res.reply(messages.invalid("User ID"));

            User.findByIdAndUpdate(req.body.sObjectId,{
                sStatus: req.body.sStatus
            },
                (err,user) => {
                    if(err) {
                        log.red(err);
                        return res.reply(messages.server_error());
                    }
                    if(!user) return res.reply(messages.not_found('User'));
                    return res.reply(messages.updated('User Status'));
                });
        } catch(error) {
            return res.reply(messages.server_error());
        }
    }

    // ------- News Letter controllers --------
    async sendNewsLetterEmail(req,res,next) {
        try {
            log.green(req.body);
            if(!req.userId) return res.reply(messages.unauthorized());
            if(!req.body) return res.reply(messages.not_found("Data"));
            if(!req.body.sSubject) return res.reply(messages.not_found("Mail Subject"));
            if(!req.body.sHTMLContent) return res.reply(messages.not_found("Mail Content"));

            let emailsArray=[];
            await (await NewsLetterEmail.aggregate([{
                $project: {
                    sEmail: 1
                }
            }]))
                .forEach(function(aArrayDocs) {
                    emailsArray.push(aArrayDocs.sEmail);
                });
            if(emailsArray.length>0) {

                await nodemailer.sendMail({
                    from: 'DecryptMarketplace '+process.env.SMTP_USERNAME,
                    bcc: emailsArray,
                    subject: req.body.sSubject,
                    html: req.body.sHTMLContent
                });

                return res.reply(messages.success("Email send"));
            } else {
                return res.reply(messages.no_prefix("No emails found"));
            }
        } catch(error) {
            return res.reply(messages.server_error());
        }
    };

    async getNewsLetterEmailsLists(req,res,next) {
        try {

            await NewsLetterEmail.countDocuments({},async (err,nCount) => {
                await NewsLetterEmail.find({},{
                    __v: 0
                },{
                    $skip: Number(req.body.start),
                    $limit: Number(req.body.length)
                },(err,aEmails) => {
                    if(err) return res.reply(messages.error());
                    let data=JSON.stringify({
                        "draw": req.body.draw,
                        "recordsFiltered": nCount,
                        "recordsTotal": nCount,
                        "data": aEmails
                    });
                    res.send(data);
                });
            });
        } catch(error) {
            return res.reply(messages.server_error());
        }
    };

    async deleteNewsLetterEmail(req,res) {
        try {
            NewsLetterEmail.findOneAndDelete({
                _id: req.headers._id
            },(err,result) => {
                if(err) return res.reply(messages.error());
                return res.reply(messages.success("Email deletion "),{
                    email: result.sEmail
                });
            });
        } catch(error) {
            return res.reply(messages.server_error());
        }
    };

    // Category Controllers
    async addCategory(req,res) {
        try {
            log.green(req.body);
            if(!req.userId) return res.reply(messages.unauthorized());
            if(!req.body.sName) return res.reply(messages.not_found("Category"));
            if(!validators.isValidName(req.body.sName)) return res.reply(messages.invalid("Category"));

            const category=new Category({
                sName: req.body.sName
            });
            category.save()
                .then((oCategory) => {
                    log.green('Category Created: '+oCategory.sName);
                    return res.reply(messages.created("Category"));
                })
                .catch((err) => {
                    log.red(err);
                    return res.reply(messages.already_exists("Category"));
                })
        } catch(error) {
            return res.reply(messages.server_error());
        }
    }

    async getCategories(req,res) {
        try {
            // if (!req.userId) return res.reply(messages.unauthorized());
            // Per page limit
            var nLimit=parseInt(req.body.length);
            // From where to start
            var nOffset=parseInt(req.body.start);

            const nTotalCategories=await Category.countDocuments();

            let oSearchData={};
            let nTotalFilteredRecords;
            if(req.body.search.value!='') {
                oSearchData={
                    sName: new RegExp(`.*${req.body.search.value}.*`,'i')
                }
                nTotalFilteredRecords=(await Category.aggregate([{
                    $match: oSearchData
                }])).length;
            } else
                nTotalFilteredRecords=nTotalCategories;

            let oSortingOrder={};
            oSortingOrder[req.body.columns[parseInt(req.body.order[0].column)].data]=(req.body.order[0].dir=="asc")? 1:-1;


            const aCategories=await Category.aggregate([{
                $sort: oSortingOrder
            },{
                $match: oSearchData
            },{
                $project: {
                    _id: 0,
                    _v: 0
                }
            },{
                "$limit": nOffset+nLimit
            },{
                "$skip": nOffset
            }]);

            if(!aCategories.length) {
                return res.reply(messages.success(),{
                    data: [],
                    draw: req.body.draw,
                    recordsTotal: nTotalCategories,
                    recordsFiltered: 0
                });
            }

            return res.reply(messages.success(),{
                data: aCategories,
                draw: req.body.draw,
                recordsTotal: nTotalCategories,
                recordsFiltered: nTotalFilteredRecords
            });
        } catch(error) {
            return res.reply(messages.server_error());
        }
    }

    async toggleCategory(req,res) {
        try {
            log.green(req.body);
            log.green(req.params);
            if(!req.userId) return res.reply(messages.unauthorized());
            if(!req.params) return res.reply(messages.not_found("Category"))
            if(!validators.isValidCategoryStatus(req.body.sStatus)) return res.reply(messages.invalid("Category"));

            Category.updateOne({
                sName: req.params.sName
            },{
                sStatus: req.body.sStatus
            },(err,oResult) => {
                if(err) return res.reply(messages.error());
                if(!oResult.n) return res.reply(messages.not_found('Category'));
                return res.reply(messages.updated("Category Status"));
            });
        } catch(error) {
            return res.reply(messages.server_error());
        }
    }

    deleteCategory(req,res) {
        try {
            log.green(req.params);
            if(!req.userId) return res.reply(messages.unauthorized());
            Category.deleteOne({
                sName: req.params.sName
            },(err,result) => {
                if(err) return res.reply(messages.error());
                if(!result.n) return res.reply(messages.not_found("Category"));

                return res.reply(messages.successfully("Deleted"));
            });
        } catch(error) {
            return res.reply(messages.server_error());
        }
    }

    async editCategory(req,res) {
        try {
            log.green(req.body);
            if(!req.userId) return res.reply(messages.unauthorized());
            if(!req.body.sName) return res.reply(messages.not_found("Category"));
            if(!req.body.sNewName) return res.reply(messages.not_found("Category"));
            if(!validators.isValidName(req.body.sName)) return res.reply(messages.invalid("Category"));
            if(!validators.isValidName(req.body.sNewName)) return res.reply(messages.invalid("Category"));

            Category.updateOne({
                sName: req.body.sName
            },{
                sName: req.body.sNewName
            },(err,oResult) => {
                if(err) return res.reply(messages.error());
                if(!oResult.n) return res.reply(messages.not_found('Category'));
                return res.reply(messages.updated("Category"));
            });
        } catch(error) {
            return res.reply(messages.server_error());
        }
    }

    // CMS Controllers
    async updateAboutus(req,res) {
        try {
            log.green(req.body);
            if(!req.userId) return res.reply(messages.unauthorized());
            if(!req.body.sAboutus_data) return res.reply(messages.not_found("About Us Data"));

            await Aboutus.updateOne({},{
                $set: {
                    sAboutus_data: req.body.sAboutus_data
                }
            },{
                upsert: true
            },(err) => {
                if(err) throw error;
            });
            return res.reply(messages.updated("Aboutus"));
        } catch(error) {
            return res.reply(messages.server_error());
        }
    }

    async updateFAQs(req,res) {
        try {
            log.green(req.body);
            if(!req.userId) return res.reply(messages.unauthorized());

            const faqs=new FAQs({
                oFAQs_data: {
                    sQuestion: req.body.sQuestion,
                    sAnswer: req.body.sAnswer
                }
            });
            faqs.save()
                .then((oFAQs) => {
                    return res.reply(messages.created("FAQs"));
                })
                .catch((err) => {
                    log.red(err);
                    return res.reply(messages.server_error());
                })
        } catch(error) {
            return res.reply(messages.server_error());
        }
    }

    async updateTerms(req,res) {
        try {
            log.green(req.body);
            if(!req.userId) return res.reply(messages.unauthorized());
            if(!req.body.sTerms_data) return res.reply(messages.not_found("Terms Data"));

            await Terms.updateOne({},{
                $set: {
                    sTerms_data: req.body.sTerms_data
                }
            },{
                upsert: true
            },(err) => {
                if(err) throw error;
            });
            return res.reply(messages.updated("Terms & Condition"));
        } catch(error) {
            return res.reply(messages.server_error());
        }
    }
    
    async checkFile(){
        fs.exists('./rounds_input.json',function(exists) {
            if(exists) {

            } else {
                let obj=[];
                let json=JSON.stringify(obj);
                fs.writeFile('./rounds_input.json',json,function(err,result) {if(err) console.log('error',err);});
            }
        });
    }
    
    async writeJson(data) {
        console.log("in write json",data)
        fs.writeFile('./rounds_input.css', (err) => {
            console.log("in write file",data)
            if (err) {
                console.log(`Error writing file: ${err}`);
            }
        });
    }
    async addColor(req,res) {
        try {
            
            fs.writeFile('./public/style.css', req.body.completeCss , (err) => {
                console.log("in write file",req.body)
                if (err) {
                    console.log(`Error writing file: ${err}`);
                }
            });

           console.log("writeJson Callled ");
            return res.reply(messages.updated("Terms & Condition"));
        } catch(error) {
            console.log("Errrrrr ",error);
            return res.reply(messages.server_error());
        }
    }
    async changeBackground(req,res){
        
        await upload(req,res,async (erro) => {
                
             
            return res.reply(messages.updated('Admin Profile'));
        });
    }
    
    async addLogo(req,res){
        try {
            //if (!req.userId) return res.reply(messages.unauthorized());
            //console.log("add logo is called----->",req.file);
            //allowedMimes = [
            //  "image/jpeg",
            //  "video/mp4",
            //  "image/jpg",
            //  "image/webp",
            //  "image/png",
            //  "image/gif",
            //  "model/glTF+json",
            //  "model/gltf+json",
            //  "model/gltf-binary",
            //  "application/octet-stream",
            //  "audio/mp3",
            //  "audio/mpeg",
            //];
            //errAllowed = "JPG, JPEG, PNG, GIF, GLTF, GLB MP3, WEBP & MPEG";
      
            upload(req, res, async function (error) {
                return res.reply(messages.updated('Admin Profile'));
            });
          } catch (error) {
            return res.reply(messages.server_error());
          }
    }

}
module.exports=AdminController;