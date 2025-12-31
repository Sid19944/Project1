import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ExpressError } from "../utils/ExpressError.js";
import httpStatus from "http-status";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { de } from "@faker-js/faker";
// import dotenv from "dotenv"
// dotenv.config

export const verifyJwt = AsyncHandler(async (req, res, next) => {
  try {
    console.log("from cookies", req.cookies.accessToken);
    console.log("from header", req.header);
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer", "");

    if (!token) {
      throw new ExpressError(httpStatus.UNAUTHORIZED, "Unauthorized request");
      
    }

    const decodedToken = await jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );
    if (!decodedToken) {
      console.log("error while decoding token");
      return;
    }
    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ExpressError(401, "Invalid Access Token");
    }
    // console.log("auth Middle",user)

    req.user = user;
    next();
  } catch (error) {
    throw new ExpressError(401, error.message);
  }
});
