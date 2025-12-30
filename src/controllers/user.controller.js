import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ExpressError } from "../utils/ExpressError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import httpStatus from "http-status";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToekn = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToekn, refreshToken };
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
  console.log(coverImage);
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
  const user = await User.findOne({ $or: [{ username }, { email }] });

  if (!user) {
    throw new ExpressError(httpStatus.NOT_FOUND, "Invalid UserName or Email.");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ExpressError(httpStatus.NOT_ACCEPTABLE, "Invalid user Password");
  }
  // access token and refrsh token

  const { accessToekn, refreshToken } = await generateAccessAndRefreshToken(
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
    .cookie("accessToken", accessToekn, cookieOption)
    .cookie("refreshToken", refreshToken, cookieOption)
    .json(
      new ApiResponse(
        httpStatus.OK,
        {
          user: loggedInUser,
          accessToekn,
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
      $set: { refreshToken: undefined },
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
    .clearCookie("refreshToekn", cookieOption)
    .json(new ApiResponse(httpStatus.OK, null, "User Logout Successfully"));
});

export { registerUser, loginUser, logoutUser };
