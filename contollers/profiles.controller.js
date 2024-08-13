const sql = require("../database");
const bcrypt = require("bcryptjs");
const { generateToken, decodeToken } = require("../utils");
const nodemailer = require("nodemailer");
const { v4 } = require("uuid");

const profilesController = {
	createProfiles: async (req, res) => {
		try {
            const [_, token] = req.headers.authorization.split(" ");
            const { id: user_id } = decodeToken({ token });          
            const { bio, latitude, longitude, occupation, relationship_goal, search_preferences } = req.body;

            const newProfile = await sql`
                INSERT INTO profiles 
                (user_id, bio, latitude, longitude, occupation, relationship_goal, search_preferences)
                VALUES (${user_id}, ${bio}, ${latitude}, ${longitude}, ${occupation}, ${relationship_goal}, ${search_preferences})
                RETURNING *`;

            res.status(201).json(newProfile[0]);
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: "Ошибка создания профиля" });
        }
	},
    editProfiles: async (req, res) => {
        try {
            const [_, token] = req.headers.authorization.split(" ");
            const { id: user_id } = decodeToken({ token });

            const { bio, latitude, longitude, occupation, relationship_goal, search_preferences } = req.body;

            const updatedProfile = await sql`
                UPDATE profiles 
                SET bio = ${bio}, latitude = ${latitude}, longitude = ${longitude}, occupation = ${occupation}, 
                    relationship_goal = ${relationship_goal}, search_preferences = ${search_preferences}, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ${user_id}
                RETURNING *`;

            if (updatedProfile.length === 0) {
                return res.status(404).json({ message: "Профиль не найден" });
            }

            res.status(200).json(updatedProfile[0]);
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: "Ошибка обновления профиля" });
        }
	},
    deliteProfiles: async (req, res) => {
        try {
            const [_, token] = req.headers.authorization.split(" ");
            const { id: user_id } = decodeToken({ token });
            const { id } = req.params;
    

            const deletedProfile = await sql`
                DELETE FROM profiles 
                WHERE id = ${id} AND user_id = ${user_id}
                RETURNING *`;
    
            if (deletedProfile.length === 0) {
                return res.status(404).json({ message: "Профиль не найден или не принадлежит вам" });
            }
    
            res.status(200).json({ message: "Профиль успешно удален" });
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: "Ошибка удаления профиля" });
        }
	},
    getProfiles: async (req, res) => {
		try {
            const [_, token] = req.headers.authorization.split(" ");
            const { id: user_id } = decodeToken({ token });

            const profile = await sql`
                SELECT * FROM profiles 
                WHERE user_id = ${user_id}`;

            if (profile.length === 0) {
                return res.status(404).json({ message: "Профиль не найден" });
            }

            res.status(200).json(profile[0]);
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: "Ошибка получения профиля" });
        }
    },
    getOneProfiles: async (req, res) => {
        try {
            const [_, token] = req.headers.authorization.split(" ");
            const { id: user_id } = decodeToken({ token });
    
            const { id } = req.params;
    
            const profile = await sql`
                SELECT * FROM profiles 
                WHERE id = ${id} AND user_id = ${user_id}`;
    
            if (profile.length === 0) {
                return res.status(404).json({ message: "Профиль не найден или не принадлежит вам" });
            }
    
            res.status(200).json(profile[0]);
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: "Ошибка получения профиля" });
        }
    },
	}

module.exports = profilesController;
