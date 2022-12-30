
  
const router = require('express').Router();
const OrderController = require('./controllers');
const orderController = new OrderController();
const orderMiddleware = require('./../helpers/middleware');

router.post('/getOrder', orderController.getOrder);
router.post('/getOrdersByNftId', orderController.getOrdersByNftId);

router.post('/createOrder', orderMiddleware.verifyUserToken, orderController.createOrder);
router.put('/updateOrder', orderMiddleware.verifyUserToken, orderController.updateOrder);
router.delete('/deleteOrder', orderMiddleware.verifyUserToken, orderController.deleteOrder);

router.post('/updateOrderStatus', orderMiddleware.verifyUserToken, orderController.updateOrderStatus);

// router.post('/insertHash', orderMiddleware.verifyUserToken, orderController.insertHash);
// router.post('/deleteHash', orderMiddleware.verifyUserToken, orderController.deleteHash);
module.exports = router;