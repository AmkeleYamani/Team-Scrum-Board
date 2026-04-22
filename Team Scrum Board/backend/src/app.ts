import express from "express";
import { pool } from "./config/db";

const app = express();
app.use(express.json());

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Database error");
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});