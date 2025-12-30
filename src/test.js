import express from "express";
import multer from "multer";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const upload = multer({ storage: multer.memoryStorage() });

app.post(
  "/upload",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  (req, res) => {
    console.log("FILES:", req.files);
    console.log("BODY:", req.body);
    res.json({ ok: true, files: req.files, body: req.body });
  }
);

app.listen(5000, () => console.log("Server running on 5000"));
