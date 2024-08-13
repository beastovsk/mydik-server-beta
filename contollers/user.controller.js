const sql = require("../database");
const bcrypt = require("bcryptjs");
const { generateToken, decodeToken } = require("../utils");
const { v4: uuidv4 } = require("uuid");

const userController = {
	getUser: async (req, res) => {
		try {
			const [_, token] = req.headers.authorization.split(" ");
			const { email } = decodeToken({ token });
			const result =
				await sql`SELECT * FROM "users" WHERE email = ${email}`;
			if (result.length === 0) {
				return res
					.status(200)
					.json({ message: "Пользователь не найден" });
			}

			const { password, is_confirmed, confirm_token, ...user } =
				result[0];

			res.json({ user });
		} catch (error) {
			console.log(error);
			res.status(200).json({ user: null });
		}
	},
	updateSubscription: async (req, res) => {
		try {
			const { id } = req.params;
			const { subscription } = req.body;
	
			const result =
				await sql`UPDATE "users" SET subscription = ${subscription} WHERE id = ${id} RETURNING id, username, email, subscription`;
	
			if (result.length === 0) {
				return res.status(404).json({ message: "Пользователь не найден" });
			}
	
			res.status(200).json(result[0]);
		} catch (error) {
			console.log(error);
			res.status(500).json({ error: "Ошибка обновления подписки" });
		}
	},
	getSubscription: async (req, res) => {
		try {
			const { id } = req.params;
		
			if (!id) {
			  return res.status(400).json({ error: "ID должен быть определен" });
			}
		
			const result = await sql`
			  SELECT id, username, email, subscription 
			  FROM users 
			  WHERE id = ${id}`;
		
			if (result.length === 0) {
			  return res.status(404).json({ error: "Пользователь не найден" });
			}
		
			res.status(200).json(result[0]);
		  } catch (error) {
			console.log(error);
			res.status(500).json({ error: "Ошибка получения информации о подписке" });
		  }
	},
	// changeEmail: async (req, res) => {
	// 	try {
	// 		const { currentEmail, newEmail, password } = req.body;
	// 		const [_, token] = req.headers.authorization.split(" ");
	// 		const { email: decodedEmail } = decodeToken({ token });

	// 		if (decodedEmail !== currentEmail) {
	// 			return res
	// 				.status(200)
	// 				.json({ message: "Некорректная текущая почта" });
	// 		}

	// 		const result =
	// 			await sql`SELECT * FROM "users" WHERE email = ${decodedEmail}`;

	// 		if (result.length === 0) {
	// 			return res
	// 				.status(200)
	// 				.json({ message: "Пользователь не найден" });
	// 		}

	// 		const user = result[0];

	// 		const checkPass = await bcrypt.compare(password, user.password);
	// 		if (!checkPass) {
	// 			return res.status(200).json({ message: "Некорректный пароль" });
	// 		}

	// 		await sql`UPDATE "users" SET email = ${newEmail} WHERE email = ${currentEmail}`;

	// 		const updatedToken = generateToken({
	// 			id: user.id,
	// 			email: newEmail,
	// 		});

	// 		res.json({
	// 			token: updatedToken,
	// 			message: "Почта успешно изменена",
	// 		});
	// 	} catch (error) {
	// 		res.status(500).json({ error: "Ошибка сервера" });
	// 	}
	// },
	// changePassword: async (req, res) => {
	// 	try {
	// 		const { currentPassword, password } = req.body;
	// 		const [_, token] = req.headers.authorization.split(" ");
	// 		const { email } = decodeToken({ token });

	// 		const result =
	// 			await sql`SELECT * FROM "users" WHERE email = ${email}`;

	// 		if (result.length === 0) {
	// 			return res
	// 				.status(200)
	// 				.json({ message: "Пользователь не найден" });
	// 		}

	// 		const user = result[0];

	// 		const checkPass = await bcrypt.compare(
	// 			currentPassword,
	// 			user.password
	// 		);
	// 		if (!checkPass) {
	// 			return res.status(200).json({ message: "Некорректный пароль" });
	// 		}

	// 		const hashedPassword = await bcrypt.hash(password, 10);

	// 		await sql`UPDATE "users" SET password = ${hashedPassword} WHERE email = ${email}`;

	// 		res.json({
	// 			message: "Пароль успешно изменен",
	// 		});
	// 	} catch (error) {
	// 		res.status(500).json({ error: "Ошибка сервера" });
	// 	}
	// },
};

module.exports = userController;
