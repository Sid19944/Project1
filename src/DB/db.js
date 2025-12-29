import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectWithDb = async () => {
  try {
    const connectDb = await mongoose.connect(`${process.env.DB_URL}`);
  } catch (err) {
    console.log(`Error while connecting with the DB`, err);
  }
};

export default connectWithDb;
