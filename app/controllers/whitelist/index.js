const router = require('express').Router();
const WhitelistController = require('./controllers');
const whitelistController = new WhitelistController();
const Middleware = require("./../helpers/middleware");

router.post('/fetchWhitelistedAddress', whitelistController.fetchWhitelistedAddress);
router.post('/insertAddress', Middleware.verifySuperAdminToken, whitelistController.insertAddress);
router.post('/fetchAllWhitelistings', Middleware.verifySuperAdminToken, whitelistController.fetchAllWhitelistings);
router.post('/deleteWhitelisting', Middleware.verifySuperAdminToken, whitelistController.deleteWhitelisting);
module.exports = router;