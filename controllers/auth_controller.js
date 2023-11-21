const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();
var jwt = require("jsonwebtoken");
const { ResponseTemplate } = require("../helper/template_helper");
const { token } = require("morgan");
const Sentry = require("@sentry/node");

async function register(req, res, next) {
  try {
    let { name, email, password } = req.body;
    let existUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (existUser) {
      let resp = ResponseTemplate(null, "User already exist", null, 400);
      res.json(resp);
      return;
    }
    let encriptedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name: name,
        email: email,
        password: encriptedPassword,
      },
    });
    let resp = ResponseTemplate(null, "create successfully", null, 200);
    res.json(resp);
    return;
  } catch (error) {
    next(error);
  }
}

async function authUser(req, res) {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      let resp = ResponseTemplate(null, "Incorrect email or password", null, 401);
      res.json(resp);
      return;
    } else {
      // Pengguna berhasil diautentikasi, generate token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email }, // Payload token
        process.env.SECRET_KEY, // Rahasia untuk menandatangani token (gantilah dengan rahasia yang kuat)
        { expiresIn: "1h" } // Opsional: Waktu kedaluwarsa token
      );
      let resp = ResponseTemplate({token}, "login success", false, 200);
      res.json(resp);
      return;
    }
  } catch (error) {
    let resp = ResponseTemplate(false, "Internal Server Error", false, 500);
    Sentry.captureException(error);
    res.json(resp);
    return;
  }
}

module.exports = { register, authUser };
