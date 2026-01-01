import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  updateCurrentPassword,
  updateFullName,
  updateEmail,
  updateAvatar,
  updateCoverImage,
  getCurrentUser,
} from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJwt } from "../middleware/auth.middleware.js";
import { refreshAccessToken } from "../controllers/user.controller.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);
//secure route
router.route("/logout").post(verifyJwt, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/get-current-user").get(verifyJwt, getCurrentUser);
router.route("/update-password").patch(verifyJwt, updateCurrentPassword);
router.route("/update-fullname").patch(verifyJwt, updateFullName);
router.route("/update-email").patch(verifyJwt, updateEmail);
router
  .route("/update-avatar")
  .post(verifyJwt, upload.single("avatar"), updateAvatar);

router
  .route("/update-coverimage")
  .post(verifyJwt, upload.single("coverImage"), updateCoverImage);
export default router;
