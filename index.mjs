import express, { static as static_ } from "express";
import cors from "cors";
import { lookup } from "dns";
import bodyParser from "body-parser";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", static_(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// parse application/json
app.use(bodyParser.json());

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.get("/api/shorturl/:short_url", async function (req, res) {
  const short_url = req.params.short_url;
  prisma.shortUrl
    .findFirstOrThrow({
      where: {
        shorten_url: short_url,
      },
    })
    .then(function (url) {
      return res.redirect(url.original_url);
    })
    .catch(function (err) {
      return res.json({ error: "invalid url" });
    });
});

app.post("/api/shorturl", function (req, res) {
  try {
    const url = req.body.url;
    const host = req.body.url.split("//")[1].split("/")[0];
    lookup(host, async function (err) {
      if (err) {
        res.json({ error: "invalid url" });
      } else {
        let val;
        let short_url;
        let url_count = 0;
        prisma.shortUrl
          .count({
            where: {
              original_url: url,
            },
          })
          .then(function (res) {
            url_count = res;
          });
        if (url_count > 0) {
          prisma.shortUrl
            .findFirst({
              where: {
                original_url: url,
              },
            })
            .then(function (short_url) {
              res.json({
                original_url: short_url.original_url,
                short_url: short_url.shorten_url,
              });
            });
        }
        while (true) {
          val = (
            Math.floor(Math.random() * (9999999999 - 1 + 1)) + 9999999999
          ).toString();
          let short_url_count = 0;
          prisma.shortUrl
            .count({
              where: {
                shorten_url: val,
              },
            })
            .then(function (count) {
              short_url_count = count;
            });
          if (short_url_count === 0) {
            break;
          }
        }
        prisma.shortUrl
          .create({
            data: {
              shorten_url: val,
              original_url: url,
            },
          })
          .then(function (short_url) {
            res.json({
              original_url: url,
              short_url: short_url.shorten_url,
            });
          });
      }
    });
  } catch (err) {
    res.json({ error: "invalid url" });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
