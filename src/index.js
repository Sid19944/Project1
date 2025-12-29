import dotenv from "dotenv";
import connectWithDb from "./DB/db.js";
import { app } from "./app.js";

dotenv.config();
const PORT = process.env.PORT || 8000;

connectWithDb()
  .then(() => {
    console.log("MongoDB connected Successfully");
    app.on("error", (error) => {
      console.log("ERROR ", error);
    });
    app.listen(PORT, () => {
      console.log("Server is listing on PORT", PORT);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection faild !!", err);
  });
