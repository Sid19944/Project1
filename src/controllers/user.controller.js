import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ExpressError } from "../utils/ExpressError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import httpStatus from "http-status";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ExpressError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

const registerUser = AsyncHandler(async (req, res) => {
  // get user detail from frontend

  const { fullName, username, email, password } = req.body;
  // validation - notEmpty
  if (
    [fullName, username, email, password].some((feild) => feild?.trim() === "")
  ) {
    throw new ExpressError(400, "All feild are required");
  }
  // check if user already exist : username ,email
  const existsUser = await User.findOne({ $or: [{ username }, { email }] });

  if (existsUser) {
    throw new ExpressError(409, "User with username or email already Exists");
  }
  // check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ExpressError(400, "Avatar file is required");
  }
  // upload them to cloudinary, check have avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  // console.log(coverImage);
  if (!avatar) {
    throw new ExpressError(400, "Avater file is required");
  }
  // create user object - create entry in db
  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
  });
  // check for user creation and remove passward and refresh token feild from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = AsyncHandler(async (req, res) => {
  // get user details
  const { username, email, password } = req.body;
  // validate the defails are not empty
  if (!(username || email)) {
    throw new ExpressError(400, "All feilds are required");
  }
  // find the user in db using the user input details
  const user = await User.findOne({
    $or: [{ username }, { email: email.toLowerCase() }],
  });

  if (!user) {
    throw new ExpressError(
      httpStatus.NOT_ACCEPTABLE,
      "Invalid UserName or Email."
    );
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ExpressError(httpStatus.NOT_ACCEPTABLE, "Invalid user Password");
  }
  // access token and refrsh token

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  // send cookies
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const cookieOption = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(httpStatus.OK)
    .cookie("accessToken", accessToken, cookieOption)
    .cookie("refreshToken", refreshToken, cookieOption)
    .json(
      new ApiResponse(
        httpStatus.OK,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged In Successfully"
      )
    );
});

const logoutUser = AsyncHandler(async (req, res) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      refreshToken: null,
    },
    { new: true }
  );

  console.log(updatedUser);

  const cookieOption = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(httpStatus.OK)
    .clearCookie("accessToken", cookieOption)
    .clearCookie("refreshToken", cookieOption)
    .json(new ApiResponse(httpStatus.OK, null, "User Logout Successfully"));
});

const refreshAccessToken = AsyncHandler(async (req, res) => {
  const incommingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incommingRefreshToken) {
    throw new ExpressError(
      httpStatus.UNAUTHORIZED,
      "Unauthorized Request, don't have a token"
    );
  }

  try {
    const decodedRefreshToken = jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedRefreshToken?._id);
    if (!user) {
      throw new ExpressError(httpStatus.UNAUTHORIZED, "Invalid RefreshToken");
    }

    if (incommingRefreshToken !== user.refreshToken) {
      throw new ExpressError(
        httpStatus.UNAUTHORIZED,
        "Refresh token is Expired or used"
      );
    }

    const cookieOption = {
      httpOnly: true,
      secure: true,
    };

    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
      user._id
    );

    return res
      .status(httpStatus.OK)
      .cookie("accessToken", accessToken, cookieOption)
      .cookie("refreshToken", refreshToken, cookieOption)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ExpressError(
      500,
      `${error.message}, something went wrong while decoding the refreshToken`
    );
  }
});

const getCurrentUser = AsyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ExpressError(400, "User not found, Please login again");
  }
  return res.status(200).json(new ApiResponse(200, user, "Current user found"));
});

const updateCurrentPassword = AsyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword && !newPassword) {
    throw new ExpressError(400, `Enter old password and new password`);
  }

  const user = await User.findById(req.user._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ExpressError(400, "Invalid old Password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(httpStatus.OK)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

const updateFullName = AsyncHandler(async (req, res) => {
  const { fullName, password } = req.body;
  if (!(fullName || password)) {
    throw new ExpressError(400, "fullName and password are required");
  }

  const findUser = await User.findById(req.user._id);
  const isPasswordCorrect = await findUser.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ExpressError(
      400,
      "Invalid password, Please enter correct password"
    );
  }
  const user = await User.findByIdAndUpdate(
    findUser._id,
    { $set: { fullName: fullName } },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "FullName updated successfully"));
});

const updateEmail = AsyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!(email || password)) {
    throw new ExpressError(400, "email and password are required");
  }

  const findUser = await User.findById(req.user._id);
  const isPasswordCorrect = await findUser.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ExpressError(
      400,
      "Invalid password, Please enter correct password"
    );
  }
  if (email.toLowerCase() === findUser.email) {
    throw new ExpressError(
      400,
      "You have entered same last email, please enter new email id."
    );
  }
  const user = await User.findByIdAndUpdate(findUser._id, {
    $set: { email: email.toLowerCase() },
  }).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "email updated successfully"));
});

const updateAvatar = AsyncHandler(async (req, res) => {
  const avatarLocalPath = req.file.path;
  if (!avatarLocalPath) {
    throw new ExpressError(400, "Avatar file is missing");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ExpressError(400, "Error while uploading avatar file");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated Successfully"));
});

const updateCoverImage = AsyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file.path;
  if (!coverImageLocalPath) {
    throw new ExpressError(400, "CoverImage file is missing");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ExpressError(400, "Error while uploading avatar file");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { coverImage: coverImage.url } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "CoverImage updated Successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  updateCurrentPassword,
  updateFullName,
  updateEmail,
  updateAvatar,
  updateCoverImage,
};
