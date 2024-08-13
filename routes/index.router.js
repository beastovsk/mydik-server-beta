const express = require("express");
const router = express.Router();

const authController = require("../contollers/auth.controller");
const userController = require("../contollers/user.controller");

router.post("/auth/login", authController.login);
router.post("/auth/register", authController.register);
router.post("/auth/confirmEmail", authController.confirmEmail);
router.post("/auth/sendResetCode", authController.sendResetCode);
router.post("/auth/resetPassword", authController.resetPassword);
router.post("/auth/supportRequest", authController.supportRequest);
router.get("/user/getUser", userController.getUser);
router.put("/user/updateSubscription/:id", userController.updateSubscription);
router.get("/user/getSubscription/:id", userController.getSubscription);
// router.post("/user/changePassword", userController.changePassword);
// router.post("/user/changeEmail", userController.changeEmail);


module.exports = router;
