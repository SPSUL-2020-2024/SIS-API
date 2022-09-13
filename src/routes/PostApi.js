const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

var db = require("../db");
const FileController = require("../controller/file.controller");

router.get("/", (req, res) => {
	res.status(204).send("please specifies function");
});

function verifyToken(req, res, next) {
	if (!req.headers.authorization) {
		return res.status(401).send("Unauthorized request");
	}
	let token = req.headers.authorization.split(" ")[1];
	if (token == "null") {
		return res.status(401).send("Unauthorized request");
	}
	jwt.verify(token, "secretKey", function (err, decoded) {
		if (err) {
			console.log(err);
			res.statusMessage = "error";
			return res.status(401).send(err);
		}
		if (decoded) {
			req.userId = decoded.subject;
			next();
		}
	});
}
function deleteDeferFile(deferUuid) {
	sqlDelete = `DELETE FROM files_deferred WHERE defer_uuid=${db.pool.escape(deferUuid)}`;
	db.pool.query(sqlDelete, (err, result) => {
		if (err) {
			console.log("/deleteFilesDeferred error:" + err);
		}
	});
}
router.post("/createPost", verifyToken, async (req, res) => {
	let data = req.body;
	sql = `INSERT INTO posts(title, text, date, user_id, priority, center_id) values (${db.pool.escape(data.TitleInput)},${db.pool.escape(data.TextInput)},NOW(),"1",${db.pool.escape(data.PriorityInput)},${db.pool.escape(data.CenterInput)})`;
	let response = await db.asyncQuery(sql, null);
	let postId = response.insertId;
	if (data.FilesDefer != "null") {
		try {
			let filesDeferJson = JSON.parse(data.FilesDefer);
			for (var attributename in filesDeferJson) {
				sqlSelect = `SELECT * FROM files_deferred WHERE defer_uuid = ${db.pool.escape(filesDeferJson[attributename])}`;
				let sqlResult = null;
				db.pool.query(sqlSelect, (err, result) => {
					if (err) {
						console.log("/getrAllPosts error:" + err);
					}
					sqlResult = JSON.parse(JSON.stringify(result));
					sqlResult = sqlResult[0];

					sqlInsert = `INSERT INTO posts_files_mapping(post_id, file_id) values (${db.pool.escape(postId)},${db.pool.escape(sqlResult["file_id"])})`;
					db.pool.query(sqlInsert, (err, result) => {
						if (err) {
							console.log("/postsFilesMapping error:" + err);
						}
					});
					deleteDeferFile(sqlResult["defer_uuid"]);
				});
			}
		} catch (error) {}
	}
});
router.post("/deletePost", verifyToken, async (req, res) => {
	let data = req.body;
	let response = await db.asyncQuery(`SELECT file_id, files.uuid FROM posts_files_mapping JOIN files ON files.id = posts_files_mapping.file_id WHERE post_id=${db.pool.escape(data.postId)}`, null);
	await db.asyncQuery(`DELETE FROM posts_files_mapping WHERE post_id=${db.pool.escape(data.postId)}`, null);
	response.forEach((element) => {
		FileController.removeFile(element.uuid);
	});
	db.asyncQuery(`DELETE posts FROM posts WHERE id=${db.pool.escape(data.postId)}`, null);
	res.status(200).send({
		success: true,
	});
});
router.get("/getAllPosts", verifyToken, async (req, res) => {
	let response = await db.asyncQuery(`SELECT * FROM posts`, null);
	res.send(response);
});
router.post("/getCenters", async (req, res) => {
	let response = await db.asyncQuery(`SELECT * FROM center`, null);
	const result = Object.values(JSON.parse(JSON.stringify(response)));
	res.send(result);
});
router.post("/getPriorities", async (req, res) => {
	let response = await db.asyncQuery(`SELECT * FROM priority`, null);
	const result = Object.values(JSON.parse(JSON.stringify(response)));
	res.send(result);
});

module.exports = router;
