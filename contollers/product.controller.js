const sql = require("../database");
const OpenAI = require("openai");
const { decodeToken } = require("../utils");

const openai = new OpenAI({
	apiKey: process.env.OPENAI_SECRET_KEY,
});

const productController = {
	generateProduct: async (req, res) => {
		try {
			const [_, token] = req.headers.authorization.split(" ");
			const { id: userId } = decodeToken({ token });
			const {
				niche,
				otherNiche,
				budgetFrom,
				budgetTo,
				targetAudience,
				profession,
				productType,
				market,
				implementationTime,
				comments,
			} = req.body;
			const user =
				await sql`SELECT balance FROM "users" WHERE id = ${userId}`;

			if (user[0].balance < 300) {
				return res.json({
					message: "Недостаточно средств для генерации",
				});
			}
			const messages = [
				{
					role: "system",
					content:
						"Ты бизнес-аналитик, который генерирует информацию о продукте на основе введенных пользователем данных",
				},
				{
					role: "user",
					content: `Сгенерируй продукт для бизнеса на русском языке для российского рынка в валидном JSON формате.
			            Пользователь ввел:
			            niche: ${niche},
			            otherNiche (если не пусто, то это конкретная ниша): ${otherNiche},
			            budgetFrom: ${budgetFrom},
			            budgetTo: ${budgetTo},
			            targetAudience: ${targetAudience},
			            profession (если не пусто, то пользователь видит это как ЦА): ${profession},
			            productType: ${productType},
			            market: ${market},
			            implementationTime: ${implementationTime},
			            comments (если не пусто, то обязательны для генерации): ${comments},

			            На основе этих данных, выдай мне следущие пункты:
			            1. Название продукта
			            2. Описание продукта
			            3. Основные характеристики и преимущества
			            4. Целевую аудиторию
			            5. Анализ рынка
			            6. Конкурентные преимущества
			            7. Предполагаемый бюджет и сроки
			            8. Возможные проблемы и пути их решения
			            9. Дополнительные рекомендации
			            10. Уникальное предложение продукта

			            В следущем формате:
			            {
			                "productName": 'value',
			                "productDescription": 'value',
			                "features": ["value-n"],
			                "benefits": ["value-n"],
			                "targetAudience": 'value',
			                "marketAnalysis": 'value',
			                "competitiveAdvantage": 'value',
			                "estimatedBudget": 'value',
			                "potentialChallenges": 'value',
			                "additionalRecommendations": 'value',
			                "uniqueOffer": 'value'
			            }

			            Отвечай развернуто, особенно для списком (массивов). Учитай данные пользователей и их предпочтения
			            `,
				},
			];

			const responseOpenai = await openai.chat.completions.create({
				model: "gpt-3.5-turbo",
				messages: messages,
				max_tokens: 2048,
				temperature: 0.7,
			});

			const content = responseOpenai.choices[0].message.content;
			const response = JSON.parse(content);
			const date = new Date().toISOString();
			const info = { req: { ...req.body }, res: content };
			const result = await sql`
                INSERT INTO "product" (
                    title,
                    description,
                    date,
                    amount,
                    info,
                    favourite,
                    status,
                    label,
                    priority,
                    userId
                ) VALUES (
                    ${response.productName},
                    ${response.productDescription},
                    ${date},
                    ${300},
                    ${JSON.stringify(info)},
                    ${"false"},
                    ${"created"},
                    ${niche},
                    ${"low"},
                    ${userId}
                ) RETURNING *;
            `;
			const newBalance = user[0].balance - 300;
			await sql`UPDATE "users" SET balance = ${newBalance} WHERE id = ${userId} `;
			await sql`INSERT INTO "operations" (userid, type, date, status, amount) VALUES (${userId}, 'Генерация продукта', ${date}, 'Успешно', 300)`;
			res.status(200).json({
				message: "Продукт успешно сгенерирован",
				product: result[0],
			});
		} catch (error) {
			console.log(error);
			res.status(500).json({ error: "Server error" });
		}
	},
	getAllProducts: async (req, res) => {
		try {
			const [_, token] = req.headers.authorization.split(" ");
			const { id } = decodeToken({ token });
			const { isLatest } = req.query;

			let result;
			if (isLatest) {
				result = await sql`
                    SELECT id, title, description, date, amount, status, priority
                    FROM "product"
                    WHERE userId = ${id}
                    ORDER BY date DESC
                    LIMIT 5
                `;
			} else {
				result = await sql`
                    SELECT id, title, description, date, amount
                    FROM "product"
                    WHERE userId = ${id}
                `;
			}

			if (result.length === 0) {
				return res
					.status(200)
					.json({ products: [], message: "Продукт не найден" });
			}

			res.json({ products: result });
		} catch (error) {
			console.log(error);
			res.status(200).json({ products: null });
		}
	},
	getProductById: async (req, res) => {
		try {
			const [_, token] = req.headers.authorization.split(" ");
			const { id: userId } = decodeToken({ token });
			const { id } = req.params;

			const product = await sql`
                SELECT *
                FROM "product"
                WHERE id = ${id} AND userId = ${userId}
            `;

			if (product.length === 0) {
				return res.status(200).json({
					message: "Продукт не найден",
				});
			}

			res.json({ product: product[0] });
		} catch (error) {
			console.log(error);
			res.status(200).json({ product: null });
		}
	},
	deleteProductById: async (req, res) => {
		try {
			const [_, token] = req.headers.authorization.split(" ");
			const { id: userId } = decodeToken({ token });
			const { id } = req.params;
			const date = new Date().toISOString();
			const product = await sql`
				SELECT id
				FROM "product"
				WHERE id = ${id} AND userId = ${userId}
			`;

			if (product.length === 0) {
				return res.status(200).json({
					message: "Продукт не найден",
				});
			}

			await sql`
				DELETE FROM "product"
				WHERE id = ${id}
			`;

			const user = await sql`
				SELECT balance
				FROM "users"
				WHERE id = ${userId}
			`;

			if (user.length === 0) {
				return res.status(404).json({
					message: "Пользователь не найден",
				});
			}

			const newBalance = user[0].balance + 150;

			await sql`
				UPDATE "users"
				SET balance = ${newBalance}
				WHERE id = ${userId}
			`;
			await sql`INSERT INTO "operations" (userid, type, date, status, amount) VALUES (${userId}, 'Возврат средств', ${date}, 'Успешно', 150)`;
			res.json({
				message:
					"Продукт удалён, вернули вам 150 рублей в качестве подарка на генерацию следующего",
			});
		} catch (error) {
			console.log(error);
			res.status(500).json({ product: null });
		}
	},
	updateProduct: async (req, res) => {
		try {
			const {
				id,
				title,
				description,
				date,
				amount,
				info,
				favourite,
				status,
				label,
				priority,
			} = req.body;
			const [_, token] = req.headers.authorization.split(" ");
			const { id: userId } = decodeToken({ token });

			const product = await sql`
                SELECT id
                FROM "product"
                WHERE id = ${id} AND userId = ${userId}
            `;

			if (product.length === 0) {
				return res.status(200).json({
					message: "Продукт не найден",
				});
			}

			const updateFields = {};
			if (title !== undefined) updateFields.title = title;
			if (description !== undefined)
				updateFields.description = description;
			if (date !== undefined) updateFields.date = date;
			if (amount !== undefined) updateFields.amount = amount;
			if (info !== undefined) updateFields.info = info;
			if (favourite !== undefined) updateFields.favourite = favourite;
			if (status !== undefined) updateFields.status = status;
			if (label !== undefined) updateFields.label = label;
			if (priority !== undefined) updateFields.priority = priority;

			await sql`
                UPDATE "product"
                SET ${sql(updateFields)}, updated_at = NOW()
                WHERE id = ${id}
            `;

			res.json({ message: "Продукт успешно обновлён!" });
		} catch (error) {
			console.log(error);
			res.status(500).json({ error: "Server error" });
		}
	},
};

module.exports = productController;
