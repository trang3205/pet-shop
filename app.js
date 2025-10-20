import "dotenv/config";
import express from "express";
import { engine } from "express-handlebars";
import hbs_sections from "express-handlebars-sections";
import session from "express-session";

const app = express();

app.set("trust proxy", 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24, // 1 ngày
    },
  })
);

app.engine(
  "handlebars",
  engine({
    helpers: {
      fill_section: hbs_sections(),
      formatNumber(value) {
        return new Intl.NumberFormat("en-US").format(value);
      },
      eq(a, b) {
        return a === b;
      },
    },
  })
);
app.set("view engine", "handlebars");
app.set("views", "./views");

const __dirname = import.meta.dirname;

app.use("/static", express.static("static"));
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.listen(3000, function () {
  console.log("Server is running on port 3000");
});
