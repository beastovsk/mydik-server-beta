const sql = require("../database");
const bcrypt = require("bcryptjs");
const { generateToken, decodeToken } = require("../utils");
const nodemailer = require("nodemailer");
const { v4 } = require("uuid");
// const nodemailerConfig = require("../nodeMaller");

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: "coctencoflez@gmail.com",
		pass: "wczs ypxh deyx exuo",
	},
});

const authController = {
	login: async (req, res) => {
		try {
			const { email, password } = req.body;
			const userList =
				await sql`SELECT * FROM "users" WHERE email = ${email}`;

			if (userList.length === 0) {
				return res
					.status(200)
					.json({ message: "Пользователь не найден" });
			}

			const user = userList[0];

			const checkPass = await bcrypt.compare(password, user.password);
			if (!checkPass) {
				return res.status(200).json({ message: "Неверный пароль" });
			}

			const token = generateToken({
				id: user.id,
				email: user.email,
			});
			res.json({
				token,
				message: "Вы успешно авторизовались",
			});
		} catch (error) {
			console.log(error);
			res.status(500).json({ error: "Ошибка авторизации" });
		}
	},
	register: async (req, res) => {
		try {
			const { username, email, password } = req.body;

			const hashedPassword = await bcrypt.hash(password, 10);

			const existingUserList =
				await sql`SELECT * FROM "users" WHERE email = ${email}`;
			if (existingUserList.length > 0) {
				return res
					.status(200)
					.json({ message: "Пользователь с таким email уже существует" });
			}

			const newUser =
				await sql`INSERT INTO "users" (username, email, password, subscription,  subscription_end_date) 
						  VALUES (${username}, ${email}, ${hashedPassword}, 'basic', NULL) 
						  RETURNING id, username, email, subscription, subscription_end_date`

			const user = newUser[0];

			const token = generateToken({
				id: user.id,
				email: user.email,
			});

			res.status(201).json({
				id: user.id,
				username: user.username,
				email: user.email,
				subscription: user.subscription,
				subscription_end_date: user.subscription_end_date,
				token,
				message: "Регистрация успешна",
			});
		} catch (error) {
			console.log(error);
			res.status(500).json({ error: "Ошибка регистрации" });
		}
	},
	confirmEmail: async (req, res) => {
		try {
			const { email: userEmail, confirmToken } = req.body;
			const user =
				await sql`SELECT * FROM "users" WHERE confirm_token = ${confirmToken} AND email = ${userEmail}`;

			if (user.length === 0) {
				return res
					.status(200)
					.json({ message: "Неверный код подтверждения" });
			}

			const [{ email, id }] = user;

			const token = generateToken({ id, email });

			await sql`
			UPDATE "users" SET is_confirmed = true WHERE confirm_token = ${confirmToken}
		`;

			res.json({ message: "Почта подтверждена", token });
		} catch (error) {
			console.error("Ошибка подтверждения:", error);
			res.status(500).json({ error: "Ошибка подтверждения" });
		}
	},
	sendResetCode: async (req, res) => {
		try {
			const { email } = req.body;

			const user =
				await sql`SELECT * FROM "users" WHERE email = ${email}`;

			if (user.length === 0) {
				return res
					.status(200)
					.json({ message: "Пользователь не найден" });
			}

			const [{ confirm_token }] = user;

			const confirmSlicedToken = confirm_token.slice(0, -2) + "rp";

			const mailBody = `
			<div>
				<h1 style='color: #4880ff'>Marketing Helper</h1>
				<h2>
					Ваш <i style='color: #4880ff'>код</i> для восстановления пароля:</h2>
				<br/>
				<h3>
					<b style='color: #4880ff' class='token'>${confirmSlicedToken}</b>
				</h3>
			</div>
		`;

			const mailOptions = {
				from: "Webi",
				to: email,
				html: mailBody,
				subject: "Восстановление пароля",
			};

			transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
					console.error("Ошибка отправки электронной почты:", error);
					res.status(500).json({
						error: "Ошибка отправки электронной почты",
					});
				} else {
					res.json({
						message:
							"Код для восстановление пароля отправлен на вашу почту",
					});
				}
			});
		} catch (error) {
			console.error(
				"Ошибка отправки кода для восстановления пароля:",
				error
			);
			res.status(500).json({
				error: "Ошибка отправки кода для восстановления пароля",
			});
		}
	},
	resetPassword: async (req, res) => {
		try {
			const { email, password, confirmToken } = req.body;

			const user =
				await sql`SELECT * FROM "users" WHERE email = ${email}`;

			if (user.length === 0) {
				return res
					.status(200)
					.json({ message: "Пользователь не найден" });
			}

			const [{ id }] = user;
			const token = generateToken({ email, id });
			const hash = await bcrypt.hash(password, 10);

			const result = await sql`
         UPDATE "users" SET password = ${hash} WHERE email = ${email}
    `;

			if (result.affectedRows === 0) {
				return res
					.status(200)
					.json({ message: "Неверный код подтверждения" });
			}

			res.json({ token, message: "Пароль успешно изменен" });
		} catch (error) {
			console.error("Ошибка сброса пароля:", error);
			res.status(500).json({ error: "Ошибка сброса пароля" });
		}
	},

	supportRequest: async (req, res) => {
		try {
			const { email, body, name } = req.body;
			const mailBody = `
			<div>
				<h1 style='color: #6f4ff2'>WEBI Marketplace</h1>
		
				<h2>Name: <span style='color: #6f4ff2'>${name}</span></h2>
				<h2>Email: <span style='color: #6f4ff2'>${email}</span></h2>
				<h2>Body: <span style='color: #6f4ff2'>${body}</span></h2>
			</div>
		`;

			const mailOptions = {
				from: "Webi",
				to: "webisupagency@gmail.com",
				html: mailBody,
				subject: "Обращение в поддержку",
			};

			transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
					console.error("Ошибка отправки электронной почты:", error);
					res.status(500).json({
						error: "Ошибка отправки электронной почты",
					});
				} else {
					res.json({
						message:
							"Код для восстановление пароля отправлен на вашу почту",
					});
				}
			});

			res.json({ message: "Обращение успешно отправлено" });
		} catch (error) {
			console.error("Ошибка регистрации:", error);
			res.status(500).json({ error: "Ошибка регистрации" });
		}
	},
};

module.exports = authController;
